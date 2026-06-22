/**
 * generate-config.js
 * Generates client/JS/config.js from environment variables.
 *
 * SECURITY: GROQ_API_KEY is intentionally excluded. It is consumed server-side
 * only via the /api/ai/generate proxy route and must never reach the browser.
 *
 * Usage: node generate-config.js
 */

// L1: Use dotenv properly instead of naive split('=') which breaks on values containing '='
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const configContent = `const config = {
    APPWRITE_ENDPOINT: '${process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1"}',
    APPWRITE_PROJECT_ID: '${process.env.APPWRITE_PROJECT_ID || ""}',
    APPWRITE_DATABASE_ID: '${process.env.APPWRITE_DATABASE_ID || ""}',
    SUPABASE_URL: '${process.env.SUPABASE_URL || ""}',
    SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY || ""}'
};

export default config;
`;

const jsDir = path.join(__dirname, 'client', 'JS');
if (!fs.existsSync(jsDir)) {
  fs.mkdirSync(jsDir, { recursive: true });
}
const configPath = path.join(jsDir, 'config.js');

try {
  fs.writeFileSync(configPath, configContent);
  console.log('Successfully generated client/JS/config.js');
  console.log('[SECURITY] GROQ_API_KEY was intentionally excluded from the browser bundle.');
} catch (error) {
  console.error('Error generating configuration:', error);
  process.exit(1);
}
