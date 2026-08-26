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

const mongoose = require('mongoose');
const inMemoryHubStore = new Map();

// @desc    Get Student Hub state for current user
// @route   GET /api/student-hub
router.get('/', ensureAuth, async (req, res) => {
  try {
    const defaultData = {
      decks: [],
      activeDeckId: '',
      schedules: [],
      activeScheduleId: '',
      flowcharts: [],
      activeFlowchartId: ''
    };

    if (mongoose.connection.readyState !== 1) {
      const cached = inMemoryHubStore.get(String(req.user.id)) || defaultData;
      return res.json(cached);
    }

    let hubData = await StudentHub.findOne({ userId: req.user.id });
    if (!hubData) {
      hubData = defaultData;
    }
    res.json(hubData);
  } catch (err) {
    console.warn('Student Hub DB fallback invoked:', err.message);
    const cached = inMemoryHubStore.get(String(req.user.id)) || {
      decks: [],
      activeDeckId: '',
      schedules: [],
      activeScheduleId: '',
      flowcharts: [],
      activeFlowchartId: ''
    };
    res.json(cached);
  }
});

// @desc    Save/Upsert Student Hub state for current user
// @route   POST /api/student-hub
router.post('/', ensureAuth, async (req, res) => {
  try {
    const { decks, activeDeckId, schedules, activeScheduleId, flowcharts, activeFlowchartId } = req.body;
    
    const payloadData = {
      userId: req.user.id,
      decks: decks || [],
      activeDeckId: activeDeckId || '',
      schedules: schedules || [],
      activeScheduleId: activeScheduleId || '',
      flowcharts: flowcharts || [],
      activeFlowchartId: activeFlowchartId || '',
      updatedAt: Date.now()
    };

    inMemoryHubStore.set(String(req.user.id), payloadData);

    if (mongoose.connection.readyState !== 1) {
      return res.json(payloadData);
    }

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
      hubData = new StudentHub(payloadData);
      await hubData.save();
    }
    res.json(hubData);
  } catch (err) {
    console.warn('Error saving Student Hub data (using memory fallback):', err.message);
    const cached = inMemoryHubStore.get(String(req.user.id));
    res.json(cached || req.body);
  }
});

module.exports = router;
