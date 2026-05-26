const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { serialize } = require('cookie');
const { getCollection } = require('../db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    let { name, email, phone, password, otp } = req.body;
    
    if (!name || (!email && !phone) || !password) {
      return res.status(400).json({ error: 'Name, Password, and either Email or Phone are required' });
    }

    if (email) {
      email = email.trim().toLowerCase();
    }
    if (phone) {
      let num = phone.replace(/[^0-9]/g, '');
      if (num.startsWith('03') && num.length === 11) {
        phone = '+92' + num.substring(1);
      } else if (num.startsWith('3') && num.length === 10) {
        phone = '+92' + num;
      } else {
        phone = '+' + num;
      }
    }

    const usersCollection = await getCollection('users');
    const pendingCollection = await getCollection('pending');
    if (!usersCollection || !pendingCollection) return res.status(500).json({ error: 'Database configuration missing' });

    // Check if user exists in either verified or pending collections
    if (email) {
      const existingEmail = await usersCollection.findOne({ Email: email }) || await pendingCollection.findOne({ Email: email });
      if (existingEmail) return res.status(400).json({ error: 'ALREADY_EXISTS' });
    }
    
    if (phone) {
      const existingPhone = await usersCollection.findOne({ Phone: phone }) || await pendingCollection.findOne({ Phone: phone });
      if (existingPhone) return res.status(400).json({ error: 'ALREADY_EXISTS' });
    }

    // If Email Registration, an OTP MUST be provided and verified
    if (email) {
      if (!otp) {
        return res.status(400).json({ error: 'OTP is required for email registration.' });
      }

      const otpsCollection = await getCollection('otps');
      const activeRecord = await otpsCollection.findOne({ account: email });

      if (!activeRecord) {
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      }

      if (new Date() > new Date(activeRecord.expiresAt)) {
        await otpsCollection.deleteOne({ _id: activeRecord._id });
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      }

      if (activeRecord.otp !== otp) {
        return res.status(400).json({ error: 'Invalid verification code!' });
      }

      // Valid OTP. Delete it so it cannot be reused.
      await otpsCollection.deleteOne({ _id: activeRecord._id });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user with isVerified conditional on signup type (email is verified on OTP completion, phone requires WhatsApp manual verification)
    const isVerified = email ? true : false;
    const newUser = {
      ID: Date.now().toString(),
      CreatedAt: new Date().toISOString(),
      Name: name,
      Email: email || '',
      Phone: phone || '',
      PasswordHash: passwordHash,
      isVerified: isVerified
    };

    const targetCollection = email ? usersCollection : pendingCollection;
    await targetCollection.insertOne(newUser);

    // Automatically log the user in
    const token = jwt.sign(
      { id: newUser.ID, name: newUser.Name, email: newUser.Email, phone: newUser.Phone },
      process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod',
      { expiresIn: '7d' }
    );

    res.setHeader('Set-Cookie', serialize('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    }));

    res.status(201).json({ 
      success: true, 
      message: 'Registration successful',
      user: { name: newUser.Name, email: newUser.Email, phone: newUser.Phone, isVerified: newUser.isVerified }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database Error: ' + err.message });
  }
};
