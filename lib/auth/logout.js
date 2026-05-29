const { serialize } = require('cookie');

module.exports = (req, res) => {
  // Clear the auth_token cookie.
  // We send a single Set-Cookie header to avoid comma-folding bugs
  // in serverless routing gateways (like Vercel).
  // The SameSite=Lax and Secure properties match all login entrypoints.
  const isSecure = process.env.NODE_ENV !== 'development';
  res.setHeader('Set-Cookie', serialize('auth_token', '', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0),
    path: '/'
  }));

  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
