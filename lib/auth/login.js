const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { serialize } = require('cookie');
const { findRow, findRowOr } = require('../sheets');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

    email = email.trim();
    if (email.includes('@')) {
      email = email.toLowerCase();
    } else {
      let num = email.replace(/[^0-9]/g, '');
      if (num.startsWith('03') && num.length === 11) email = '+92' + num.substring(1);
      else if (num.startsWith('3') && num.length === 10) email = '+92' + num;
      else email = '+' + num;
    }

    // Search verified users first
    let result = await findRowOr('Users', [{ field: 'Email', value: email }, { field: 'Phone', value: email }]);
    let isVerified = true;

    if (!result) {
      result = await findRowOr('Pending', [{ field: 'Email', value: email }, { field: 'Phone', value: email }]);
      if (result) isVerified = false;
    }

    if (!result) return res.status(401).json({ error: 'NOT_FOUND' });

    const userRow = result.data;

    if (!userRow.PasswordHash) {
      const provider = userRow.Provider || 'google';
      return res.status(401).json({ error: 'OAUTH_ACCOUNT', provider,
        message: `This account was created with ${provider}. Please sign in with ${provider} instead.` });
    }

    const isMatch = await bcrypt.compare(password, userRow.PasswordHash);
    if (!isMatch) return res.status(401).json({ error: 'WRONG_PASSWORD' });

    const token = jwt.sign(
      { id: userRow.ID, name: userRow.Name, email: userRow.Email, phone: userRow.Phone },
      process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod',
      { expiresIn: '7d' }
    );

    res.setHeader('Set-Cookie', serialize('auth_token', token, {
      httpOnly: true, secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/'
    }));

    res.status(200).json({
      success: true,
      user: { name: userRow.Name, email: userRow.Email, phone: userRow.Phone, isVerified }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database Error: ' + err.message });
  }
};
