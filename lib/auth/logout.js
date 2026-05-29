const { serialize } = require('cookie');

module.exports = (req, res) => {
  // Clear the auth_token cookie with matching Secure option
  // to ensure correct browser deletion in both prod and dev.
  const isSecure = process.env.NODE_ENV !== 'development';
  const cookieOpts = {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0),
    path: '/'
  };

  res.setHeader('Set-Cookie', serialize('auth_token', '', { ...cookieOpts, secure: isSecure }));

  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
