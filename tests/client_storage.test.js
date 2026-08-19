const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

/**
 * Client Storage & Configuration Integrity Test Suite
 */
test('CLIENT STORAGE & INTEGRITY SUITE', async (t) => {

  await t.test('1. Verify generated config.js files exist and are valid JavaScript module format', () => {
    const clientConfigPath = path.join(__dirname, '../client/JS/config.js');
    const publicConfigPath = path.join(__dirname, '../public/JS/config.js');

    assert.ok(fs.existsSync(clientConfigPath), 'client/JS/config.js must exist on system');
    assert.ok(fs.existsSync(publicConfigPath), 'public/JS/config.js must exist on system');

    const clientConfigContent = fs.readFileSync(clientConfigPath, 'utf8');
    assert.ok(clientConfigContent.includes('export default config;'), 'client/JS/config.js must export default config');
    assert.ok(clientConfigContent.includes('APPWRITE_ENDPOINT'), 'client/JS/config.js must contain APPWRITE_ENDPOINT key');
    assert.ok(clientConfigContent.includes('TURNSTILE_SITE_KEY'), 'client/JS/config.js must contain TURNSTILE_SITE_KEY key');
  });

  await t.test('2. Verify build.js output paths & static public structure', () => {
    const publicHtmlPath = path.join(__dirname, '../public/index.html');
    assert.ok(fs.existsSync(publicHtmlPath), 'public/index.html must exist for production builds');
  });

});
