require('dotenv').config();
// Set test mode keys to empty to force immediate local fallback execution in AI routes
process.env.GEMINI_API_KEY = '';
process.env.GROQ_API_KEY = '';

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const http = require('http');

/**
 * Creates an in-memory or test-configured Express app instance for test suites.
 * Allows isolation, rate limit customization, and mock auth sessions without side effects.
 */
function createTestApp(options = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use(helmet({
    contentSecurityPolicy: false,
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
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // In-memory MemoryStore session for deterministic concurrency & speed in load testing
  const MemoryStore = session.MemoryStore;
  app.use(session({
    secret: process.env.SESSION_SECRET || 'test_secret_key_12345',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore(),
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());
  require('../server/config/passport')(passport);

  // Mock authentication helper route for test suites (bypasses rate limiter)
  app.post('/api/auth/mock-login', (req, res) => {
    const { userId, email, username } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required for mock login' });
    }
    const mockUser = {
      id: userId,
      _id: userId,
      displayName: username || `User_${userId}`,
      emails: [{ value: email || `user_${userId}@example.com` }]
    };

    req.login(mockUser, (err) => {
      if (err) return res.status(500).json({ error: 'Session creation failed' });
      return res.json({ success: true, user: mockUser });
    });
  });

  // Custom rate limiters for testing
  const apiLimiter = rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.apiMax || 5000,
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }
  });

  const authLimiter = rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.authMax || 1000,
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }
  });

  app.use('/api/', apiLimiter);
  app.use('/api/auth/', authLimiter);

  // Mount standard app routes
  app.use('/api/auth', require('../server/routes/auth'));
  app.use('/api/notes', require('../server/routes/notes'));
  app.use('/api/folders', require('../server/routes/folders'));
  app.use('/api/student-hub', require('../server/routes/studentHub'));
  app.use('/api/proxy', require('../server/routes/proxy'));
  app.use('/api/ai', require('../server/routes/ai'));

  return app;
}

/**
 * Starts a test HTTP server on a random available port.
 */
function startTestServer(options = {}) {
  return new Promise((resolve, reject) => {
    const app = createTestApp(options);
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;
      resolve({
        server,
        baseUrl,
        port: address.port,
        close: () => new Promise(res => server.close(res))
      });
    });
    server.on('error', reject);
  });
}

module.exports = {
  createTestApp,
  startTestServer
};
