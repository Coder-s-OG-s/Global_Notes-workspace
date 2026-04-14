const express = require('express');
const router = express.Router();
const Note = require('../models/Note');

// Middleware to ensure user is logged in
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ msg: 'Unauthorized' });
};

// @desc    Get all notes for current user
// @route   GET /api/notes
router.get('/', ensureAuth, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ error: 'Server Error', details: err.message });
  }
});

// @desc    Create a note
// @route   POST /api/notes
router.post('/', ensureAuth, async (req, res) => {
  try {
    const newNote = new Note({
      ...req.body,
      userId: req.user.id
    });
    const note = await newNote.save();
    res.json(note);
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: 'Failed to create note', details: err.message });
  }
});

// @desc    Update a note
// @route   PUT /api/notes/:id
router.put('/:id', ensureAuth, async (req, res) => {
  try {
    let note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ msg: 'Note not found' });
    if (note.userId.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    note = await Note.findByIdAndUpdate(req.params.id, { $set: req.body, updatedAt: Date.now() }, { new: true });
    res.json(note);
  } catch (err) {
    console.error('Error updating note:', err);
    res.status(500).json({ error: 'Failed to update note', details: err.message });
  }
});

// @desc    Delete a note
// @route   DELETE /api/notes/:id
router.delete('/:id', ensureAuth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ msg: 'Note not found' });
    if (note.userId.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    await Note.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Note removed' });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: 'Failed to delete note', details: err.message });
  }
});

module.exports = router;
