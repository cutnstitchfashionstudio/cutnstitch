const nodemailer = require('nodemailer');
const { getCollection } = require('../db');
const dns = require('dns').promises;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    const isEmail = email.includes('@');
    if (!isEmail) {
      return res.status(400).json({ error: 'Endpoint is for email only' });
    }

    const collection = await getCollection('users');
    if (!collection) return res.status(500).json({ error: 'Database configuration missing' });

    // Check if email already registered
    const existingEmail = await collection.findOne({ Email: email });
    if (existingEmail) {
      return res.status(400).json({ 
        error: 'ALREADY_EXISTS', 
        message: 'This email is already registered.' 
      });
    }

    // Advanced Email Validation via DNS MX Lookup
    const domain = email.split('@')[1];
    try {
      const mxRecords = await dns.resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        return res.status(400).json({ error: 'Invalid or non-functional email domain' });
      }
    } catch (dnsErr) {
      return res.status(400).json({ error: 'Invalid or non-functional email domain' });
    }

    // Generate a secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in MongoDB
    const otpsCollection = await getCollection('otps');
    if (!otpsCollection) return res.status(500).json({ error: 'Database configuration missing' });

    // Remove any existing OTPs for this account
    await otpsCollection.deleteMany({ account: email });

    // Insert new OTP valid for 10 minutes
    await otpsCollection.insertOne({
      account: email,
      otp: otp,
      expiresAt: new Date(Date.now() + 10 * 60000) // 10 minutes from now
    });

    // Send real email via Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const mailOptions = {
      from: `"Nazia Stitching Studio" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Account - Nazia Stitching Studio',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #f57224; text-align: center;">Nazia Stitching Studio</h2>
          <p>Hello,</p>
          <p>Thank you for signing up! Please use the following 6-digit Verification Code to complete your registration:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; background: #f4f4f4; padding: 15px 30px; border-radius: 4px;">
              ${otp}
            </span>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
        </div>
      `
    };

    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      await transporter.sendMail(mailOptions);
    } else {
      console.warn("GMAIL_USER or GMAIL_APP_PASSWORD not configured! OTP generated but email not sent. OTP is: " + otp);
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Verification OTP sent to email.' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error: ' + err.message });
  }
};
