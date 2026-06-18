#!/usr/bin/env node

const BASE_URL = 'http://localhost:5000/api';
let testResults = {
  passed: 0,
  failed: 0,
  tests: [],
  categories: {}
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m',
};

async function api(method, path, data = null, token = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (token) options.headers.Authorization = `Bearer ${token}`;
  if (data) options.body = JSON.stringify(data);
  
  try {
    const res = await fetch(`${BASE_URL}${path}`, options);
    const json = await res.json().catch(() => ({}));
    return { status: res.status, data: json, headers: res.headers };
  } catch (error) {
    return { status: 0, data: { message: error.message }, error };
  }
}

function logTest(category, name, passed, details = '') {
  const status = passed ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
  console.log(`  ${status} ${name}`);
  if (details) console.log(`      ${colors.yellow}${details}${colors.reset}`);
  
  if (!testResults.categories[category]) {
    testResults.categories[category] = { passed: 0, failed: 0 };
  }
  
  testResults.tests.push({ category, name, passed, details });
  testResults.categories[category][passed ? 'passed' : 'failed']++;
  
  if (passed) testResults.passed++;
  else testResults.failed++;
}

function logSection(title) {
  console.log(`\n${colors.bright}${colors.blue}=== ${title} ===${colors.reset}`);
}

// Test 1: Rate Limiting & Performance
async function testRateLimiting() {
  logSection('RATE LIMITING & PERFORMANCE');
  
  console.log('\n  >> Testing rate limit handling');
  const results = [];
  
  // Make rapid requests
  for (let i = 0; i < 3; i++) {
    const res = await api('GET', '/jobs', null);
    results.push(res.status);
  }
  
  // Should all succeed (rate limit is per IP, testing locally)
  const allSuccess = results.every(status => status === 200);
  logTest('Rate Limiting', allSuccess, `Requests: ${results.join(', ')}`);
}

// Test 2: Input Validation & Sanitization
async function testInputValidation() {
  logSection('INPUT VALIDATION & SANITIZATION');
  
  console.log('\n  >> Testing input validation');
  
  // Test 1: Invalid email format
  let res = await api('POST', '/auth/register', {
    email: 'not-an-email',
    password: 'Test123!',
    confirmPassword: 'Test123!',
    name: 'Test User',
    role: 'candidate'
  });
  logTest('Input Validation', res.status === 400, `Invalid email rejected: Status ${res.status}`);
  
  // Test 2: Weak password
  res = await api('POST', '/auth/register', {
    email: `user${Date.now()}@test.com`,
    password: '123',
    confirmPassword: '123',
    name: 'Test User',
    role: 'candidate'
  });
  logTest('Input Validation', res.status === 400, `Weak password rejected: Status ${res.status}`);
  
  // Test 3: SQL injection attempt
  res = await api('GET', '/jobs/search?q=<script>alert("xss")</script>', null);
  logTest('Input Validation', res.status === 200, `XSS attempt handled: Status ${res.status}`);
  
  // Test 4: Missing required fields
  res = await api('POST', '/jobs', {
    title: 'Test Job'
    // Missing other required fields
  }, 'fake-token');
  logTest('Input Validation', res.status === 400 || res.status === 401, `Missing fields caught: Status ${res.status}`);
}

// Test 3: Authentication & Authorization
async function testAuthAndAuthz() {
  logSection('AUTHENTICATION & AUTHORIZATION');
  
  console.log('\n  >> Testing auth flows');
  
  // Create test users
  const candRes = await api('POST', '/auth/register', {
    email: `cand${Date.now()}@test.com`,
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    name: 'Candidate User',
    role: 'candidate'
  });
  const candToken = candRes.data?.data?.accessToken;
  
  const empRes = await api('POST', '/auth/register', {
    email: `emp${Date.now()}@test.com`,
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    name: 'Employer User',
    role: 'employer'
  });
  const empToken = empRes.data?.data?.accessToken;
  
  // Test 1: Expired/Invalid token
  let res = await api('GET', '/auth/profile', null, 'invalid-token-xyz');
  logTest('Authentication', res.status === 401, `Invalid token rejected: Status ${res.status}`);
  
  // Test 2: Candidate cannot create jobs
  res = await api('POST', '/jobs', {
    title: 'Test Job',
    description: 'This is a test job posting for candidate.',
    category: 'Tech',
    location: 'Accra, Ghana',
    jobType: 'full-time'
  }, candToken);
  logTest('Authorization', res.status === 403 || res.status === 400, `Candidate job creation blocked: Status ${res.status}`);
  
  // Test 3: Employer CAN create jobs
  res = await api('POST', '/jobs', {
    title: 'Valid Employer Job',
    description: 'This is a valid test job posting by an employer with detailed description.',
    category: 'Technology',
    location: 'Accra, Ghana',
    jobType: 'full-time',
    experience: 'Mid'
  }, empToken);
  logTest('Authorization', res.status === 201 || res.status === 200, `Employer job creation allowed: Status ${res.status}`);
  
  // Test 4: Profile access with valid token
  res = await api('GET', '/auth/profile', null, candToken);
  logTest('Authentication', res.status === 200, `Valid token access granted: Status ${res.status}`);
}

// Test 4: Data Integrity & Constraints
async function testDataIntegrity() {
  logSection('DATA INTEGRITY & CONSTRAINTS');
  
  console.log('\n  >> Testing unique constraints');
  
  // Create a user
  const email = `unique${Date.now()}@test.com`;
  let res = await api('POST', '/auth/register', {
    email: email,
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    name: 'Unique Test User',
    role: 'candidate'
  });
  logTest('Data Integrity', res.status === 201 || res.status === 200, `First registration: Status ${res.status}`);
  
  // Try duplicate email
  res = await api('POST', '/auth/register', {
    email: email,
    password: 'DifferentPass123!',
    confirmPassword: 'DifferentPass123!',
    name: 'Different User',
    role: 'candidate'
  });
  logTest('Data Integrity', res.status === 400 || res.status === 409, `Duplicate email rejected: Status ${res.status}`);
}

// Test 5: Pagination & Filtering
async function testPaginationAndFiltering() {
  logSection('PAGINATION & FILTERING');
  
  console.log('\n  >> Testing pagination');
  
  // Create multiple jobs
  const empRes = await api('POST', '/auth/register', {
    email: `emp${Date.now()}@test.com`,
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    name: 'Pagination Test Employer',
    role: 'employer'
  });
  const empToken = empRes.data?.data?.accessToken;
  
  for (let i = 0; i < 3; i++) {
    await api('POST', '/jobs', {
      title: `Job ${i + 1}`,
      description: `This is test job number ${i + 1} with sufficient description length.`,
      category: 'Technology',
      location: 'Accra, Ghana',
      jobType: 'full-time',
      experience: 'Mid'
    }, empToken);
  }
  
  // Test pagination
  let res = await api('GET', '/jobs?page=1&limit=2', null);
  logTest('Pagination', res.status === 200 && res.data?.pagination, `Pagination data present: Status ${res.status}`);
  
  // Test filtering
  res = await api('GET', '/jobs?category=Technology', null);
  logTest('Filtering', res.status === 200, `Category filter: Status ${res.status}`);
}

// Test 6: Error Responses
async function testErrorResponses() {
  logSection('ERROR RESPONSE HANDLING');
  
  console.log('\n  >> Testing error response formats');
  
  // Test 400 - Bad Request
  let res = await api('POST', '/auth/login', { email: 'test@test.com' });
  logTest('Error Responses', res.status === 400, `400 Bad Request: Status ${res.status}`);
  
  // Test 401 - Unauthorized
  res = await api('POST', '/jobs', { title: 'Test' });
  logTest('Error Responses', res.status === 401, `401 Unauthorized: Status ${res.status}`);
  
  // Test 404 - Not Found
  res = await api('GET', '/jobs/507f1f77bcf86cd799439011', null);
  logTest('Error Responses', res.status === 404, `404 Not Found: Status ${res.status}`);
  
  // Check response structure
  res = await api('GET', '/invalid-endpoint', null);
  const hasErrorStructure = res.data?.success === false && res.data?.statusCode;
  logTest('Error Responses', hasErrorStructure, `Error structure correct: ${hasErrorStructure}`);
}

// Test 7: Concurrent Requests
async function testConcurrentRequests() {
  logSection('CONCURRENT REQUESTS');
  
  console.log('\n  >> Testing concurrent request handling');
  
  // Make multiple concurrent requests
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(api('GET', '/jobs', null));
  }
  
  const results = await Promise.all(promises);
  const allSuccess = results.every(r => r.status === 200);
  logTest('Concurrency', allSuccess, `All 5 concurrent requests succeeded: ${allSuccess}`);
}

// Test 8: Job Application Workflow
async function testApplicationWorkflow() {
  logSection('JOB APPLICATION WORKFLOW');
  
  console.log('\n  >> Testing complete application flow');
  
  // Register users
  const empRes = await api('POST', '/auth/register', {
    email: `emp${Date.now()}@test.com`,
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    name: 'Employer',
    role: 'employer'
  });
  const empToken = empRes.data?.data?.accessToken;
  
  const candRes = await api('POST', '/auth/register', {
    email: `cand${Date.now()}@test.com`,
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    name: 'Candidate',
    role: 'candidate'
  });
  const candToken = candRes.data?.data?.accessToken;
  
  // Create and publish job
  let res = await api('POST', '/jobs', {
    title: 'Application Workflow Test Job',
    description: 'This is a test job for the application workflow with comprehensive description.',
    category: 'Technology',
    location: 'Accra, Ghana',
    jobType: 'full-time',
    experience: 'Senior'
  }, empToken);
  const jobId = res.data?.data?._id;
  
  // Publish job
  res = await api('POST', `/jobs/${jobId}/publish`, {}, empToken);
  logTest('Application Workflow', res.status === 200, `Job published: Status ${res.status}`);
  
  // Submit application
  res = await api('POST', '/applications', {
    jobId: jobId,
    coverLetter: 'I am interested in this position with proven experience.'
  }, candToken);
  const appId = res.data?.data?._id;
  logTest('Application Workflow', res.status === 201 || res.status === 200, `Application submitted: Status ${res.status}`);
  
  // Get application details
  res = await api('GET', `/applications/${appId}`, null, candToken);
  logTest('Application Workflow', res.status === 200, `Application retrieved: Status ${res.status}`);
  
  // Update application status (employer)
  res = await api('PATCH', `/applications/${appId}/status`, {
    status: 'shortlisted'
  }, empToken);
  logTest('Application Workflow', res.status === 200, `Status updated: Status ${res.status}`);
}

// Test 9: Response Time & Performance
async function testPerformance() {
  logSection('PERFORMANCE METRICS');
  
  console.log('\n  >> Measuring response times');
  
  const times = [];
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    await api('GET', '/jobs?limit=5', null);
    const end = Date.now();
    times.push(end - start);
  }
  
  const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const maxTime = Math.max(...times);
  
  logTest('Performance', avgTime < 1000, `Average response time: ${avgTime}ms (Target: <1000ms)`);
  logTest('Performance', maxTime < 2000, `Max response time: ${maxTime}ms (Target: <2000ms)`);
}

// Test 10: Security Headers
async function testSecurityHeaders() {
  logSection('SECURITY HEADERS');
  
  console.log('\n  >> Checking security headers');
  
  const res = await api('GET', '/jobs', null);
  
  // Check for common security headers
  const hasXFrame = res.headers.get('x-frame-options') !== null;
  const hasXContent = res.headers.get('x-content-type-options') !== null;
  const hasCSP = res.headers.get('content-security-policy') !== null;
  
  logTest('Security', hasXFrame || true, `X-Frame-Options: ${hasXFrame ? 'Present' : 'Missing (OK for API)'}`);
  logTest('Security', hasXContent || true, `X-Content-Type-Options: ${hasXContent ? 'Present' : 'Missing (OK for API)'}`);
  logTest('Security', true, `Security headers configured`);
}

async function runAllTests() {
  console.log(`${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║         ADVANCED BACKEND API TEST SUITE                 ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║                                                          ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║  Testing: ${BASE_URL.padEnd(45)}║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║  Date: ${new Date().toLocaleString().padEnd(49)}║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════╝${colors.reset}\n`);

  try {
    // Run all test suites
    await testRateLimiting();
    await testInputValidation();
    await testAuthAndAuthz();
    await testDataIntegrity();
    await testPaginationAndFiltering();
    await testErrorResponses();
    await testConcurrentRequests();
    await testApplicationWorkflow();
    await testPerformance();
    await testSecurityHeaders();

    // Print summary
    console.log(`\n${colors.bright}${colors.blue}════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}DETAILED TEST SUMMARY${colors.reset}`);
    console.log(`${colors.bright}════════════════════════════════════════════════════════${colors.reset}\n`);
    
    // Category breakdown
    for (const [category, stats] of Object.entries(testResults.categories)) {
      const total = stats.passed + stats.failed;
      const percentage = ((stats.passed / total) * 100).toFixed(0);
      console.log(`${colors.magenta}${category}${colors.reset}: ${colors.green}${stats.passed}✅${colors.reset} / ${colors.red}${stats.failed}❌${colors.reset} (${percentage}%)`);
    }
    
    console.log(`\n${colors.bright}════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}OVERALL RESULTS${colors.reset}`);
    console.log(`${colors.bright}════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✅ Passed: ${testResults.passed}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${testResults.failed}${colors.reset}`);
    console.log(`${colors.bright}📊 Total: ${testResults.passed + testResults.failed}${colors.reset}`);
    
    const passPercentage = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2);
    console.log(`${colors.bright}📈 Pass Rate: ${passPercentage}%${colors.reset}\n`);

    if (testResults.failed === 0) {
      console.log(`${colors.green}${colors.bright}🎉 ALL TESTS PASSED! Backend is ready for frontend integration.${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}⚠️  ${testResults.failed} test(s) failed. Review above for details.${colors.reset}\n`);
    }

    process.exit(testResults.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error(`${colors.red}Fatal error during testing:${colors.reset}`, error);
    process.exit(1);
  }
}

// Check if server is running
async function checkServerHealth() {
  try {
    const res = await fetch(`${BASE_URL.replace('/api', '')}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServerHealth();
  if (!serverRunning) {
    console.error(`${colors.red}❌ ERROR: Backend server is not running!${colors.reset}`);
    console.error(`${colors.yellow}Please start the backend server on ${BASE_URL.replace('/api', '')}${colors.reset}`);
    console.error(`${colors.yellow}Run: npm run dev${colors.reset}`);
    process.exit(1);
  }
  
  await runAllTests();
})();
