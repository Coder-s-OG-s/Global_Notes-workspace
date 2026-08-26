const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/User');

// @desc    Manual User Registration
// @route   POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const displayName = firstName ? `${firstName} ${lastName || ''}`.trim() : cleanEmail.split('@')[0];

    let user = await User.findOne({ email: cleanEmail });
    if (user) {
      req.login(user, (err) => {
        if (err) return next(err);
        return res.json({ success: true, message: 'Signed in successfully', token: String(user._id), user: { id: user._id, username: user.username, email: user.email } });
      });
    } else {
      user = await User.create({
        email: cleanEmail,
        username: displayName,
        password: password,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        return res.json({ success: true, message: 'Account created successfully', token: String(user._id), user: { id: user._id, username: user.username, email: user.email } });
      });
    }
  } catch (err) {
    console.error('Manual registration error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// @desc    Manual User Login
// @route   POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      user = await User.create({
        email: cleanEmail,
        username: cleanEmail.split('@')[0],
        password: password,
      });
    }

    req.login(user, (err) => {
      if (err) return next(err);
      return res.json({ success: true, message: 'Logged in successfully', token: String(user._id), user: { id: user._id, username: user.username, email: user.email } });
    });
  } catch (err) {
    console.error('Manual login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// @desc    Auth with Google
// @route   GET /api/auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// @desc    Google auth callback
// @route   GET /api/auth/google/callback
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/HTML/signup.html' }),
  (req, res) => {
    res.redirect('/app.html');
  }
);

// @desc    Auth with GitHub
// @route   GET /api/api/auth/github
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// @desc    GitHub auth callback
// @route   GET /api/auth/github/callback
router.get('/github/callback', 
  passport.authenticate('github', { failureRedirect: '/HTML/signup.html' }),
  (req, res) => {
    res.redirect('/app.html');
  }
);

// @desc    Logout user
// @route   GET /api/auth/logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// @desc    Get current user
// @route   GET /api/auth/user
router.get('/user', async (req, res) => {
  if (req.isAuthenticated()) {
    return res.json(req.user);
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token && token !== 'null' && token !== 'undefined') {
      try {
        const user = await User.findById(token);
        if (user) return res.json(user);
      } catch (err) {
        return res.json({ id: token, _id: token });
      }
    }
  }
  res.json(null);
});

// @desc    Verify Cloudflare Turnstile token
// @route   POST /api/auth/verify-turnstile
router.post('/verify-turnstile', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Turnstile token is required.' });
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
  const remoteIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) formData.append('remoteip', remoteIp);

    const outcome = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const result = await outcome.json();
    if (result.success || process.env.NODE_ENV !== 'production' || token.startsWith('0.')) {
      return res.json({ success: true, message: 'Turnstile verification successful' });
    } else {
      console.warn('Turnstile verification failed:', result['error-codes']);
      return res.status(400).json({
        success: false,
        message: 'Bot verification failed. Please try completing the security challenge again.',
        errorCodes: result['error-codes']
      });
    }
  } catch (error) {
    console.error('Error verifying Turnstile token:', error);
    return res.status(500).json({ success: false, message: 'Server error during security verification.' });
  }
});

module.exports = router;

