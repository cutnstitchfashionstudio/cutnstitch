const jwt = require('jsonwebtoken');
const { findRow, deleteRowBy } = require('../sheets');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { account, otp } = req.body;
    if (!account || !otp) return res.status(400).json({ error: 'Missing account or otp' });

    const otpRecord = await findRow('OTP_Tokens', 'Account', account);
    if (!otpRecord) return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });

    if (new Date() > new Date(otpRecord.data.ExpiresAt)) {
      await deleteRowBy('OTP_Tokens', 'Account', account);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (otpRecord.data.OTP !== otp) {
      return res.status(400).json({ error: 'Invalid verification code!' });
    }

    // Delete OTP — it cannot be reused
    await deleteRowBy('OTP_Tokens', 'Account', account);

    // Issue a short-lived reset token
    const token = jwt.sign(
      { account, resetAllowed: true },
      process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod',
      { expiresIn: '15m' }
    );

    res.status(200).json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error: ' + err.message });
  }
};
