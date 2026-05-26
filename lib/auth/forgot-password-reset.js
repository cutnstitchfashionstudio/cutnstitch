const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { serialize } = require('cookie');
const { getCollection } = require('../db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Missing token or password' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod');
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired reset token.' });
    }

    if (!decoded.resetAllowed) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const account = decoded.account;
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const usersCollection = await getCollection('users');
    const pendingCollection = await getCollection('pending');
    if (!usersCollection || !pendingCollection) return res.status(500).json({ error: 'Database configuration missing' });

    // Look for user by email or phone (account can be either)
    let userRow = await usersCollection.findOne({ 
      $or: [{ Email: account }, { Phone: account }] 
    });
    
    let isPending = false;
    if (!userRow) {
      userRow = await pendingCollection.findOne({ 
        $or: [{ Email: account }, { Phone: account }] 
      });
      if (userRow) {
        isPending = true;
      }
    }
    
    if (!userRow) {
      // For this demo, if the user doesn't exist, we just simulate success.
      // In a real application, you'd fail here. We'll create a mock user for the session.
      userRow = {
        ID: Date.now().toString(),
        Name: account.split('@')[0],
        Email: account.includes('@') ? account : '',
        Phone: account.includes('@') ? '' : account
      };
    } else {
      // Update the user's password in the DB
      const targetCollection = isPending ? pendingCollection : usersCollection;
      await targetCollection.updateOne(
        { ID: userRow.ID },
        { $set: { PasswordHash: passwordHash } }
      );
    }
    
    // Generate new JWT for logged-in session
    const sessionToken = jwt.sign(
      { id: userRow.ID, name: userRow.Name, email: userRow.Email, phone: userRow.Phone },
      process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod',
      { expiresIn: '7d' }
    );

    // Set secure HTTP-Only cookie
    res.setHeader('Set-Cookie', serialize('auth_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
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
