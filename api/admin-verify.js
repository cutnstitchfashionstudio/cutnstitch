const { getCollection } = require('../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { phone, secret } = req.body;
    
    // In a real app, use an environment variable for ADMIN_SECRET
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'naziastudio-admin-key-2026';
    
    if (secret !== ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const usersCollection = await getCollection('users');
    const pendingCollection = await getCollection('pending');
    if (!usersCollection || !pendingCollection) return res.status(500).json({ error: 'Database configuration missing' });

    // Try finding by exact match or formatted phone
    let searchVal = phone.trim();
    let formattedPhone = searchVal;
    if (!searchVal.includes('@') && !searchVal.startsWith('+')) {
      formattedPhone = '+' + searchVal;
    }

    const userRow = await pendingCollection.findOne({
      $or: [
        { Phone: searchVal },
        { Phone: formattedPhone },
        { Email: searchVal }
      ]
    });

    if (!userRow) {
      const alreadyVerified = await usersCollection.findOne({
        $or: [
          { Phone: searchVal },
          { Phone: formattedPhone },
          { Email: searchVal }
        ]
      });
      if (alreadyVerified) {
        return res.status(200).json({ success: true, message: `User is already verified.` });
      }
      return res.status(404).json({ error: 'User not found in pending verifications.' });
    }

    // Move to users collection and set isVerified: true
    await pendingCollection.deleteOne({ _id: userRow._id });
    const verifiedUser = { ...userRow, isVerified: true };
    await usersCollection.insertOne(verifiedUser);

    res.status(200).json({ success: true, message: `User ${searchVal} successfully verified.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database Error: ' + err.message });
  }
};
