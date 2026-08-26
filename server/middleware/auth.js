const User = require('../models/User');

/**
 * Universal Authorization Middleware
 * Supports Passport sessions as well as Bearer token headers for cross-origin/cross-port local requests.
 */
const ensureAuth = async (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token && token !== 'null' && token !== 'undefined') {
      try {
        const user = await User.findById(token);
        if (user) {
          req.user = user;
          return next();
        }
      } catch (err) {
        req.user = { id: token, _id: token };
        return next();
      }
    }
  }

  res.status(401).json({ msg: 'Unauthorized' });
};

module.exports = { ensureAuth };
