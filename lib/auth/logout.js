const { serialize } = require('cookie');

module.exports = (req, res) => {
  // Clear the auth_token cookie across all possible client variations
  // (Secure/Non-Secure, Lax/Strict) to support both standard login
  // and WhatsApp/OAuth flows. We omit 'expires' to avoid comma-folding
  // issues in serverless header routers.
  const isSecure = process.env.NODE_ENV !== 'development';
  const cookieOpts = {
    httpOnly: true,
    maxAge: 0,
    path: '/'
  };

  res.setHeader('Set-Cookie', [
    serialize('auth_token', '', { ...cookieOpts, secure: isSecure, sameSite: 'lax' }),
    serialize('auth_token', '', { ...cookieOpts, secure: isSecure, sameSite: 'strict' }),
    serialize('auth_token', '', { ...cookieOpts, secure: false, sameSite: 'lax' }),
    serialize('auth_token', '', { ...cookieOpts, secure: false, sameSite: 'strict' })
  ]);

  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
