const { getCollection } = require('../../db');
const jwt = require('jsonwebtoken');
const { serialize } = require('cookie');

module.exports = async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`}/api/auth/google/callback`;

  if (!code) return res.status(400).send('No code provided');

  try {
    // 1. Exchange code for access token using native fetch
    // Note: Node 18+ has fetch natively.
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      })
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('Failed to get access token');

    // 2. Fetch user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileRes.json();

    // 3. Connect to DB and find/create user
    const collection = await getCollection('users');
    if (!collection) throw new Error('Database not configured');

    let user = await collection.findOne({ Email: profile.email });
    
    if (!user) {
      // Create new user for Google login
      user = {
        ID: profile.id,
        CreatedAt: new Date().toISOString(),
        Name: profile.name,
        Email: profile.email,
        Provider: 'google'
      };
      await collection.insertOne(user);
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
    console.error('Google OAuth Error:', err);
    res.status(500).send(`<h2>OAuth Error</h2><pre>${err.message}</pre><p>Please take a screenshot of this error.</p>`);
  }
};
