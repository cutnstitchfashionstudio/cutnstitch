const login = require('../lib/auth/login');
const register = require('../lib/auth/register');
const logout = require('../lib/auth/logout');
const me = require('../lib/auth/me');
const forgotPassword = require('../lib/auth/forgot-password');
const forgotPasswordVerify = require('../lib/auth/forgot-password-verify');
const forgotPasswordReset = require('../lib/auth/forgot-password-reset');
const whatsappVerify = require('../lib/auth/whatsapp-verify');
const signupOtpSend = require('../lib/auth/signup-otp-send');

module.exports = async (req, res) => {
  // Vercel rewrites will inject the matched action into req.query.action
  const action = req.query.action;
  
  if (!action) {
    return res.status(400).json({ error: 'Auth action not specified' });
  }

  switch (action) {
    case 'login': return login(req, res);
    case 'register': return register(req, res);
    case 'logout': return logout(req, res);
    case 'me': return me(req, res);
    case 'forgot-password': return forgotPassword(req, res);
    case 'forgot-password-verify': return forgotPasswordVerify(req, res);
    case 'forgot-password-reset': return forgotPasswordReset(req, res);
    case 'whatsapp-verify': return whatsappVerify(req, res);
    case 'signup-otp-send': return signupOtpSend(req, res);
    default:
      return res.status(404).json({ error: `Auth action '${action}' not found` });
  }
};
