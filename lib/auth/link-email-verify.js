const jwt    = require('jsonwebtoken');
const { serialize } = require('cookie');
const { findRow, appendRow, deleteRowBy, updateRow } = require('../sheets');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, email, otp } = req.body;
    if (!userId || !email || !otp) {
      return res.status(400).json({ error: 'User ID, Email, and OTP are required' });
    }

    const emailClean = email.trim().toLowerCase();

    // 1. Verify OTP
    const otpRecord = await findRow('OTP_Tokens', 'Account', emailClean);
    if (!otpRecord) return res.status(400).json({ error: 'OTP has expired or is invalid. Please request a new code.' });

    if (new Date() > new Date(otpRecord.data.ExpiresAt)) {
      await deleteRowBy('OTP_Tokens', 'Account', emailClean);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (otpRecord.data.OTP !== otp) {
      return res.status(400).json({ error: 'Invalid verification code!' });
    }

    await deleteRowBy('OTP_Tokens', 'Account', emailClean);

    // 2. Check email is not already in use
    const emailInUsers   = await findRow('Users',   'Email', emailClean);
    const emailInPending = await findRow('Pending',  'Email', emailClean);
    if (emailInUsers || emailInPending) {
      return res.status(400).json({ error: 'This email address is already in use by another account.' });
    }

    // 3. Find the user — check Pending first, then Users
    let pendingResult  = await findRow('Pending', 'ID', userId);
    let verifiedResult = await findRow('Users',   'ID', userId);

    let finalUser = null;

    if (pendingResult) {
      // Move from Pending → Users with email added
      const updatedUser = { ...pendingResult.data, Email: emailClean };
      await deleteRowBy('Pending', 'ID', userId);
      await appendRow('Users', updatedUser);
      finalUser = updatedUser;

    } else if (verifiedResult) {
      // Already in Users — just update Email
      const updatedUser = { ...verifiedResult.data, Email: emailClean };
      await updateRow('Users', verifiedResult.rowIndex, updatedUser);
      finalUser = updatedUser;

    } else {
      return res.status(404).json({ error: 'User account not found' });
    }

    const token = jwt.sign(
      { id: finalUser.ID, name: finalUser.Name, email: finalUser.Email, phone: finalUser.Phone },
      process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod',
      { expiresIn: '7d' }
    );

    res.setHeader('Set-Cookie', serialize('auth_token', token, {
      httpOnly: true, secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/'
    }));

    return res.status(200).json({
      success: true,
      message: 'Account verified and email linked successfully!',
      user: { name: finalUser.Name, email: finalUser.Email, phone: finalUser.Phone, isVerified: true }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server Error: ' + err.message });
  }
};
