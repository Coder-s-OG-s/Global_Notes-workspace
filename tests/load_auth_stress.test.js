const test = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer } = require('./test_server');

/**
 * Extreme Concurrency & Load Test Suite for Authentication & Sessions
 */
test('AUTH STRESS & CONCURRENCY SUITE', async (t) => {

  let testEnv;

  t.before(async () => {
    // Start server with custom high limits for stress testing concurrent sessions
    testEnv = await startTestServer({ authMax: 1000, apiMax: 5000 });
  });

  t.after(async () => {
    if (testEnv) await testEnv.close();
  });

  await t.test('1. Extreme Concurrency: N = 100 Simultaneous Logins', async () => {
    const N = 100;
    const initialMemory = process.memoryUsage().heapUsed;
    const startTime = Date.now();

    console.log(`\n--- Starting Concurrency Load Test: ${N} Concurrent Logins ---`);

    const loginPromises = Array.from({ length: N }, (_, i) => {
      const userId = `mock_user_concurrent_${i}_${Date.now()}`;
      return fetch(`${testEnv.baseUrl}/api/auth/mock-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          username: `TestUser_${i}`,
          email: `testuser_${i}@stress.test`
        })
      }).then(async res => {
        const text = await res.text();
        let data = {};
        try { data = JSON.parse(text); } catch (e) {}
        return {
          status: res.status,
          ok: res.ok,
          headers: res.headers,
          data,
          userId
        };
      });
    });

    const results = await Promise.all(loginPromises);
    const totalDuration = Date.now() - startTime;
    const finalMemory = process.memoryUsage().heapUsed;

    const successes = results.filter(r => r.ok && r.data.success);
    const failures = results.filter(r => !r.ok);

    console.log(`Completed ${N} concurrent logins in ${totalDuration}ms.`);
    console.log(`Successes: ${successes.length} / ${N}`);
    console.log(`Failures: ${failures.length}`);
    console.log(`Memory Delta: ${((finalMemory - initialMemory) / 1024 / 1024).toFixed(2)} MB`);

    assert.equal(successes.length, N, `All ${N} concurrent logins should succeed without dropping requests or crashing`);
  });

  await t.test('2. Session Isolation & Contamination Check Under Heavy Load', async () => {
    const COUNT = 50;
    console.log(`\n--- Testing Session Isolation across ${COUNT} Parallel Users ---`);

    const sessions = await Promise.all(
      Array.from({ length: COUNT }, async (_, i) => {
        const userId = `mock_isolation_user_${i}`;
        const email = `isolation_${i}@test.com`;
        
        // Login and grab Set-Cookie
        const res = await fetch(`${testEnv.baseUrl}/api/auth/mock-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, email })
        });
        const cookie = res.headers.get('set-cookie');
        return { userId, email, cookie };
      })
    );

    // Concurrently fetch profile for each session and verify strict session boundaries
    const verificationResults = await Promise.all(
      sessions.map(async (sess) => {
        const profileRes = await fetch(`${testEnv.baseUrl}/api/auth/user`, {
          headers: { Cookie: sess.cookie }
        });
        const profileData = await profileRes.json();
        return {
          expectedUserId: sess.userId,
          receivedUserId: profileData.id,
          match: profileData.id === sess.userId
        };
      })
    );

    const mismatches = verificationResults.filter(r => !r.match);
    assert.equal(mismatches.length, 0, `Zero session leaks or contamination should occur under concurrent traffic`);
  });

  await t.test('3. Rate Limiter Throttling Enforcement (HTTP 429)', async () => {
    console.log('\n--- Testing Auth Endpoint Rate Limiter Throttling ---');
    // Start a fresh server with a strict rate limit of 10 auth requests
    const strictEnv = await startTestServer({ authMax: 10, windowMs: 60000 });

    try {
      const requests = Array.from({ length: 15 }, (_, i) => 
        fetch(`${strictEnv.baseUrl}/api/auth/verify-turnstile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'dummy_token' })
        })
      );

      const responses = await Promise.all(requests);
      const statuses = responses.map(r => r.status);
      const rateLimited = statuses.filter(s => s === 429);

      console.log(`Sent 15 requests (limit = 10). Rate limited (429) count: ${rateLimited.length}`);
      assert.ok(rateLimited.length >= 5, 'Requests exceeding rate limit max MUST receive 429 Too Many Requests status');
    } finally {
      await strictEnv.close();
    }
  });

  await t.test('4. Latency Benchmark Under High Batch Concurrency', async () => {
    const BATCH_SIZE = 200;
    const latencies = [];

    console.log(`\n--- Benchmarking Latencies for ${BATCH_SIZE} Parallel Requests ---`);

    const startOverall = Date.now();
    await Promise.all(
      Array.from({ length: BATCH_SIZE }, async (_, i) => {
        const start = Date.now();
        await fetch(`${testEnv.baseUrl}/api/auth/user`);
        latencies.push(Date.now() - start);
      })
    );
    const totalTime = Date.now() - startOverall;

    latencies.sort((a, b) => a - b);
    const min = latencies[0];
    const max = latencies[latencies.length - 1];
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    console.log(`Total Batch Execution Time: ${totalTime}ms`);
    console.log(`Latency Metrics (ms): Min=${min}, Max=${max}, Avg=${avg.toFixed(2)}, p50=${p50}, p95=${p95}, p99=${p99}`);

    assert.ok(p95 < 2000, 'p95 latency under local concurrent batch should be less than 2000ms');
  });

});
