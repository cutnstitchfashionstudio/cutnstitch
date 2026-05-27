const { getCollection } = require('../lib/db');

/**
 * GET  /api/admin-users   → list all users (verified + pending)
 * POST /api/admin-users   → toggle a user's verified status
 *
 * Both require header:  x-admin-secret: <ADMIN_SECRET>
 * POST also requires body: { userId, action:'toggle', toggleSecret }
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── 1. Validate admin secret ───────────────────────────────────────────
  const incomingSecret = req.headers['x-admin-secret'] || '';
  const ADMIN_SECRET   = process.env.ADMIN_SECRET || 'cutnstitch-admin-key-2026';

  if (!incomingSecret || incomingSecret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin secret key.' });
  }

  // ── 2. GET — list all users ────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const usersCol   = await getCollection('users');
      const pendingCol = await getCollection('pending');

      if (!usersCol || !pendingCol) {
        return res.status(500).json({ error: 'Database not configured. Check MONGODB_URI in Vercel.' });
      }

      const verified = await usersCol.find({}).toArray();
      const pending  = await pendingCol.find({}).toArray();

      const mapUser = (u, status) => ({
        id:         (u._id || '').toString(),
        name:       u.Name  || u.name  || '—',
        phone:      u.Phone || u.phone || '—',
        email:      u.Email || u.email || '—',
        password:   u.Password || u.password || '—',
        status,
        createdAt:  u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-PK') : '—',
      });

      const users = [
        ...verified.map(u => mapUser(u, 'verified')),
        ...pending.map(u  => mapUser(u, 'pending')),
      ];

      // Fetch contact messages from MongoDB, sorted newest first
      const messagesCol = await getCollection('contact_messages');
      let messages = [];
      if (messagesCol) {
        const rawMsgs = await messagesCol.find({}).sort({ CreatedAt: -1 }).toArray();
        messages = rawMsgs.map(m => ({
          id: (m._id || '').toString(),
          name: m.Name || '—',
          phone: m.Phone || '—',
          email: m.Email || '—',
          subject: m.Subject || '—',
          message: m.Message || '—',
          createdAt: m.CreatedAt ? new Date(m.CreatedAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }) : '—'
        }));
      }

      return res.status(200).json({ success: true, total: users.length, users, messages });
    } catch (err) {
      console.error('admin-users GET error:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
  }

  // ── 3. POST — toggle user status ──────────────────────────────────────
  if (req.method === 'POST') {
    const { userId, action, toggleSecret } = req.body || {};

    // Second-layer confirmation password
    const TOGGLE_SECRET = process.env.ADMIN_TOGGLE_SECRET || 'cutnstitch-toggle-2026';
    if (!toggleSecret || toggleSecret !== TOGGLE_SECRET) {
      return res.status(403).json({ error: 'Wrong confirmation password. Status was NOT changed.' });
    }

    if (action !== 'toggle' || !userId) {
      return res.status(400).json({ error: 'Invalid request. Required: userId + action=toggle.' });
    }

    try {
      const { ObjectId } = require('mongodb');
      const usersCol   = await getCollection('users');
      const pendingCol = await getCollection('pending');

      if (!usersCol || !pendingCol) {
        return res.status(500).json({ error: 'Database not configured.' });
      }

      let objId;
      try { objId = new ObjectId(userId); }
      catch { return res.status(400).json({ error: 'Invalid user ID format.' }); }

      // Check verified users first
      const verifiedUser = await usersCol.findOne({ _id: objId });
      if (verifiedUser) {
        await usersCol.deleteOne({ _id: objId });
        const { _id, ...rest } = verifiedUser;
        await pendingCol.insertOne({ ...rest, isVerified: false });
        return res.status(200).json({
          success:   true,
          message:   `${verifiedUser.Name || verifiedUser.name || 'User'} moved to Pending.`,
          newStatus: 'pending',
        });
      }

      // Check pending users
      const pendingUser = await pendingCol.findOne({ _id: objId });
      if (pendingUser) {
        await pendingCol.deleteOne({ _id: objId });
        const { _id, ...rest } = pendingUser;
        await usersCol.insertOne({ ...rest, isVerified: true });
        return res.status(200).json({
          success:   true,
          message:   `${pendingUser.Name || pendingUser.name || 'User'} verified successfully!`,
          newStatus: 'verified',
        });
      }

      return res.status(404).json({ error: 'User not found in any collection.' });
    } catch (err) {
      console.error('admin-users POST error:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
};
