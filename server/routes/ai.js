const express = require('express');
const router = express.Router();

// Middleware to ensure user is logged in
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ msg: 'Unauthorized' });
};

/**
 * @desc    Server-side proxy for Groq AI generation.
 *          The GROQ_API_KEY never leaves the server environment.
 * @route   POST /api/ai/generate
 * @access  Private (requires authentication)
 */
router.post('/generate', ensureAuth, async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'A non-empty prompt string is required.' });
  }

  if (prompt.length > 10000) {
    return res.status(400).json({ error: 'Prompt exceeds maximum length of 10,000 characters.' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('[AI Proxy] GROQ_API_KEY is not configured on the server.');
    return res.status(503).json({ error: 'AI service is not configured. Contact the administrator.' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt.trim() }],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error('[AI Proxy] Groq API error:', response.status, errBody);
      return res.status(502).json({ error: 'AI service returned an error. Please try again.' });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    return res.json({ text });

  } catch (err) {
    console.error('[AI Proxy] Request failed:', err.message);
    return res.status(500).json({ error: 'AI service is temporarily unavailable.' });
  }
});

module.exports = router;
