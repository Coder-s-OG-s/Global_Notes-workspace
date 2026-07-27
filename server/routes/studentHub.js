const express = require('express');
const router = express.Router();
const StudentHub = require('../models/StudentHub');

// Middleware to ensure user is logged in
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ msg: 'Unauthorized' });
};

// @desc    Get Student Hub state for current user
// @route   GET /api/student-hub
router.get('/', ensureAuth, async (req, res) => {
  try {
    let hubData = await StudentHub.findOne({ userId: req.user.id });
    if (!hubData) {
      // Return empty document structure if not exists yet
      hubData = {
        decks: [],
        activeDeckId: '',
        schedules: [],
        activeScheduleId: '',
        flowcharts: [],
        activeFlowchartId: ''
      };
    }
    res.json(hubData);
  } catch (err) {
    console.error('Error fetching Student Hub data:', err);
    res.status(500).json({ error: 'Server Error', details: err.message });
  }
});

// @desc    Save/Upsert Student Hub state for current user
// @route   POST /api/student-hub
router.post('/', ensureAuth, async (req, res) => {
  try {
    const { decks, activeDeckId, schedules, activeScheduleId, flowcharts, activeFlowchartId } = req.body;
    
    let hubData = await StudentHub.findOne({ userId: req.user.id });
    
    if (hubData) {
      // Update
      hubData.decks = decks || [];
      hubData.activeDeckId = activeDeckId || '';
      hubData.schedules = schedules || [];
      hubData.activeScheduleId = activeScheduleId || '';
      hubData.flowcharts = flowcharts || [];
      hubData.activeFlowchartId = activeFlowchartId || '';
      hubData.updatedAt = Date.now();
      await hubData.save();
    } else {
      // Create
      hubData = new StudentHub({
        userId: req.user.id,
        decks: decks || [],
        activeDeckId: activeDeckId || '',
        schedules: schedules || [],
        activeScheduleId: activeScheduleId || '',
        flowcharts: flowcharts || [],
        activeFlowchartId: activeFlowchartId || ''
      });
      await hubData.save();
    }
    res.json(hubData);
  } catch (err) {
    console.error('Error saving Student Hub data:', err);
    res.status(500).json({ error: 'Failed to save Student Hub data', details: err.message });
  }
});

module.exports = router;
