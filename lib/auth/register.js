const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { serialize } = require('cookie');
const { findRow, findRowOr, appendRow, deleteRowBy, generateId } = require('../sheets');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let { name, email, phone, password, otp } = req.body;

    if (!name || (!email && !phone) || !password) {
      return res.status(400).json({ error: 'Name, Password, and either Email or Phone are required' });
    }

    if (email) email = email.trim().toLowerCase();
    if (phone) {
      let num = phone.replace(/[^0-9]/g, '');
      if (num.startsWith('03') && num.length === 11) phone = '+92' + num.substring(1);
      else if (num.startsWith('3') && num.length === 10) phone = '+92' + num;
      else phone = '+' + num;
    }

    // Check for duplicate email
    if (email) {
      const existsU = await findRow('Users',   'Email', email);
      const existsP = await findRow('Pending', 'Email', email);
      if (existsU || existsP) return res.status(400).json({ error: 'ALREADY_EXISTS' });
    }

    // Check for duplicate phone
    if (phone) {
      const existsU = await findRow('Users',   'Phone', phone);
      const existsP = await findRow('Pending', 'Phone', phone);
      if (existsU || existsP) return res.status(400).json({ error: 'ALREADY_EXISTS' });
    }

    // Email registration requires OTP verification
    if (email) {
      if (!otp) return res.status(400).json({ error: 'OTP is required for email registration.' });

      const otpRecord = await findRow('OTP_Tokens', 'Account', email);
      if (!otpRecord) return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });

      if (new Date() > new Date(otpRecord.data.ExpiresAt)) {
        await deleteRowBy('OTP_Tokens', 'Account', email);
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      }

      if (otpRecord.data.OTP !== otp) {
        return res.status(400).json({ error: 'Invalid verification code!' });
      }

      // Delete used OTP
      await deleteRowBy('OTP_Tokens', 'Account', email);
    }

    const salt         = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const isVerified   = !!email; // email = verified immediately, phone = needs WhatsApp verification

    const newUser = {
      ID:           generateId(),
      CreatedAt:    new Date().toISOString(),
      Name:         name,
      Email:        email || '',
      Phone:        phone || '',
      PasswordHash: passwordHash,
      Provider:     'local',
    };

    // Verified users go to Users tab; phone-only users go to Pending
    await appendRow(isVerified ? 'Users' : 'Pending', newUser);

    const token = jwt.sign(
      { id: newUser.ID, name: newUser.Name, email: newUser.Email, phone: newUser.Phone },
      process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod',
      { expiresIn: '7d' }
    );

    res.setHeader('Set-Cookie', serialize('auth_token', token, {
      httpOnly: true, secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/'
    }));

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: { id: newUser.ID, name: newUser.Name, email: newUser.Email, phone: newUser.Phone, isVerified }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database Error: ' + err.message });
  }
};
