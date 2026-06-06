const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');
const { body, validationResult } = require('express-validator');

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
    console.error('Error fetching folders:', err);
    res.status(500).json({ error: 'Internal server error' }); // H3: no details leaked
  }
});

// @desc    Create a folder
// @route   POST /api/folders
router.post('/',
  ensureAuth,
  body('name').isString().trim().isLength({ min: 1, max: 255 }).withMessage('Folder name must be 1–255 characters'),
  body('id').optional().isString().isLength({ max: 128 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // M5 / H1: Explicitly pick only the allowed fields
      const newFolder = new Folder({
        name: req.body.name.trim(),
        id: typeof req.body.id === 'string' ? req.body.id.slice(0, 128) : undefined,
        userId: req.user.id
      });
      const folder = await newFolder.save();
      res.json(folder);
    } catch (err) {
      console.error('Error creating folder:', err);
      res.status(500).json({ error: 'Internal server error' }); // H3
    }
  }
);

// @desc    Delete a folder
// @route   DELETE /api/folders/:id
router.delete('/:id', ensureAuth, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ msg: 'Folder not found' });
    if (folder.userId.toString() !== req.user.id) return res.status(403).json({ msg: 'Forbidden' });

    await Folder.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Folder removed' });
  } catch (err) {
    console.error('Error deleting folder:', err);
    res.status(500).json({ error: 'Internal server error' }); // H3
  }
});

module.exports = router;
