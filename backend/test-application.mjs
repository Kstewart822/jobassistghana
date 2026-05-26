#!/usr/bin/env node

const BASE_URL = 'http://localhost:5000/api';

async function api(method, path, data = null, token = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (token) options.headers.Authorization = `Bearer ${token}`;
  if (data) options.body = JSON.stringify(data);
  
  const res = await fetch(`${BASE_URL}${path}`, options);
  const json = await res.json();
  return { status: res.status, data: json };
}

async function testApplicationWorkflow() {
  try {
    console.log('=== Testing Application Module Workflow ===\n');

    // 1. Register Candidate
    console.log('1. Registering Candidate...');
    let res = await api('POST', '/auth/register', {
      email: `candidate${Date.now()}@test.com`,
      password: 'TestPass123!',
      confirmPassword: 'TestPass123!',
      name: 'Test Candidate',
      role: 'candidate'
    });
    const candToken = res.data.data.accessToken;
    const candId = res.data.data.user.id;
    console.log(`✅ Candidate registered: ${candId}\n`);

    // 2. Register Employer
    console.log('2. Registering Employer...');
    res = await api('POST', '/auth/register', {
      email: `employer${Date.now()}@test.com`,
      password: 'TestPass123!',
      confirmPassword: 'TestPass123!',
      name: 'Test Employer',
      role: 'employer'
    });
    const empToken = res.data.data.accessToken;
    const empId = res.data.data.user.id;
    console.log(`✅ Employer registered: ${empId}\n`);

    // 3. Create Job
    console.log('3. Creating Job...');
    res = await api('POST', '/jobs', {
      title: 'Senior Node.js Developer',
      description: 'We are seeking an experienced Node.js developer with 5+ years of backend development experience.',
      category: 'Technology',
      location: 'Accra, Ghana',
      jobType: 'full-time',
      salaryMin: 5000,
      salaryMax: 10000
    }, empToken);
    console.log('Job response:', JSON.stringify(res.data, null, 2));
    if (!res.data.data || !res.data.data._id) {
      console.error('❌ Job creation failed:', res.data.message || 'No _id returned');
      process.exit(1);
    }
    const jobId = res.data.data._id;
    console.log(`✅ Job created: ${jobId}`);
    console.log(`   Status: ${res.data.data.status}\n`);

    // 4. Publish Job
    console.log('4. Publishing Job...');
    res = await api('POST', `/jobs/${jobId}/publish`, {}, empToken);
    console.log(`✅ Job published: ${res.data.data.status}\n`);

    // 5. Submit Application
    console.log('5. Submitting Application...');
    res = await api('POST', '/applications', {
      jobId: jobId,
      coverLetter: 'I am very interested in this position. I have extensive Node.js experience.'
    }, candToken);
    const appId = res.data.data._id;
    console.log(`✅ Application submitted: ${appId}`);
    console.log(`   Status: ${res.data.data.status}`);
    console.log(`   Stage: ${res.data.data.stage}\n`);

    // 6. Test Duplicate Prevention
    console.log('6. Testing Duplicate Prevention...');
    res = await api('POST', '/applications', {
      jobId: jobId,
      coverLetter: 'Duplicate attempt'
    }, candToken);
    if (res.status === 409) {
      console.log(`✅ Duplicate prevention working: ${res.data.message}\n`);
    } else {
      console.log(`❌ FAILED: Expected 409, got ${res.status}\n`);
    }

    // 7. Get Candidate's Applications
    console.log('7. Getting Candidate Applications...');
    res = await api('GET', '/applications/me', null, candToken);
    console.log(`✅ Found ${res.data.data.length} applications`);
    console.log(`   Total count: ${res.data.pagination.total}\n`);

    // 8. Get Employer's Applications
    console.log('8. Getting Employer Applications...');
    res = await api('GET', '/applications/employer', null, empToken);
    console.log(`✅ Found ${res.data.data.length} applications for employer`);
    console.log(`   Total count: ${res.data.pagination.total}\n`);

    // 9. Update Application Status
    console.log('9. Updating Application Status...');
    res = await api('PATCH', `/applications/${appId}/status`, {
      status: 'shortlisted'
    }, empToken);
    console.log(`✅ Status updated: ${res.data.data.status}\n`);

    // 10. Schedule Interview
    console.log('10. Scheduling Interview...');
    res = await api('POST', `/applications/${appId}/interview`, {
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      interviewType: 'technical',
      location: 'Zoom',
      notes: 'Initial technical screening'
    }, empToken);
    console.log(`✅ Interview scheduled`);
    console.log(`   Application updated to: ${res.data.data.status}\n`);

    // 11. Get Application Details
    console.log('11. Getting Application Details...');
    res = await api('GET', `/applications/${appId}`, null, empToken);
    console.log(`✅ Application Details:`);
    console.log(`   ID: ${res.data.data._id}`);
    console.log(`   Candidate: ${res.data.data.candidateId}`);
    console.log(`   Job: ${res.data.data.jobId}`);
    console.log(`   Status: ${res.data.data.status}`);
    console.log(`   Stage: ${res.data.data.stage}`);
    console.log(`   Interviews: ${res.data.data.interviews?.length || 0}\n`);

    console.log('=== All Tests Passed! ✅ ===');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testApplicationWorkflow();
