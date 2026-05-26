const jwt = require('jsonwebtoken');
const { parse } = require('cookie');
const { getCollection } = require('../db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;

    if (!token) return res.status(401).json({ authenticated: false });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod');
    
    // Fetch latest user info from DB to get the current isVerified status
    const usersCollection = await getCollection('users');
    const pendingCollection = await getCollection('pending');
    let isVerified = false;
    let phone = decoded.phone || '';
    
    if (usersCollection && pendingCollection) {
      let user = await usersCollection.findOne({ ID: decoded.id });
      if (user) {
        isVerified = true;
        phone = user.Phone || phone;
      } else {
        user = await pendingCollection.findOne({ ID: decoded.id });
        if (user) {
          isVerified = false;
          phone = user.Phone || phone;
        } else {
          // User not found in either collection (might have been deleted)
          return res.status(401).json({ authenticated: false });
        }
      }
    }
    
    res.status(200).json({ 
      authenticated: true, 
      user: { name: decoded.name, email: decoded.email, phone: phone, isVerified: isVerified }
    });
  } catch (err) {
    res.status(401).json({ authenticated: false });
  }
};
