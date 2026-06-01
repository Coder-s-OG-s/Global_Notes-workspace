const mongoose = require('mongoose');

const FolderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  id: String, // Store client-side UUID for easier mapping
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Folder', FolderSchema);
