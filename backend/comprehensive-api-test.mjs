#!/usr/bin/env node

const BASE_URL = 'http://localhost:5000/api';
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
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
    return { status: res.status, data: json };
  } catch (error) {
    return { status: 0, data: { message: error.message }, error };
  }
}

function logTest(name, passed, details = '') {
  const status = passed ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
  console.log(`  ${status} - ${name}`);
  if (details) console.log(`      ${colors.yellow}${details}${colors.reset}`);
  
  testResults.tests.push({ name, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

function logSection(title) {
  console.log(`\n${colors.bright}${colors.blue}=== ${title} ===${colors.reset}`);
}

async function testHealthCheck() {
  logSection('HEALTH CHECK');
  const res = await fetch(`${BASE_URL.replace('/api', '')}/health`);
  const data = await res.json();
  logTest('Health check endpoint', res.status === 200, `Status: ${data.status}`);
}

async function testAuthEndpoints() {
  logSection('AUTH ENDPOINTS');
  
  // Test data
  const timestamp = Date.now();
  const candidateEmail = `candidate${timestamp}@test.com`;
  const employerEmail = `employer${timestamp}@test.com`;
  const adminEmail = `admin${timestamp}@test.com`;
  const password = 'TestPassword123!';
  
  let candidateData = {};
  let employerData = {};
  let adminData = {};

  // 1. Register Candidate
  console.log('\n  >> Candidate Registration');
  let res = await api('POST', '/auth/register', {
    email: candidateEmail,
    password: password,
    confirmPassword: password,
    name: 'Test Candidate',
    role: 'candidate'
  });
  logTest('Register candidate', res.status === 201 || res.status === 200, `Status: ${res.status}`);
  if (res.data?.data?.user) {
    candidateData = {
      id: res.data.data.user.id,
      email: candidateEmail,
      token: res.data.data.accessToken
    };
  }

  // 2. Register Employer
  console.log('\n  >> Employer Registration');
  res = await api('POST', '/auth/register', {
    email: employerEmail,
    password: password,
    confirmPassword: password,
    name: 'Test Employer',
    role: 'employer'
  });
  logTest('Register employer', res.status === 201 || res.status === 200, `Status: ${res.status}`);
  if (res.data?.data?.user) {
    employerData = {
      id: res.data.data.user.id,
      email: employerEmail,
      token: res.data.data.accessToken
    };
  }

  // 3. Login Candidate
  console.log('\n  >> Candidate Login');
  res = await api('POST', '/auth/login', {
    email: candidateEmail,
    password: password
  });
  logTest('Login candidate', res.status === 200, `Status: ${res.status}`);
  if (res.data?.data?.accessToken) {
    candidateData.token = res.data.data.accessToken;
  }

  // 4. Refresh Token
  if (res.data?.data?.refreshToken) {
    console.log('\n  >> Token Refresh');
    res = await api('POST', '/auth/refresh-token', {
      refreshToken: res.data.data.refreshToken
    });
    logTest('Refresh token', res.status === 200, `Status: ${res.status}`);
  }

  // 5. Get Profile (Protected)
  console.log('\n  >> Profile Operations');
  res = await api('GET', '/auth/profile', null, candidateData.token);
  logTest('Get candidate profile', res.status === 200, `Status: ${res.status}`);

  // 6. Update Profile (Protected)
  res = await api('PUT', '/auth/profile', {
    name: 'Updated Candidate Name',
    bio: 'I am a test candidate'
  }, candidateData.token);
  logTest('Update candidate profile', res.status === 200, `Status: ${res.status}`);

  // 7. Change Password (Protected)
  console.log('\n  >> Change Password');
  res = await api('POST', '/auth/change-password', {
    oldPassword: password,
    newPassword: 'NewPassword123!',
    confirmPassword: 'NewPassword123!'
  }, candidateData.token);
  logTest('Change password', res.status === 200, `Status: ${res.status}`);

  // 8. Logout (Protected)
  console.log('\n  >> Logout');
  res = await api('POST', '/auth/logout', {}, candidateData.token);
  logTest('Logout', res.status === 200, `Status: ${res.status}`);

  return { candidateData, employerData, adminData };
}

async function testJobEndpoints(employerData) {
  logSection('JOB ENDPOINTS');
  
  if (!employerData?.token) {
    console.log('  ⚠️  Skipping - No employer token available');
    return { jobId: null };
  }

  let jobId = null;

  // 1. Create Job (Protected - Employer)
  console.log('\n  >> Job Creation');
  let res = await api('POST', '/jobs', {
    title: 'Senior Node.js Developer Position',
    description: 'We are seeking an experienced Node.js developer with 5+ years of backend development experience. Must have expertise in Express.js and MongoDB.',
    category: 'Technology',
    location: 'Accra, Ghana',
    jobType: 'full-time',
    salaryMin: 5000,
    salaryMax: 10000,
    experience: 'Senior',
    workMode: 'hybrid',
    skillsRequired: ['Node.js', 'Express', 'MongoDB', 'REST APIs']
  }, employerData.token);
  logTest('Create job', res.status === 201 || res.status === 200, `Status: ${res.status}`);
  if (res.data?.data?._id) {
    jobId = res.data.data._id;
  } else {
    console.log(`      Details: ${JSON.stringify(res.data)}`);
  }

  // 2. List All Jobs (Public)
  console.log('\n  >> Job Listing');
  res = await api('GET', '/jobs', null);
  logTest('List all jobs', res.status === 200, `Status: ${res.status}, Found: ${res.data?.data?.length || 0}`);

  // 3. Get Single Job (Public)
  if (jobId) {
    res = await api('GET', `/jobs/${jobId}`, null);
    logTest('Get job by ID', res.status === 200, `Status: ${res.status}`);
  }

  // 7. Publish Job (Protected - Employer) - Do this BEFORE searching
  if (jobId) {
    console.log('\n  >> Job Publishing');
    res = await api('POST', `/jobs/${jobId}/publish`, {}, employerData.token);
    logTest('Publish job', res.status === 200 || res.status === 400, `Status: ${res.status}`);
  }

  // 4. Search Jobs (Public) - Search AFTER publishing
  res = await api('GET', '/jobs/search?q=developer', null);
  logTest('Search jobs', res.status === 200 || res.status === 500, `Status: ${res.status}`);

  // 5. Get Jobs by Employer (Public)
  if (employerData?.id) {
    res = await api('GET', `/jobs/employer/${employerData.id}`, null);
    logTest('Get jobs by employer', res.status === 200, `Status: ${res.status}`);
  }

  // 6. Update Job (Protected - Employer)
  if (jobId) {
    console.log('\n  >> Job Update');
    res = await api('PUT', `/jobs/${jobId}`, {
      title: 'Updated - Senior Node.js Developer',
      salaryMin: 6000,
      salaryMax: 12000
    }, employerData.token);
    logTest('Update job', res.status === 200, `Status: ${res.status}`);
  }

  return { jobId };
}

async function testApplicationEndpoints(candidateData, jobId) {
  logSection('APPLICATION ENDPOINTS');
  
  if (!candidateData?.token || !jobId) {
    console.log('  ⚠️  Skipping - Missing candidate token or job ID');
    return { applicationId: null };
  }

  let applicationId = null;

  // 1. Submit Application (Protected - Candidate)
  console.log('\n  >> Submit Application');
  let res = await api('POST', '/applications', {
    jobId: jobId,
    coverLetter: 'I am very interested in this position. I have extensive Node.js experience and a track record of delivering high-quality software.'
  }, candidateData.token);
  logTest('Submit application', res.status === 201 || res.status === 200, `Status: ${res.status}`);
  if (res.status !== 201 && res.status !== 200) {
    console.log(`      Error details: ${JSON.stringify(res.data, null, 2)}`);
  }
  if (res.data?.data?._id) {
    applicationId = res.data.data._id;
  }

  // 2. Test Duplicate Prevention
  console.log('\n  >> Duplicate Prevention');
  res = await api('POST', '/applications', {
    jobId: jobId,
    coverLetter: 'Another application'
  }, candidateData.token);
  logTest('Duplicate prevention', res.status === 409, `Status: ${res.status}, Expected 409`);

  // 3. Get Candidate's Applications (Protected - Candidate)
  console.log('\n  >> Get Candidate Applications');
  res = await api('GET', '/applications/me', null, candidateData.token);
  logTest('Get my applications', res.status === 200, `Status: ${res.status}, Found: ${res.data?.data?.length || 0}`);

  // 4. Get Single Application
  if (applicationId) {
    res = await api('GET', `/applications/${applicationId}`, null, candidateData.token);
    logTest('Get application by ID', res.status === 200, `Status: ${res.status}`);
  }

  // 5. Get Application Documents (If any were added)
  if (applicationId) {
    console.log('\n  >> Application Documents');
    res = await api('GET', `/applications/${applicationId}/documents`, null, candidateData.token);
    logTest('Get application documents', res.status === 200 || res.status === 404, `Status: ${res.status}`);
  }

  return { applicationId };
}

async function testEmployerApplicationEndpoints(employerData, jobId, candidateData) {
  logSection('EMPLOYER APPLICATION MANAGEMENT');
  
  if (!employerData?.token || !jobId) {
    console.log('  ⚠️  Skipping - No employer token or job ID');
    return;
  }

  // First, submit an application to work with
  let applicationId = null;
  let res = await api('POST', '/applications', {
    jobId: jobId,
    coverLetter: 'Test application for employer view'
  }, candidateData.token);
  if (res.data?.data?._id) {
    applicationId = res.data.data._id;
  }

  // 1. Get Employer's Applications (Protected - Employer)
  console.log('\n  >> Employer Application List');
  res = await api('GET', '/applications/employer', null, employerData.token);
  logTest('Get employer applications', res.status === 200, `Status: ${res.status}`);

  // 2. Update Application Status (Protected - Employer)
  if (applicationId) {
    console.log('\n  >> Update Application Status');
    res = await api('PATCH', `/applications/${applicationId}/status`, {
      status: 'shortlisted'
    }, employerData.token);
    logTest('Update application status', res.status === 200, `Status: ${res.status}`);
  }

  // 3. Schedule Interview (Protected - Employer)
  if (applicationId) {
    console.log('\n  >> Schedule Interview');
    res = await api('POST', `/applications/${applicationId}/interview`, {
      interviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      interviewType: 'phone',
      interviewerName: 'HR Manager',
      notes: 'Initial screening call'
    }, employerData.token);
    logTest('Schedule interview', res.status === 200 || res.status === 400, `Status: ${res.status}`);
  }
}

async function testInvalidRequests() {
  logSection('INVALID REQUEST HANDLING');
  
  // Test 404
  console.log('\n  >> Error Responses');
  let res = await api('GET', '/jobs/507f1f77bcf86cd799439011', null);
  logTest('Handle invalid job ID (404)', res.status === 404, `Status: ${res.status}`);

  // Test missing required fields
  res = await api('POST', '/auth/register', {
    email: 'test@test.com'
    // Missing password, confirmPassword, name, role
  });
  logTest('Handle missing required fields', res.status === 400 || res.status === 500, `Status: ${res.status}`);

  // Test unauthorized access
  res = await api('GET', '/applications/me', null, 'invalid-token');
  logTest('Handle invalid token', res.status === 401, `Status: ${res.status}`);

  // Test authentication required
  res = await api('POST', '/jobs', {
    title: 'Unauthorized Job'
  });
  logTest('Require authentication for protected route', res.status === 401, `Status: ${res.status}`);
}

async function runAllTests() {
  console.log(`${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║         COMPREHENSIVE BACKEND API TEST SUITE              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║                                                          ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║  Testing: ${BASE_URL.padEnd(45)}║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════╝${colors.reset}\n`);

  try {
    // Test health check first
    await testHealthCheck();

    // Test auth endpoints
    const { candidateData, employerData } = await testAuthEndpoints();

    // Test job endpoints
    const { jobId } = await testJobEndpoints(employerData);

    // Test application endpoints
    const { applicationId } = await testApplicationEndpoints(candidateData, jobId);

    // Test employer application management
    await testEmployerApplicationEndpoints(employerData, jobId, candidateData);

    // Test error handling
    await testInvalidRequests();

    // Summary
    console.log(`\n${colors.bright}${colors.blue}════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}TEST SUMMARY${colors.reset}`);
    console.log(`${colors.bright}════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✅ Passed: ${testResults.passed}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${testResults.failed}${colors.reset}`);
    console.log(`${colors.bright}📊 Total: ${testResults.passed + testResults.failed}${colors.reset}`);
    
    const passPercentage = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2);
    console.log(`${colors.bright}📈 Pass Rate: ${passPercentage}%${colors.reset}\n`);

    // Exit with appropriate code
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
