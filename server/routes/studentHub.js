const express = require('express');
const router = express.Router();
const StudentHub = require('../models/StudentHub');

const { ensureAuth } = require('../middleware/auth');

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

    const userId = req.user._id || req.user.id;

    if (mongoose.connection.readyState !== 1) {
      const cached = inMemoryHubStore.get(String(userId)) || defaultData;
      return res.json(cached);
    }

    let hubData = await StudentHub.findOne({ userId });
    if (!hubData) {
      hubData = defaultData;
    }
    res.json(hubData);
  } catch (err) {
    console.warn('Student Hub DB fallback invoked:', err.message);
    const userId = req.user._id || req.user.id;
    const cached = inMemoryHubStore.get(String(userId)) || {
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
    const userId = req.user._id || req.user.id;
    
    const payloadData = {
      userId,
      decks: decks || [],
      activeDeckId: activeDeckId || '',
      schedules: schedules || [],
      activeScheduleId: activeScheduleId || '',
      flowcharts: flowcharts || [],
      activeFlowchartId: activeFlowchartId || '',
      updatedAt: Date.now()
    };

    inMemoryHubStore.set(String(userId), payloadData);

    if (mongoose.connection.readyState !== 1) {
      return res.json(payloadData);
    }

    let hubData = await StudentHub.findOne({ userId });
    
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
    const userId = req.user._id || req.user.id;
    const cached = inMemoryHubStore.get(String(userId));
    res.json(cached || req.body);
  }
});

module.exports = router;
