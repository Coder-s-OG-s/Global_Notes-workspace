const test = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer } = require('./test_server');

/**
 * Backend API Security, Boundary & Vulnerability Audit Test Suite
 */
test('API SECURITY & BOUNDARY SUITE', async (t) => {

  let testEnv;

  t.before(async () => {
    testEnv = await startTestServer();
  });

  t.after(async () => {
    if (testEnv) await testEnv.close();
  });

  await t.test('1. Security Headers & CORS Audit (Helmet)', async () => {
    const res = await fetch(`${testEnv.baseUrl}/api/auth/user`);
    
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN', 'X-Frame-Options must be SAMEORIGIN');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff', 'X-Content-Type-Options must be nosniff');
    assert.ok(res.headers.get('strict-transport-security'), 'Strict-Transport-Security header must be present');
    assert.equal(res.headers.get('x-powered-by'), null, 'X-Powered-By header must be hidden');
  });

  await t.test('2. SSRF Protection Audit on /api/proxy/fetch-url', async () => {
    const forbiddenUrls = [
      'http://127.0.0.1',
      'http://localhost',
      'http://127.0.0.1:3000',
      'http://169.254.169.254/latest/meta-data/', // AWS Metadata API
      'http://10.0.0.1',
      'http://192.168.1.1',
      'http://172.16.0.1',
      'file:///etc/passwd',
      'ftp://ftp.ubuntu.com/files'
    ];

    for (const url of forbiddenUrls) {
      const res = await fetch(`${testEnv.baseUrl}/api/proxy/fetch-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, usePuppeteer: false })
      });

      const data = await res.json();
      assert.equal(res.status, 400, `Forbidden internal URL (${url}) should respond with HTTP 400`);
      assert.ok(data.error.includes('forbidden') || data.error.includes('restricted'), `Response error message should indicate forbidden access for ${url}`);
    }
  });

  await t.test('3. Turnstile Verification Security & Error Boundary', async () => {
    // Test 3a: Missing token
    const resNoToken = await fetch(`${testEnv.baseUrl}/api/auth/verify-turnstile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(resNoToken.status, 400, 'Missing turnstile token should return HTTP 400');
    const dataNoToken = await resNoToken.json();
    assert.equal(dataNoToken.success, false);

    // Test 3b: Empty string token
    const resEmptyToken = await fetch(`${testEnv.baseUrl}/api/auth/verify-turnstile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: '' })
    });
    assert.equal(resEmptyToken.status, 400, 'Empty turnstile token should return HTTP 400');
  });

  await t.test('4. Payload Size Limit Enforcement (10MB Cap)', async () => {
    // Generate an oversized string payload exceeding 10MB (11 MB)
    const elevenMBString = 'X'.repeat(11 * 1024 * 1024);

    const resOver = await fetch(`${testEnv.baseUrl}/api/proxy/fetch-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawHtml: elevenMBString })
    });

    assert.equal(resOver.status, 413, 'Payload exceeding 10MB limit must be rejected with HTTP 413 Payload Too Large');
  });

  await t.test('5. Unauthenticated Protected Endpoint Access Control', async () => {
    const protectedRoutes = [
      { method: 'GET', path: '/api/notes' },
      { method: 'POST', path: '/api/notes' },
      { method: 'PUT', path: '/api/notes/12345' },
      { method: 'DELETE', path: '/api/notes/12345' },
      { method: 'GET', path: '/api/folders' },
      { method: 'POST', path: '/api/folders' },
      { method: 'DELETE', path: '/api/folders/12345' },
      { method: 'GET', path: '/api/student-hub' },
      { method: 'POST', path: '/api/student-hub' }
    ];

    for (const route of protectedRoutes) {
      const res = await fetch(`${testEnv.baseUrl}${route.path}`, {
        method: route.method,
        headers: { 'Content-Type': 'application/json' }
      });
      assert.equal(res.status, 401, `Unauthenticated ${route.method} ${route.path} must return 401 Unauthorized`);
    }
  });

  await t.test('6. Input Sanitization & HTML/Tag Boundary on Note Payload', async () => {
    // Login to obtain authorized session
    const loginRes = await fetch(`${testEnv.baseUrl}/api/auth/mock-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'mock_sanitization_user', email: 'sanit@test.com' })
    });
    const cookie = loginRes.headers.get('set-cookie');

    // Test smart tags generation with XSS payload
    const tagRes = await fetch(`${testEnv.baseUrl}/api/ai/suggest-tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        title: '<script>alert("xss")</script>My Secret Note',
        content: '<img src=x onerror=alert(1)> Note content for testing boundaries'
      })
    });

    const tagData = await tagRes.json();
    assert.equal(tagRes.status, 200);
    assert.ok(Array.isArray(tagData.tags), 'Tags should return valid array even with HTML tags in note content');
    // Ensure script tags were stripped/cleaned from generated tags
    tagData.tags.forEach(t => {
      assert.ok(!t.includes('<script>'), 'Generated tag should not contain dangerous HTML script tags');
    });
  });

});
