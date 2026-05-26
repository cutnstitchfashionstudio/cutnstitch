const jwt = require('jsonwebtoken');
const { getCollection } = require('../db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { account, otp } = req.body;
    
    if (!account || !otp) {
      return res.status(400).json({ error: 'Missing account or otp' });
    }

    const otpsCollection = await getCollection('otps');
    if (!otpsCollection) return res.status(500).json({ error: 'Database configuration missing' });

    // Find the active OTP record for the account
    const activeRecord = await otpsCollection.findOne({ account: account });

    if (!activeRecord) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Check expiration
    if (new Date() > new Date(activeRecord.expiresAt)) {
      await otpsCollection.deleteOne({ _id: activeRecord._id });
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Check match
    if (activeRecord.otp !== otp) {
      return res.status(400).json({ error: 'Invalid verification code!' });
    }

    // OTP is valid! Delete it so it cannot be reused.
    await otpsCollection.deleteOne({ _id: activeRecord._id });
    
    // Generate a temporary reset token valid for 15 minutes
    const token = jwt.sign(
      { account, resetAllowed: true },
      process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod',
      { expiresIn: '15m' }
    );
    
    res.status(200).json({ 
      success: true, 
      token 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error: ' + err.message });
  }
};
