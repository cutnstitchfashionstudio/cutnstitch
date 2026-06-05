const google = require('../lib/auth/google');
const googleCallback = require('../lib/auth/google/callback');
const facebook = require('../lib/auth/facebook');
const facebookCallback = require('../lib/auth/facebook/callback');

module.exports = async (req, res) => {
  const provider = req.query.provider;
  const action = req.query.action; // 'callback' or undefined

  if (provider === 'google') {
    if (action === 'callback') return googleCallback(req, res);
    return google(req, res);
  }
  
  if (provider === 'facebook') {
    if (action === 'callback') return facebookCallback(req, res);
    return facebook(req, res);
  }
  
  return res.status(404).json({ error: 'OAuth provider not found' });
};
