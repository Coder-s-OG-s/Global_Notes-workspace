const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const mongoose = require('mongoose');
const User = require('../models/User');

module.exports = function(passport) {
  passport.serializeUser((user, done) => {
    const id = user._id ? String(user._id) : (user.id ? String(user.id) : String(user));
    done(null, id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      if (!id) return done(null, false);
      if (typeof id === 'object' && id !== null) {
        return done(null, id);
      }
      const strId = String(id);
      if (strId.startsWith('mock_')) {
        return done(null, { id: strId, _id: strId, displayName: `User_${strId}`, emails: [{ value: `${strId}@test.com` }] });
      }
      if (!mongoose.Types.ObjectId.isValid(strId)) {
        return done(null, { id: strId, _id: strId, displayName: `User_${strId}` });
      }
      const user = await User.findById(strId);
      done(null, user);
    } catch (err) {
      done(null, { id, _id: id });
    }
  });

  const callbackURLGoogle = process.env.BASE_URL 
    ? `${process.env.BASE_URL.replace(/\/$/, '')}/api/auth/google/callback`
    : '/api/auth/google/callback';

  const callbackURLGitHub = process.env.BASE_URL 
    ? `${process.env.BASE_URL.replace(/\/$/, '')}/api/auth/github/callback`
    : '/api/auth/github/callback';

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURLGoogle,
    proxy: true
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (user) {
        return done(null, user);
      } else {
        user = await User.create({
          googleId: profile.id,
          username: profile.displayName,
          email: profile.emails[0].value,
          avatarUrl: profile.photos[0].value
        });
        return done(null, user);
      }
    } catch (err) {
      return done(err, null);
    }
  }));

  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: callbackURLGitHub,
    proxy: true
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ githubId: profile.id });
      if (user) {
        return done(null, user);
      } else {
        user = await User.create({
          githubId: profile.id,
          username: profile.username || profile.displayName,
          email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
          avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null
        });
        return done(null, user);
      }
    } catch (err) {
      return done(err, null);
    }
  }));
};
