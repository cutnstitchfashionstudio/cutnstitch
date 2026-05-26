module.exports = async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`}/api/auth/google/callback`;
  
  if (!clientId) {
    return res.status(500).send(`
      <h2>Missing Configuration</h2>
      <p>Please configure GOOGLE_CLIENT_ID in your environment variables.</p>
      <a href="/">Go back</a>
    `);
  }

  const scope = 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=select_account`;
  
  res.redirect(url);
};
