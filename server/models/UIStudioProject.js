const mongoose = require('mongoose');

const ScreenSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, default: 'page' }, // landing, auth, dashboard, settings, checkout, detail
  html: { type: String, required: true },
  css: { type: String, default: '' },
  description: { type: String, default: '' }
});

const UIStudioProjectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  prompt: { type: String, required: true },
  theme: {
    name: { type: String, default: 'vibrant-neon' },
    primaryColor: { type: String, default: '#FF4F00' },
    secondaryColor: { type: String, default: '#8B5CF6' },
    bgColor: { type: String, default: '#09090B' },
    surfaceColor: { type: String, default: '#18181B' },
    textColor: { type: String, default: '#FFFFFF' },
    fontFamily: { type: String, default: 'Outfit, sans-serif' },
    borderRadius: { type: String, default: '12px' }
  },
  screens: [ScreenSchema],
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UIStudioProject', UIStudioProjectSchema);
