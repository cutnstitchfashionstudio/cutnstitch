const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const { findRow, appendRow, deleteRowBy, generateId } = require('../sheets');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });

    const isEmail = email.includes('@');
    if (!isEmail) return res.status(400).json({ error: 'Endpoint is for email only' });

    // Check if email already registered
    const existsU = await findRow('Users',   'Email', email);
    const existsP = await findRow('Pending', 'Email', email);
    if (existsU || existsP) {
      return res.status(400).json({ error: 'ALREADY_EXISTS', message: 'This email is already registered.' });
    }

    // DNS MX validation
    const domain = email.split('@')[1];
    try {
      const mx = await dns.resolveMx(domain);
      if (!mx || mx.length === 0) return res.status(400).json({ error: 'Invalid or non-functional email domain' });
    } catch {
      return res.status(400).json({ error: 'Invalid or non-functional email domain' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any old OTP for this account
    await deleteRowBy('OTP_Tokens', 'Account', email);

    // Store new OTP
    await appendRow('OTP_Tokens', {
      Token:     '',
      Account:   email,
      OTP:       otp,
      ExpiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
      Purpose:   'signup',
    });

    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
      });
      await transporter.sendMail({
        from:    `"Cut & Stitch Fashion Studio" <${process.env.GMAIL_USER}>`,
        to:      email,
        subject: 'Verify Your Account - Cut & Stitch Fashion Studio',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:5px;">
            <h2 style="color:#C9A84C;text-align:center;">Cut &amp; Stitch Fashion Studio</h2>
            <p>Thank you for signing up! Use the code below to complete your registration:</p>
            <div style="text-align:center;margin:30px 0;">
              <span style="font-size:32px;font-weight:bold;letter-spacing:5px;color:#333;background:#f4f4f4;padding:15px 30px;border-radius:4px;">${otp}</span>
            </div>
            <p style="color:#666;font-size:14px;">This code expires in 10 minutes.</p>
          </div>
        `
      });
    } else {
      console.warn('[signup-otp-send] Email not configured. OTP:', otp);
    }

    res.status(200).json({ success: true, message: 'Verification OTP sent to email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error: ' + err.message });
  }
};
