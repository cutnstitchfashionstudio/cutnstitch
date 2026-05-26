const { getCollection } = require('../../db');
const jwt = require('jsonwebtoken');
const { serialize } = require('cookie');

module.exports = async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`}/api/auth/facebook/callback`;

  if (!code) return res.status(400).send('No code provided');

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`);
    
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('Failed to get access token');

    // 2. Fetch user profile
    const profileRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,gender&access_token=${tokenData.access_token}`);
    const profile = await profileRes.json();

    // 3. Connect to DB and find/create user
    const collection = await getCollection('users');
    if (!collection) throw new Error('Database not configured');

    let user = null;
    if (profile.email) {
      user = await collection.findOne({ Email: profile.email });
    }
    
    if (!user) {
      // Create new user for Facebook login
      user = {
        ID: profile.id,
        CreatedAt: new Date().toISOString(),
        Name: profile.name,
        Email: profile.email || `${profile.id}@facebook.com`,
        Provider: 'facebook',
        Gender: profile.gender || ''
      };
      await collection.insertOne(user);
    } else {
      // Update existing user with new Facebook fields if they are missing
      const updateDoc = {};
      if (profile.gender && !user.Gender) updateDoc.Gender = profile.gender;
      
      if (Object.keys(updateDoc).length > 0) {
        await collection.updateOne({ _id: user._id }, { $set: updateDoc });
      }
    }

    // 4. Generate JWT
    const token = jwt.sign(
      { id: user.ID, name: user.Name, email: user.Email },
      process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod',
      { expiresIn: '7d' }
    );

    res.writeHead(302, {
      'Set-Cookie': serialize('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      }),
      'Location': '/?login=success'
    });
    res.end();

  } catch (err) {
    console.error('Facebook OAuth Error:', err);
    res.status(500).send(`<h2>OAuth Error</h2><pre>${err.message}</pre><p>Please take a screenshot of this error.</p>`);
  }
};
