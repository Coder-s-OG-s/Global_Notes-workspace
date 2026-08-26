const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');

const { ensureAuth } = require('../middleware/auth');

// @desc    Get all folders for current user
// @route   GET /api/folders
router.get('/', ensureAuth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const folders = await Folder.find({ userId });
    res.json(folders);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @desc    Create a folder
// @route   POST /api/folders
router.post('/', ensureAuth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const newFolder = new Folder({
      name: req.body.name,
      color: req.body.color || 'blue',
      id: req.body.id, // Capture client UUID
      userId
    });
    const folder = await newFolder.save();
    res.json(folder);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @desc    Update a folder (name and/or color)
// @route   PUT /api/folders/:id
router.put('/:id', ensureAuth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    let folder = await Folder.findOne({ id: req.params.id, userId });
    if (!folder) {
      folder = await Folder.findById(req.params.id);
    }
    if (!folder) return res.status(404).json({ msg: 'Folder not found' });
    if (String(folder.userId) !== String(userId)) return res.status(401).json({ msg: 'Not authorized' });

    if (req.body.name !== undefined) folder.name = req.body.name;
    if (req.body.color !== undefined) folder.color = req.body.color;

    await folder.save();
    res.json(folder);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @desc    Delete a folder
// @route   DELETE /api/folders/:id
router.delete('/:id', ensureAuth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ msg: 'Folder not found' });
    if (String(folder.userId) !== String(userId)) return res.status(401).json({ msg: 'Not authorized' });

    await Folder.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Folder removed' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
