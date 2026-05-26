const nodemailer = require('nodemailer');
const { getCollection } = require('../db');
const dns = require('dns').promises;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    let { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Missing email or phone number' });
    }

    email = email.trim();
    const isEmail = email.includes('@');
    if (isEmail) {
      email = email.toLowerCase();
    } else {
      let num = email.replace(/[^0-9]/g, '');
      if (num.startsWith('03') && num.length === 11) {
        email = '+92' + num.substring(1);
      } else if (num.startsWith('3') && num.length === 10) {
        email = '+92' + num;
      } else {
        email = '+' + num;
      }
    }

    const usersCollection = await getCollection('users');
    const pendingCollection = await getCollection('pending');

    if (!usersCollection || !pendingCollection) {
      return res.status(500).json({ error: 'Database configuration missing' });
    }

    // Check if user exists in database
    let userRow = null;
    if (isEmail) {
      userRow = await usersCollection.findOne({ Email: email });
      if (!userRow) {
        userRow = await pendingCollection.findOne({ Email: email });
      }
    } else {
      userRow = await usersCollection.findOne({ Phone: email });
      if (!userRow) {
        userRow = await pendingCollection.findOne({ Phone: email });
      }
    }

    if (!userRow) {
      return res.status(404).json({ 
        error: 'ACCOUNT_NOT_FOUND', 
        message: 'This email or phone number is not registered yet.' 
      });
    }

    if (!isEmail) {
      // It's a phone number and it exists. Ensure a record exists in the pending collection
      let existsInUsers = await usersCollection.findOne({ Phone: email });
      if (existsInUsers) {
        // Move from verified 'users' collection back to unverified 'pending' collection
        await pendingCollection.deleteOne({ Phone: email }); // Avoid duplicates
        const pendingUser = { ...existsInUsers, isVerified: false };
        delete pendingUser.Address;
        delete pendingUser.Measurements;
        await pendingCollection.insertOne(pendingUser);
        await usersCollection.deleteOne({ _id: existsInUsers._id });
      }

      // Return specific response instructing frontend to use WhatsApp
      return res.status(200).json({ 
        success: true, 
        method: 'whatsapp',
        message: 'For security reasons, phone number accounts must be reset manually via WhatsApp.',
        phone: email
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

    // Remove any existing OTPs for this account to prevent spam/confusion
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
      subject: 'Your Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #f57224; text-align: center;">Nazia Stitching Studio</h2>
          <p>Hello,</p>
          <p>You recently requested to reset your password. Please use the following 6-digit Verification Code to proceed:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; background: #f4f4f4; padding: 15px 30px; border-radius: 4px;">
              ${otp}
            </span>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes. If you did not request a password reset, please ignore this email.</p>
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
      method: 'email',
      message: 'If an account exists, a reset link/code has been sent.' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error: ' + err.message });
  }
};
