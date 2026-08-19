const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  tags: [String],
  folderId: {
    type: String,
    default: null
  },
  color: {
    type: String,
    default: 'blue'
  },
  theme: {
    type: String,
    default: 'classic-blue'
  },
  editorPattern: {
    type: String,
    default: 'plain'
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  lectureTranscript: {
    type: String,
    default: ''
  },
  glossaryTerms: {
    type: Array,
    default: []
  },
  aiConcepts: {
    type: Array,
    default: []
  },
  aiDeadlines: {
    type: Array,
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Note', NoteSchema);
