#!/usr/bin/env node
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function testApplicationWorkflow() {
  try {
    console.log('=== Testing Application Module Workflow ===\n');

    // 1. Register Candidate
    console.log('1. Registering Candidate...');
    const candRes = await axios.post(`${BASE_URL}/auth/register`, {
      email: `candidate${Date.now()}@test.com`,
      password: 'TestPass123!',
      confirmPassword: 'TestPass123!',
      name: 'Test Candidate',
      role: 'candidate'
    });
    const candToken = candRes.data.data.accessToken;
    const candId = candRes.data.data.user.id;
    console.log(`✅ Candidate registered: ${candId}\n`);

    // 2. Register Employer
    console.log('2. Registering Employer...');
    const empRes = await axios.post(`${BASE_URL}/auth/register`, {
      email: `employer${Date.now()}@test.com`,
      password: 'TestPass123!',
      confirmPassword: 'TestPass123!',
      name: 'Test Employer',
      role: 'employer'
    });
    const empToken = empRes.data.data.accessToken;
    const empId = empRes.data.data.user.id;
    console.log(`✅ Employer registered: ${empId}\n`);

    // 3. Create Job
    console.log('3. Creating Job...');
    const jobRes = await axios.post(`${BASE_URL}/jobs`, {
      title: 'Senior Node.js Developer',
      description: 'We are seeking an experienced Node.js developer with 5+ years of backend development experience.',
      category: 'Technology',
      location: 'Accra, Ghana',
      jobType: 'full-time',
      salaryMin: 5000,
      salaryMax: 10000
    }, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    const jobId = jobRes.data.data._id;
    console.log(`✅ Job created: ${jobId}`);
    console.log(`   Status: ${jobRes.data.data.status}\n`);

    // 4. Publish Job
    console.log('4. Publishing Job...');
    const pubRes = await axios.post(`${BASE_URL}/jobs/${jobId}/publish`, {}, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    console.log(`✅ Job published: ${pubRes.data.data.status}\n`);

    // 5. Submit Application
    console.log('5. Submitting Application...');
    const appRes = await axios.post(`${BASE_URL}/applications`, {
      jobId: jobId,
      coverLetter: 'I am very interested in this position. I have extensive Node.js experience.'
    }, {
      headers: { Authorization: `Bearer ${candToken}` }
    });
    const appId = appRes.data.data._id;
    console.log(`✅ Application submitted: ${appId}`);
    console.log(`   Status: ${appRes.data.data.status}`);
    console.log(`   Stage: ${appRes.data.data.stage}\n`);

    // 6. Test Duplicate Prevention
    console.log('6. Testing Duplicate Prevention...');
    try {
      await axios.post(`${BASE_URL}/applications`, {
        jobId: jobId,
        coverLetter: 'Duplicate attempt'
      }, {
        headers: { Authorization: `Bearer ${candToken}` }
      });
      console.log('❌ FAILED: Duplicate application was allowed!\n');
    } catch (e) {
      if (e.response?.status === 409) {
        console.log(`✅ Duplicate prevention working: ${e.response.data.message}\n`);
      }
    }

    // 7. Get Candidate's Applications
    console.log('7. Getting Candidate Applications...');
    const myAppRes = await axios.get(`${BASE_URL}/applications/me`, {
      headers: { Authorization: `Bearer ${candToken}` }
    });
    console.log(`✅ Found ${myAppRes.data.data.length} applications`);
    console.log(`   Total count: ${myAppRes.data.pagination.total}\n`);

    // 8. Get Employer's Applications
    console.log('8. Getting Employer Applications...');
    const empAppRes = await axios.get(`${BASE_URL}/applications/employer`, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    console.log(`✅ Found ${empAppRes.data.data.length} applications for employer`);
    console.log(`   Total count: ${empAppRes.data.pagination.total}\n`);

    // 9. Update Application Status
    console.log('9. Updating Application Status...');
    const updateRes = await axios.patch(`${BASE_URL}/applications/${appId}/status`, {
      status: 'shortlisted'
    }, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    console.log(`✅ Status updated: ${updateRes.data.data.status}\n`);

    // 10. Schedule Interview
    console.log('10. Scheduling Interview...');
    const interviewRes = await axios.post(`${BASE_URL}/applications/${appId}/interview`, {
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      interviewType: 'technical',
      location: 'Zoom',
      notes: 'Initial technical screening'
    }, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    console.log(`✅ Interview scheduled`);
    console.log(`   Application updated to: ${interviewRes.data.data.status}\n`);

    // 11. Get Application Details
    console.log('11. Getting Application Details...');
    const detailRes = await axios.get(`${BASE_URL}/applications/${appId}`, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    console.log(`✅ Application Details:`);
    console.log(`   ID: ${detailRes.data.data._id}`);
    console.log(`   Candidate: ${detailRes.data.data.candidateId}`);
    console.log(`   Job: ${detailRes.data.data.jobId}`);
    console.log(`   Status: ${detailRes.data.data.status}`);
    console.log(`   Stage: ${detailRes.data.data.stage}`);
    console.log(`   Interviews: ${detailRes.data.data.interviews?.length || 0}\n`);

    console.log('=== All Tests Passed! ✅ ===');
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

testApplicationWorkflow();
