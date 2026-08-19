const test = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer } = require('./test_server');

/**
 * Database Resilience, Schema Validation & Concurrent Data Modification Test Suite
 */
test('DATABASE RESILIENCE & CONCURRENCY SUITE', async (t) => {

  let testEnv;

  t.before(async () => {
    testEnv = await startTestServer();
  });

  t.after(async () => {
    if (testEnv) await testEnv.close();
  });

  await t.test('1. Student Hub State Concurrency & Serialization', async () => {
    // Authenticate test user session with valid 24-character ObjectId string
    const loginRes = await fetch(`${testEnv.baseUrl}/api/auth/mock-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '507f191e810c19729de860ea', email: 'student@test.com' })
    });
    const cookie = loginRes.headers.get('set-cookie');

    // Perform initial GET (should return empty document structure if not exists)
    const getRes = await fetch(`${testEnv.baseUrl}/api/student-hub`, {
      headers: { Cookie: cookie }
    });
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.ok(Array.isArray(getData.decks));
    assert.ok(Array.isArray(getData.schedules));
    assert.ok(Array.isArray(getData.flowcharts));

    // Perform concurrent POST updates to test state upsert concurrency
    const updatePayloads = Array.from({ length: 10 }, (_, i) => ({
      decks: [{ id: `deck_${i}`, name: `Flashcards Deck ${i}` }],
      activeDeckId: `deck_${i}`,
      schedules: [{ id: `sched_${i}`, title: `Schedule ${i}` }],
      activeScheduleId: `sched_${i}`,
      flowcharts: [],
      activeFlowchartId: ''
    }));

    const updatePromises = updatePayloads.map(payload => 
      fetch(`${testEnv.baseUrl}/api/student-hub`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify(payload)
      })
    );

    const responses = await Promise.all(updatePromises);
    responses.forEach(r => assert.equal(r.status, 200, 'All concurrent Student Hub updates must respond with 200 OK'));
  });

  await t.test('2. AI Refine Element Intelligent Local Fallback Engine Resilience', async () => {
    // Test the intelligent local CSS/HTML element transformer when LLM is unavailable / rate-limited
    const payload = {
      targetHTML: '<div class="card"><h3>Biology Note</h3><p>Photosynthesis details</p></div>',
      elementId: 'node-42',
      prompt: 'make background glassmorphic with light blue accent, rounded pill style and shadow'
    };

    const res = await fetch(`${testEnv.baseUrl}/api/ai/refine-element`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.elementId, 'node-42');
    assert.ok(data.html.includes('data-element-id="node-42"'), 'Root element data-element-id attribute must be preserved');
    assert.ok(data.html.includes('backdrop-filter') || data.html.includes('#38bdf8') || data.html.includes('border-radius'), 'Transformed HTML must contain requested CSS styles');
  });

  await t.test('3. Code Assistant Boundary & Missing Argument Handling', async () => {
    // Missing code argument
    const resBad = await fetch(`${testEnv.baseUrl}/api/ai/code-suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'optimize' })
    });
    assert.equal(resBad.status, 400, 'Missing code should yield 400 status');

    // Valid code request with action
    const resGood = await fetch(`${testEnv.baseUrl}/api/ai/code-suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'function add(a, b) { return a + b; }',
        language: 'javascript',
        action: 'explain'
      })
    });
    assert.equal(resGood.status, 200);
    const dataGood = await resGood.json();
    assert.equal(dataGood.success, true);
    assert.ok(dataGood.explanation, 'Code explanation must be populated');
  });

  await t.test('4. Cross-Note Search Empty Snippets Boundary', async () => {
    const res = await fetch(`${testEnv.baseUrl}/api/ai/cross-note-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'photosynthesis', snippets: [] })
    });
    assert.equal(res.status, 400, 'Empty snippets array should respond with 400 Bad Request');
  });

});
