const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const { body, validationResult } = require('express-validator');

// Middleware to ensure user is logged in
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ msg: 'Unauthorized' });
};

// Allowed fields for note creation and update — prevents mass assignment (H1, H2)
const extractNoteFields = (body) => ({
  title:          typeof body.title          === 'string' ? body.title.slice(0, 500)    : '',
  content:        typeof body.content        === 'string' ? body.content.slice(0, 500000) : '',
  tags:           Array.isArray(body.tags)   ? body.tags.filter(t => typeof t === 'string').slice(0, 50) : [],
  folderId:       typeof body.folderId       === 'string' ? body.folderId               : null,
  theme:          typeof body.theme          === 'string' ? body.theme.slice(0, 100)    : 'classic-blue',
  editorPattern:  typeof body.editorPattern  === 'string' ? body.editorPattern.slice(0, 100) : 'plain',
  isFavorite:     typeof body.isFavorite     === 'boolean' ? body.isFavorite            : false,
  isArchived:     typeof body.isArchived     === 'boolean' ? body.isArchived            : false,
  lectureTranscript: typeof body.lectureTranscript === 'string' ? body.lectureTranscript.slice(0, 100000) : '',
  glossaryTerms:  Array.isArray(body.glossaryTerms) ? body.glossaryTerms.slice(0, 500)   : [],
  aiConcepts:     Array.isArray(body.aiConcepts)    ? body.aiConcepts.slice(0, 100)      : [],
  aiDeadlines:    Array.isArray(body.aiDeadlines)   ? body.aiDeadlines.slice(0, 100)     : [],
});

// Input validators (M5)
const noteValidators = [
  body('title').optional().isString().isLength({ max: 500 }).withMessage('Title must be under 500 characters'),
  body('content').optional().isString().isLength({ max: 500000 }).withMessage('Content too large'),
  body('tags').optional().isArray({ max: 50 }).withMessage('Too many tags'),
];

// @desc    Get all notes for current user
// @route   GET /api/notes
router.get('/', ensureAuth, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ error: 'Internal server error' }); // H3: no details leaked
  }
});

// @desc    Create a note
// @route   POST /api/notes
router.post('/', ensureAuth, noteValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const fields = extractNoteFields(req.body); // H1: whitelist only allowed fields
    const newNote = new Note({ ...fields, userId: req.user.id });
    const note = await newNote.save();
    res.json(note);
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: 'Internal server error' }); // H3
  }
});

// @desc    Update a note
// @route   PUT /api/notes/:id
router.put('/:id', ensureAuth, noteValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ msg: 'Note not found' });
    if (note.userId.toString() !== req.user.id) return res.status(403).json({ msg: 'Forbidden' });

    const fields = extractNoteFields(req.body); // H2: whitelist prevents userId override
    fields.updatedAt = Date.now();

    const updated = await Note.findByIdAndUpdate(
      req.params.id,
      { $set: fields },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error('Error updating note:', err);
    res.status(500).json({ error: 'Internal server error' }); // H3
  }
});

// @desc    Delete a note
// @route   DELETE /api/notes/:id
router.delete('/:id', ensureAuth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ msg: 'Note not found' });
    if (note.userId.toString() !== req.user.id) return res.status(403).json({ msg: 'Forbidden' });

    await Note.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Note removed' });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: 'Internal server error' }); // H3
  }
});

module.exports = router;
