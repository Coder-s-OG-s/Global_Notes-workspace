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

// Helper to whitelist allowed note fields (Mass Assignment & Schema Injection Prevention)
function sanitizeNotePayload(body) {
  const allowed = {};
  if (typeof body.title === 'string') allowed.title = body.title.substring(0, 500);
  if (typeof body.content === 'string') allowed.content = body.content.substring(0, 500000); // 500 KB limit per note
  if (Array.isArray(body.tags)) allowed.tags = body.tags.filter(t => typeof t === 'string').map(t => t.substring(0, 50));
  if (body.folderId !== undefined) allowed.folderId = body.folderId ? String(body.folderId) : null;
  if (typeof body.color === 'string') allowed.color = body.color.substring(0, 50);
  if (typeof body.theme === 'string') allowed.theme = body.theme.substring(0, 50);
  if (typeof body.editorPattern === 'string') allowed.editorPattern = body.editorPattern.substring(0, 50);
  if (typeof body.isFavorite === 'boolean') allowed.isFavorite = body.isFavorite;
  if (typeof body.isArchived === 'boolean') allowed.isArchived = body.isArchived;
  return allowed;
}

// @desc    Create a note
// @route   POST /api/notes
router.post('/', ensureAuth, async (req, res) => {
  try {
    const cleanPayload = sanitizeNotePayload(req.body);
    const newNote = new Note({
      ...cleanPayload,
      userId: req.user.id
    });
    const note = await newNote.save();
    res.json(note);
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// @desc    Update a note
// @route   PUT /api/notes/:id
router.put('/:id', ensureAuth, async (req, res) => {
  try {
    let note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ msg: 'Note not found' });
    if (note.userId.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    const cleanPayload = sanitizeNotePayload(req.body);
    note = await Note.findByIdAndUpdate(req.params.id, { $set: cleanPayload, updatedAt: Date.now() }, { new: true });
    res.json(note);
  } catch (err) {
    console.error('Error updating note:', err);
    res.status(500).json({ error: 'Failed to update note' });
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
