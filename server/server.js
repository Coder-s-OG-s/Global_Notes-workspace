require('dotenv').config();
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Dynamically generate client/JS/config.js on startup.
// SECURITY: GROQ_API_KEY is intentionally excluded — it is consumed server-side
// only via the /api/ai/generate proxy route and must never reach the browser.
// ---------------------------------------------------------------------------
try {
  const configContent = `const config = {
    APPWRITE_ENDPOINT: '${process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1"}',
    APPWRITE_PROJECT_ID: '${process.env.APPWRITE_PROJECT_ID || ""}',
    APPWRITE_DATABASE_ID: '${process.env.APPWRITE_DATABASE_ID || ""}',
    APPWRITE_NOTES_COLLECTION_ID: '${process.env.APPWRITE_NOTES_COLLECTION_ID || "notes"}',
    APPWRITE_FOLDERS_COLLECTION_ID: '${process.env.APPWRITE_FOLDERS_COLLECTION_ID || "folders"}',
    APPWRITE_PROFILES_COLLECTION_ID: '${process.env.APPWRITE_PROFILES_COLLECTION_ID || "profiles"}',
    APPWRITE_SHARED_NOTES_COLLECTION_ID: '${process.env.APPWRITE_SHARED_NOTES_COLLECTION_ID || "shared_notes"}',
    SUPABASE_URL: '${process.env.SUPABASE_URL || ""}',
    SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY || ""}'
};

export default config;`;

  const clientJsDir = path.join(__dirname, '../client/JS');
  if (!fs.existsSync(clientJsDir)) {
    fs.mkdirSync(clientJsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(clientJsDir, 'config.js'), configContent);
  console.log('Successfully generated client/JS/config.js on server startup.');
} catch (err) {
  console.error('Failed to generate client/JS/config.js on server startup:', err.message);
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const rateLimit = require('express-rate-limit');

const app = express();
app.enable('trust proxy');
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// STEP 1: Core parsing middleware MUST come first
// (body parsers, cors, logging need to be set up before any logic)
// ---------------------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for development simplicity
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ---------------------------------------------------------------------------
// STEP 2: CORS — only allow requests from our own origin (H5, M3)
// ---------------------------------------------------------------------------
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin requests (no Origin header) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy does not allow origin: ${origin}`));
    }
  },
  credentials: true
}));

// ---------------------------------------------------------------------------
// STEP 3: Session + Passport (must come before routes that need auth)
// SameSite: 'lax' is required for OAuth flows.
//   - 'strict' BREAKS OAuth: when Google/GitHub redirects back to our callback
//     URL, the browser treats it as a cross-site navigation and won't send the
//     session cookie, so Passport loses the OAuth state → login fails.
//   - 'lax' allows top-level cross-site GET navigations (OAuth redirects) while
//     still blocking cross-site POST/PUT/DELETE (CSRF for state-changing ops).
// The CSRF origin-check middleware below provides additional CSRF protection.
// ---------------------------------------------------------------------------
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET || (() => {
    console.warn('[SECURITY] SESSION_SECRET not set — using insecure fallback. Set it in .env!');
    return 'insecure_fallback_change_me';
  })(),
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    secure: isProduction,   // HTTPS-only in production
    httpOnly: true,         // Not accessible via JS
    sameSite: 'lax',        // 'lax' required for OAuth redirect flows (see comment above)
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport Config
require('./config/passport')(passport);

// ---------------------------------------------------------------------------
// STEP 4: Rate Limiting (H4) — applied per route prefix after session is ready
// General: 200 req / 15 min | Auth: 20 req / 15 min | AI: 30 req / min
// ---------------------------------------------------------------------------
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit exceeded. Please wait before making more requests.' }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/ai/', aiLimiter);

// ---------------------------------------------------------------------------
// STEP 5: CSRF protection via Origin/Referer check (H5)
// For state-changing methods (POST, PUT, DELETE, PATCH), verify the request
// originates from our own domain. Auth routes are exempted because OAuth
// callbacks arrive as GET redirects from external providers.
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) return next();

  // Exempt OAuth callbacks — these are GET redirects, but also exempt the whole
  // /api/auth/ namespace to avoid blocking any future auth POST endpoints
  if (req.path.startsWith('/api/auth/')) return next();

  const origin = req.headers['origin'] || req.headers['referer'];
  if (!origin) {
    // No origin header — same-origin form submission or non-browser client.
    // Allow it; ensureAuth on routes provides the actual access control.
    return next();
  }

  const isAllowed = allowedOrigins.some(o => origin.startsWith(o));
  if (!isAllowed) {
    return res.status(403).json({ error: 'CSRF check failed: request origin not allowed.' });
  }
  next();
});

// ---------------------------------------------------------------------------
// STEP 6: Connect to MongoDB
// ---------------------------------------------------------------------------
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// ---------------------------------------------------------------------------
// STEP 7: Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/folders', require('./routes/folders'));
app.use('/api/ai', require('./routes/ai'));

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, '../client')));

// Fallback for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Only start the server if we're not running as a Vercel function
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

// Export the app for Vercel
module.exports = app;
