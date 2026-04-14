const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');

const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ msg: 'Unauthorized' });
};

// @desc    Get all folders for current user
// @route   GET /api/folders
router.get('/', ensureAuth, async (req, res) => {
  try {
    const folders = await Folder.find({ userId: req.user.id });
    res.json(folders);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @desc    Create a folder
// @route   POST /api/folders
router.post('/', ensureAuth, async (req, res) => {
  try {
    const newFolder = new Folder({
      name: req.body.name,
      id: req.body.id, // Capture client UUID
      userId: req.user.id
    });
    const folder = await newFolder.save();
    res.json(folder);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @desc    Delete a folder
// @route   DELETE /api/folders/:id
router.delete('/:id', ensureAuth, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ msg: 'Folder not found' });
    if (folder.userId.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    await Folder.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Folder removed' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
