const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { serialize } = require('cookie');
const { getCollection } = require('../db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    let { email, password } = req.body;
    // The "email" field might contain either an email address or a phone number.
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

    email = email.trim();
    if (email.includes('@')) {
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
    if (!usersCollection || !pendingCollection) return res.status(500).json({ error: 'Database configuration missing' });

    let userRow = await usersCollection.findOne({
      $or: [
        { Email: email },
        { Phone: email }
      ]
    });
    
    let isVerified = true;
    if (!userRow) {
      userRow = await pendingCollection.findOne({
        $or: [
          { Email: email },
          { Phone: email }
        ]
      });
      if (userRow) {
        isVerified = false;
      }
    }
    
    if (!userRow) return res.status(401).json({ error: 'NOT_FOUND' });

    const isMatch = await bcrypt.compare(password, userRow.PasswordHash);
    if (!isMatch) return res.status(401).json({ error: 'WRONG_PASSWORD' });

    // Generate JWT
    const token = jwt.sign(
      { id: userRow.ID, name: userRow.Name, email: userRow.Email, phone: userRow.Phone },
      process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod',
      { expiresIn: '7d' }
    );

    // Set secure HTTP-Only cookie
    res.setHeader('Set-Cookie', serialize('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    }));

    // Use the verified status determined from the collection lookup
    const responseVerified = isVerified;

    res.status(200).json({ 
      success: true, 
      user: { name: userRow.Name, email: userRow.Email, phone: userRow.Phone, isVerified: responseVerified }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database Error: ' + err.message });
  }
};
