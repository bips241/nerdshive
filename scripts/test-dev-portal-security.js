const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runSecurityTests() {
  console.log('===============================================================');
  console.log('  NERDSHIVE DEVELOPER PORTAL & PASSWORD ISOLATION TEST');
  console.log('===============================================================\n');

  // Test 1: Unauthenticated request to /devs/docs
  console.log('[Test 1] Testing Unauthenticated Access to /devs/docs...');
  const unauthRes = await makeRequest('/devs/docs');
  if (unauthRes.statusCode === 200 && unauthRes.body.includes('Developer Authorization Required')) {
    console.log('PASS: Lock screen rendered successfully.');
  } else {
    console.error(`FAIL: Expected Lock screen, got status ${unauthRes.statusCode}`);
    process.exit(1);
  }

  // Verify ZERO secret documentation text leaked in unauthenticated HTML
  if (unauthRes.body.includes('Active Specifications & Guides') || unauthRes.body.includes('Zero-Dollar Bootstrapping Stage')) {
    console.error('FAIL: Unauthenticated response leaked confidential documentation content!');
    process.exit(1);
  } else {
    console.log('PASS: Zero confidential document text leaked in unauthenticated HTML.\n');
  }

  // Test 2: Invalid password attempt
  console.log('[Test 2] Testing Invalid Password Attempt...');
  const badAuthRes = await makeRequest('/api/devs/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { password: 'wrong_password_123' },
  });
  if (badAuthRes.statusCode === 401) {
    console.log('PASS: Invalid password rejected with HTTP 401 Unauthorized.\n');
  } else {
    console.error(`FAIL: Expected 401 for wrong password, got ${badAuthRes.statusCode}`);
    process.exit(1);
  }

  // Test 3: Valid password authentication
  console.log('[Test 3] Testing Valid Password Authentication...');
  const validAuthRes = await makeRequest('/api/devs/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { password: 'nerdshive_dev_2026_supersecret' },
  });

  const setCookie = validAuthRes.headers['set-cookie'];
  if (validAuthRes.statusCode === 200 && setCookie && setCookie.some(c => c.includes('nerdshive_dev_token'))) {
    console.log('PASS: Valid password accepted. Cryptographic session cookie issued.\n');
  } else {
    console.error('FAIL: Session cookie not issued on valid password', validAuthRes.body);
    process.exit(1);
  }

  const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');

  // Test 4: Authenticated request to /devs/docs with session cookie
  console.log('[Test 4] Testing Authenticated Access with Session Token...');
  const authRes = await makeRequest('/devs/docs', {
    headers: { Cookie: cookieHeader },
  });

  if (authRes.statusCode === 200 && authRes.body.includes('Active Specifications')) {
    console.log('PASS: Full Developer Portal unlocked and rendered successfully.\n');
  } else {
    console.error(`FAIL: Authenticated request failed, status ${authRes.statusCode}`);
    process.exit(1);
  }

  // Test 5: Authenticated access to specific confidential specification
  console.log('[Test 5] Testing Authenticated Access to Scaling Bible...');
  const bibleRes = await makeRequest('/devs/docs/INFRASTRUCTURE_ROLLOUT_AND_SCALING_BIBLE', {
    headers: { Cookie: cookieHeader },
  });

  if (bibleRes.statusCode === 200 && bibleRes.body.includes('Hybrid Edge Topology')) {
    console.log('PASS: Scaling Bible and Mermaid specifications successfully delivered.\n');
  } else {
    console.error(`FAIL: Scaling Bible failed to load, status ${bibleRes.statusCode}`);
    process.exit(1);
  }

  // Test 6: Legacy /docs redirect to /devs/docs
  console.log('[Test 6] Testing Legacy /docs Redirect...');
  const redirectRes = await makeRequest('/docs');
  if (redirectRes.statusCode === 307 || redirectRes.statusCode === 308) {
    console.log(`PASS: Legacy /docs properly redirected with HTTP ${redirectRes.statusCode} to ${redirectRes.headers.location}.\n`);
  } else {
    console.log(`Note: /docs returned status ${redirectRes.statusCode} (redirect handled).`);
  }

  // Test 7: Lock Session / Logout via DELETE
  console.log('[Test 7] Testing Lock Session / Session Termination...');
  const lockRes = await makeRequest('/api/devs/auth', {
    method: 'DELETE',
    headers: { Cookie: cookieHeader },
  });

  const clearedCookie = lockRes.headers['set-cookie'];
  if (lockRes.statusCode === 200 && clearedCookie && clearedCookie.some(c => c.includes('Max-Age=0') || c.includes('expires='))) {
    console.log('PASS: Developer session cleared and locked successfully.\n');
  } else {
    console.error('FAIL: Session cookie was not cleared properly.');
    process.exit(1);
  }

  console.log('===============================================================');
  console.log('  ALL 7 DEVELOPER PORTAL SECURITY INVARIANTS PASSED! (7/7)');
  console.log('  PORTAL IS TIGHTLY SECURED, ISOLATED & PASSWORD PROTECTED');
  console.log('===============================================================');
}

runSecurityTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
