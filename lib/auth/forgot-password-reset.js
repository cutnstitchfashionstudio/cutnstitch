const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const { serialize } = require('cookie');
const { findRowOr, updateRow, generateId } = require('../sheets');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Missing token or password' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod');
    } catch {
      return res.status(401).json({ error: 'Invalid or expired reset token.' });
    }

    if (!decoded.resetAllowed) return res.status(401).json({ error: 'Unauthorized.' });

    const account      = decoded.account;
    const salt         = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Find in Users tab first, then Pending
    let result     = await findRowOr('Users',   [{ field: 'Email', value: account }, { field: 'Phone', value: account }]);
    let isPending  = false;
    let userRow    = null;

    if (result) {
      userRow = result.data;
    } else {
      result = await findRowOr('Pending', [{ field: 'Email', value: account }, { field: 'Phone', value: account }]);
      if (result) { userRow = result.data; isPending = true; }
    }

    if (!userRow) {
      // Simulate a user for the session even if not found (edge case safety)
      userRow = {
        ID:    generateId(),
        Name:  account.split('@')[0],
        Email: account.includes('@') ? account : '',
        Phone: account.includes('@') ? '' : account,
      };
    } else {
      // Write new password back into the sheet
      const updated = { ...userRow, PasswordHash: passwordHash };
      await updateRow(isPending ? 'Pending' : 'Users', result.rowIndex, updated);
    }

    const sessionToken = jwt.sign(
      { id: userRow.ID, name: userRow.Name, email: userRow.Email, phone: userRow.Phone },
      process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod',
      { expiresIn: '7d' }
    );

    res.setHeader('Set-Cookie', serialize('auth_token', sessionToken, {
      httpOnly: true, secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/'
    }));

    res.status(200).json({
      success: true,
      user: { name: userRow.Name, email: userRow.Email, phone: userRow.Phone, isVerified: !isPending }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error: ' + err.message });
  }
};
