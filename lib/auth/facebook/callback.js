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

    res.writeHead(200, {
      'Set-Cookie': serialize('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      }),
      'Content-Type': 'text/html'
    });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Success</title>
      </head>
      <body style="background: #0a0f1e; color: #e2e8f0; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
        <div style="text-align: center; padding: 20px; border-radius: 12px; background: #111827; border: 1px solid rgba(201,168,76,0.2); box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <div style="font-size: 40px; margin-bottom: 12px;">✅</div>
          <h2 style="color: #c9a84c; margin: 0 0 8px 0; font-size: 20px;">Authenticated Successfully</h2>
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">Closing window...</p>
        </div>
        <script>
          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'oauth-success' }, window.location.origin);
              window.close();
            } catch (e) {
              window.location.href = '/portal';
            }
          } else {
            window.location.href = '/portal';
          }
        </script>
      </body>
      </html>
    `);

  } catch (err) {
    console.error('Facebook OAuth Error:', err);
    res.status(500).send(`<h2>OAuth Error</h2><pre>${err.message}</pre><p>Please take a screenshot of this error.</p>`);
  }
};
