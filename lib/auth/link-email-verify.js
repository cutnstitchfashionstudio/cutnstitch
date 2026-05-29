const { getCollection } = require('../db');
const jwt = require('jsonwebtoken');
const { serialize } = require('cookie');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, email, otp } = req.body;

    if (!userId || !email || !otp) {
      return res.status(400).json({ error: 'User ID, Email, and OTP are required' });
    }

    const emailClean = email.trim().toLowerCase();

    // 1. Verify OTP
    const otpsCollection = await getCollection('otps');
    if (!otpsCollection) return res.status(500).json({ error: 'Database configuration missing' });

    const activeRecord = await otpsCollection.findOne({ account: emailClean });
    if (!activeRecord) {
      return res.status(400).json({ error: 'OTP has expired or is invalid. Please request a new code.' });
    }

    if (new Date() > new Date(activeRecord.expiresAt)) {
      await otpsCollection.deleteOne({ _id: activeRecord._id });
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (activeRecord.otp !== otp) {
      return res.status(400).json({ error: 'Invalid verification code!' });
    }

    // Delete OTP after successful use
    await otpsCollection.deleteOne({ _id: activeRecord._id });

    // 2. Load Collections
    const usersCollection = await getCollection('users');
    const pendingCollection = await getCollection('pending');
    if (!usersCollection || !pendingCollection) {
      return res.status(500).json({ error: 'Database configuration missing' });
    }

    // 3. Ensure email is not already used in either collection
    const existingEmail = await usersCollection.findOne({ Email: emailClean }) || await pendingCollection.findOne({ Email: emailClean });
    if (existingEmail) {
      return res.status(400).json({ error: 'This email address is already in use by another account.' });
    }

    // 4. Find the user in the pending collection
    const { ObjectId } = require('mongodb');
    let objId;
    try { objId = new ObjectId(userId); }
    catch {
      objId = userId;
    }

    let pendingUser = await pendingCollection.findOne({ _id: objId }) || await pendingCollection.findOne({ ID: userId });
    if (!pendingUser) {
      // Check users collection just in case they are already verified
      const verifiedUser = await usersCollection.findOne({ _id: objId }) || await usersCollection.findOne({ ID: userId });
      if (verifiedUser) {
        // Already verified! Let's just update the email
        await usersCollection.updateOne(
          { _id: verifiedUser._id },
          { $set: { Email: emailClean } }
        );
        
        // Generate JWT
        const token = jwt.sign(
          { id: verifiedUser.ID, name: verifiedUser.Name, email: emailClean, phone: verifiedUser.Phone },
          process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod',
          { expiresIn: '7d' }
        );

        res.setHeader('Set-Cookie', serialize('auth_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'development',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/'
        }));

        return res.status(200).json({
          success: true,
          message: 'Account verified successfully',
          user: { name: verifiedUser.Name, email: emailClean, phone: verifiedUser.Phone, isVerified: true }
        });
      }
      return res.status(404).json({ error: 'User account not found' });
    }

    // 5. Update user document, set email, set isVerified to true
    const updatedUser = {
      ...pendingUser,
      Email: emailClean,
      isVerified: true
    };
    
    // Clean _id to avoid duplicate key issues on insert
    const verifiedId = pendingUser._id;
    delete updatedUser._id;

    // 6. Delete from pending and insert into users
    await pendingCollection.deleteOne({ _id: verifiedId });
    await usersCollection.insertOne(updatedUser);

    // 7. Generate new JWT token
    const token = jwt.sign(
      { id: updatedUser.ID, name: updatedUser.Name, email: updatedUser.Email, phone: updatedUser.Phone },
      process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod',
      { expiresIn: '7d' }
    );

    res.setHeader('Set-Cookie', serialize('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    }));

    return res.status(200).json({
      success: true,
      message: 'Account verified and email updated successfully!',
      user: { name: updatedUser.Name, email: updatedUser.Email, phone: updatedUser.Phone, isVerified: true }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server Error: ' + err.message });
  }
};
