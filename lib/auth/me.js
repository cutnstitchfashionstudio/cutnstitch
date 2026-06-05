const jwt  = require('jsonwebtoken');
const { parse } = require('cookie');
const { findRow } = require('../sheets');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const cookies = parse(req.headers.cookie || '');
    const token   = cookies.auth_token;
    if (!token) return res.status(401).json({ authenticated: false });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod');

    // Check verified users first
    let result     = await findRow('Users',   'ID', decoded.id);
    let isVerified = false;
    let phone      = decoded.phone || '';

    if (result) {
      isVerified = true;
      phone      = result.data.Phone || phone;
    } else {
      result = await findRow('Pending', 'ID', decoded.id);
      if (result) {
        isVerified = false;
        phone      = result.data.Phone || phone;
      } else {
        // User was deleted
        return res.status(401).json({ authenticated: false });
      }
    }

    const dbEmail = result ? (result.data.Email || decoded.email || '') : (decoded.email || '');
    res.status(200).json({
      authenticated: true,
      user: { id: decoded.id, name: decoded.name, email: dbEmail, phone, isVerified }
    });
  } catch (err) {
    res.status(401).json({ authenticated: false });
  }
};
