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

  await t.test('3. Verify Markdown asterisk & header rendering logic across client files', () => {
    const codeWsPath = path.join(__dirname, '../client/JS/codeWorkspace.js');
    const aiAssistantPath = path.join(__dirname, '../client/JS/aiAssistant.js');
    const studentHubPath = path.join(__dirname, '../client/JS/studentHub.js');

    const codeWsContent = fs.readFileSync(codeWsPath, 'utf8');
    const aiAssistantContent = fs.readFileSync(aiAssistantPath, 'utf8');
    const studentHubContent = fs.readFileSync(studentHubPath, 'utf8');

    // Ensure codeWorkspace.js has bullet and header parsing
    assert.ok(codeWsContent.includes('listMatch'), 'codeWorkspace.js must handle bullet list matching');
    assert.ok(codeWsContent.includes('headerMatch'), 'codeWorkspace.js must handle header matching');

    // Ensure aiAssistant.js exports parseMarkdownToHtml
    assert.ok(aiAssistantContent.includes('export function parseMarkdownToHtml'), 'aiAssistant.js must export parseMarkdownToHtml');
    assert.ok(aiAssistantContent.includes('formattedHtml'), 'aiAssistant.js insertTextAtCursor must use formatted HTML');

    // Ensure studentHub.js renderSafeHtml has list & header handling
    assert.ok(studentHubContent.includes('formatInline'), 'studentHub.js must format inline markdown');
    assert.ok(studentHubContent.includes('listMatch'), 'studentHub.js must handle bullet list items');
  });

});
