const mongoose = require('mongoose');

const StudentHubSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  decks: {
    type: Array,
    default: []
  },
  activeDeckId: {
    type: String,
    default: ''
  },
  schedules: {
    type: Array,
    default: []
  },
  activeScheduleId: {
    type: String,
    default: ''
  },
  flowcharts: {
    type: Array,
    default: []
  },
  activeFlowchartId: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('StudentHub', StudentHubSchema);
