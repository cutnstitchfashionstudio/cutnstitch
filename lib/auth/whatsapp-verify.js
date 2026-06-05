const jwt    = require('jsonwebtoken');
const { serialize } = require('cookie');
const { findRow, appendRow, deleteRowBy, updateRow, generateId } = require('../sheets');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { phone, code, isFirebase } = req.body;
    if (!phone) return res.status(400).json({ error: 'Missing phone' });
    if (!isFirebase && !code) return res.status(400).json({ error: 'Missing verification code' });

    let userRow    = null;
    let isNewUser  = false;

    // Check verified Users tab
    const existsVerified = await findRow('Users', 'Phone', phone);

    if (existsVerified) {
      userRow = existsVerified.data;
    } else {
      // Check Pending tab — move to Users if found
      const pendingResult = await findRow('Pending', 'Phone', phone);
      if (pendingResult) {
        // Move from Pending → Users (verified)
        const pendingUser = { ...pendingResult.data };
        await deleteRowBy('Pending', 'ID', pendingUser.ID);
        await appendRow('Users', pendingUser);
        userRow = pendingUser;
      } else {
        // Brand-new user — create and put directly in Users (WhatsApp = verified)
        userRow = {
          ID:           generateId(),
          CreatedAt:    new Date().toISOString(),
          Name:         'User ' + phone.substring(phone.length - 4),
          Email:        '',
          Phone:        phone,
          PasswordHash: '',
          Provider:     'whatsapp',
        };
        await appendRow('Users', userRow);
        isNewUser = true;
      }
    }

    const jwtToken = jwt.sign(
      { id: userRow.ID, name: userRow.Name, email: userRow.Email, phone: userRow.Phone },
      process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod',
      { expiresIn: '7d' }
    );

    res.setHeader('Set-Cookie', serialize('auth_token', jwtToken, {
      httpOnly: true, secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/'
    }));

    res.status(200).json({
      success: true,
      user: { name: userRow.Name, email: userRow.Email, phone: userRow.Phone, isVerified: true }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database Error: ' + err.message });
  }
};
