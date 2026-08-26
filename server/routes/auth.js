const express = require('express');
const passport = require('passport');
const router = express.Router();

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
router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.json(null);
  }
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
    if (result.success) {
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

