const { getRows, findRow, appendRow, deleteRowBy, generateId } = require('../lib/sheets');

/**
 * GET  /api/admin-users   → list all users (verified + pending) + contact messages
 * POST /api/admin-users   → toggle / delete user / delete message
 *
 * Both require header:  x-admin-secret: <ADMIN_SECRET>
 * POST also requires body: { action, toggleSecret, userId? messageId? }
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── 1. Validate admin secret ─────────────────────────────────────────────
  const incomingSecret = req.headers['x-admin-secret'] || '';
  const ADMIN_SECRET   = process.env.ADMIN_SECRET || 'cutnstitch-admin-key-2026';

  if (!incomingSecret || incomingSecret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin secret key.' });
  }

  // ── 2. GET — list all users + messages ──────────────────────────────────
  if (req.method === 'GET') {
    try {
      const [verified, pending, rawMsgs] = await Promise.all([
        getRows('Users'),
        getRows('Pending'),
        getRows('ContactMessages'),
      ]);

      const mapUser = (u, status) => ({
        id:           u.ID   || '—',
        name:         u.Name  || '—',
        phone:        u.Phone || '—',
        email:        u.Email || '—',
        passwordHash: u.PasswordHash || '—',
        provider:     u.Provider || 'local',
        status,
        createdAt: u.CreatedAt
          ? new Date(u.CreatedAt).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi' })
          : '—',
      });

      const users = [
        ...verified.map(u => mapUser(u, 'verified')),
        ...pending.map(u  => mapUser(u, 'suspended')),
      ];

      const messages = rawMsgs
        .sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt))
        .map(m => ({
          id:        m.ID      || '—',
          name:      m.Name    || '—',
          phone:     m.Phone   || '—',
          email:     m.Email   || '—',
          subject:   m.Subject || '—',
          message:   m.Message || '—',
          createdAt: m.CreatedAt
            ? new Date(m.CreatedAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })
            : '—',
        }));

      return res.status(200).json({ success: true, total: users.length, users, messages });
    } catch (err) {
      console.error('admin-users GET error:', err);
      return res.status(500).json({ error: 'Sheets error: ' + err.message });
    }
  }

  // ── 3. POST — actions ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { userId, messageId, action, toggleSecret } = req.body || {};

    // Second-layer confirmation password
    const TOGGLE_SECRET = process.env.ADMIN_TOGGLE_SECRET || 'cutnstitch-toggle-2026';
    if (!toggleSecret || toggleSecret !== TOGGLE_SECRET) {
      return res.status(403).json({ error: 'Wrong confirmation password. Action was NOT performed.' });
    }

    try {
      // ── toggle: move user between Users ↔ Pending ──────────────────────
      if (action === 'toggle') {
        if (!userId) return res.status(400).json({ error: 'Missing userId.' });

        const inUsers   = await findRow('Users',   'ID', userId);
        const inPending = await findRow('Pending', 'ID', userId);

        if (inUsers) {
          // Verified → Suspend: move to Pending
          const user = inUsers.data;
          await deleteRowBy('Users', 'ID', userId);
          await appendRow('Pending', user);
          return res.status(200).json({
            success: true,
            message: `${user.Name || 'User'} has been suspended.`,
            newStatus: 'suspended',
          });
        }

        if (inPending) {
          // Pending → Verify: move to Users
          const user = inPending.data;
          await deleteRowBy('Pending', 'ID', userId);
          await appendRow('Users', user);
          return res.status(200).json({
            success: true,
            message: `${user.Name || 'User'} verified successfully!`,
            newStatus: 'verified',
          });
        }

        return res.status(404).json({ error: 'User not found.' });
      }

      // ── delete user: remove from both tabs ─────────────────────────────
      if (action === 'delete') {
        if (!userId) return res.status(400).json({ error: 'Missing userId.' });

        const deletedU = await deleteRowBy('Users',   'ID', userId);
        const deletedP = await deleteRowBy('Pending', 'ID', userId);

        if (deletedU || deletedP) {
          return res.status(200).json({
            success: true,
            message: 'Customer account has been permanently deleted.',
          });
        }
        return res.status(404).json({ error: 'User not found.' });
      }

      // ── deleteMessage: remove from ContactMessages ──────────────────────
      if (action === 'deleteMessage') {
        if (!messageId) return res.status(400).json({ error: 'Missing messageId.' });

        const deleted = await deleteRowBy('ContactMessages', 'ID', messageId);
        if (deleted) {
          return res.status(200).json({
            success: true,
            message: 'Client message has been permanently deleted.',
          });
        }
        return res.status(404).json({ error: 'Message not found.' });
      }

      return res.status(400).json({ error: 'Invalid action.' });
    } catch (err) {
      console.error('admin-users POST error:', err);
      return res.status(500).json({ error: 'Sheets error: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
};
