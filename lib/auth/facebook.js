module.exports = async (req, res) => {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`}/api/auth/facebook/callback`;
  
  if (!clientId) {
    return res.status(500).send(`
      <h2>Missing Configuration</h2>
      <p>Please configure FACEBOOK_CLIENT_ID in your environment variables.</p>
      <a href="/">Go back</a>
    `);
  }

  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email,public_profile,user_gender`;
  
  res.redirect(url);
};
