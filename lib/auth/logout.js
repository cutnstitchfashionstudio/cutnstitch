const { serialize } = require('cookie');

module.exports = (req, res) => {
  // Set-Cookie headers that delete the auth_token.
  // We send two variants (secure + non-secure) so deletion works in both
  // production (HTTPS) and local dev (HTTP) without needing NODE_ENV.
  // maxAge:0 + expires=epoch is the most widely supported way to expire a cookie.
  const expired = new Date(0).toUTCString();
  const cookieOpts = {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0),
    path: '/'
  };

  res.setHeader('Set-Cookie', [
    serialize('auth_token', '', { ...cookieOpts, secure: true }),
    serialize('auth_token', '', { ...cookieOpts, secure: false })
  ]);

  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
