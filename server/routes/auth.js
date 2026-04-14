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
    res.status(401).json({ msg: 'Not authenticated' });
  }
});

module.exports = router;
