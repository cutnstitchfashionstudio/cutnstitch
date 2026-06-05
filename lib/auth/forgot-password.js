const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const { findRow, findRowOr, appendRow, deleteRowBy } = require('../sheets');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email or phone number' });

    email = email.trim();
    const isEmail = email.includes('@');
    if (isEmail) {
      email = email.toLowerCase();
    } else {
      let num = email.replace(/[^0-9]/g, '');
      if (num.startsWith('03') && num.length === 11) email = '+92' + num.substring(1);
      else if (num.startsWith('3') && num.length === 10) email = '+92' + num;
      else email = '+' + num;
    }

    // Check if account exists
    let userResult = null;
    if (isEmail) {
      userResult = await findRow('Users', 'Email', email) || await findRow('Pending', 'Email', email);
    } else {
      userResult = await findRow('Users', 'Phone', email) || await findRow('Pending', 'Phone', email);
    }

    if (!userResult) {
      return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND', message: 'This email or phone number is not registered yet.' });
    }

    // Phone number reset: respond with WhatsApp instruction
    if (!isEmail) {
      return res.status(200).json({
        success: true, method: 'whatsapp',
        message: 'For security reasons, phone number accounts must be reset manually via WhatsApp.',
        phone: email
      });
    }

    // Email: DNS MX validation
    const domain = email.split('@')[1];
    try {
      const mx = await dns.resolveMx(domain);
      if (!mx || mx.length === 0) return res.status(400).json({ error: 'Invalid or non-functional email domain' });
    } catch {
      return res.status(400).json({ error: 'Invalid or non-functional email domain' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any old OTP for this account, then insert fresh one
    await deleteRowBy('OTP_Tokens', 'Account', email);
    await appendRow('OTP_Tokens', {
      Token:     '',
      Account:   email,
      OTP:       otp,
      ExpiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
      Purpose:   'forgot-password',
    });

    // Send OTP email
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
      });
      await transporter.sendMail({
        from:    `"Cut & Stitch Fashion Studio" <${process.env.GMAIL_USER}>`,
        to:      email,
        subject: 'Your Password Reset OTP',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:5px;">
            <h2 style="color:#C9A84C;text-align:center;">Cut &amp; Stitch Fashion Studio</h2>
            <p>You recently requested to reset your password. Use the code below:</p>
            <div style="text-align:center;margin:30px 0;">
              <span style="font-size:32px;font-weight:bold;letter-spacing:5px;color:#333;background:#f4f4f4;padding:15px 30px;border-radius:4px;">${otp}</span>
            </div>
            <p style="color:#666;font-size:14px;">This code expires in 10 minutes. If you did not request this, ignore the email.</p>
          </div>
        `
      });
    } else {
      console.warn('[forgot-password] Email not configured. OTP:', otp);
    }

    res.status(200).json({ success: true, method: 'email', message: 'If an account exists, a reset code has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error: ' + err.message });
  }
};
