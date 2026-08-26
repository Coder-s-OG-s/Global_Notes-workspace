require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Dynamically generate client/JS/config.js on startup for front-end public keys ONLY
try {
  const configObj = {
    APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1",
    APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID || "",
    APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID || "",
    APPWRITE_NOTES_COLLECTION_ID: process.env.APPWRITE_NOTES_COLLECTION_ID || "notes",
    APPWRITE_FOLDERS_COLLECTION_ID: process.env.APPWRITE_FOLDERS_COLLECTION_ID || "folders",
    APPWRITE_PROFILES_COLLECTION_ID: process.env.APPWRITE_PROFILES_COLLECTION_ID || "profiles",
    APPWRITE_SHARED_NOTES_COLLECTION_ID: process.env.APPWRITE_SHARED_NOTES_COLLECTION_ID || "shared_notes",
    SUPABASE_URL: process.env.SUPABASE_URL || "",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    GROQ_API_KEY: process.env.GROQ_API_KEY || "",
    TURNSTILE_SITE_KEY: (process.env.TURNSTILE_SITE_KEY || "0x4AAAAAAEQyiKm40gWQ6_Gx").trim()
  };

  const configContent = `const config = ${JSON.stringify(configObj, null, 2)};\n\nexport default config;\n`;

  const clientJsDir = path.join(__dirname, '../client/JS');
  if (!fs.existsSync(clientJsDir)) {
    fs.mkdirSync(clientJsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(clientJsDir, 'config.js'), configContent);

  const publicJsDir = path.join(__dirname, '../public/JS');
  if (fs.existsSync(publicJsDir)) {
    fs.writeFileSync(path.join(publicJsDir, 'config.js'), configContent);
  }
  console.log('Successfully generated client/JS/config.js and public/JS/config.js on server startup.');
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
app.disable('x-powered-by');
app.enable('trust proxy');
const PORT = process.env.PORT || 3000;

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for local development
  crossOriginEmbedderPolicy: false,
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'sameorigin' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true },
  ieNoOpen: true,
  noSniff: true,
  xssFilter: true,
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting Security
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    secure: false, // Must be false for localhost (HTTP)
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Passport Initialize
app.use(passport.initialize());
app.use(passport.session());

// Passport Config
require('./config/passport')(passport);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/folders', require('./routes/folders'));
app.use('/api/student-hub', require('./routes/studentHub'));
app.use('/api/proxy', require('./routes/proxy'));
app.use('/api/ai', require('./routes/ai'));

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, '../client')));

// Fallback for SPA (if applicable)
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
