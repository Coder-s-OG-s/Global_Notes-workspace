const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: String,
  githubId: String,
  email: {
    type: String,
    unique: true,
    sparse: true
  },
  username: String,
  avatarUrl: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
