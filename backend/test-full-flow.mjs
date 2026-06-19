/**
 * Full API test flow
 * Run: node test-full-flow.mjs
 * Requires: server running on localhost:5000
 */

const API = 'http://localhost:5000/api';
const ROOT = 'http://localhost:5000';
const UNIQUE = Date.now();

async function api(method, path, data, token) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (data) opts.body = JSON.stringify(data);
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  const url = path.startsWith('/health') ? `${ROOT}${path}` : `${API}${path}`;
  const res = await fetch(url, opts).catch(e => ({ ok: false, status: 0, _error: e.message }));
  const body = res._error ? {} : await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body };
}

async function run() {
  let pass = 0, fail = 0;
  const report = [];

  function check(label, condition) {
    report.push({ label, pass: !!condition });
    condition ? pass++ : fail++;
  }

  // 1. Health check
  console.log('\n1. Health Check');
  const health = await api('GET', '/health');
  check('Health endpoint accessible', health.ok || health.status === 200);

  // 2. Register new candidate (password: uppercase + lowercase + number + special)
  console.log('\n2. Register Candidate');
  const regEmail = `newtest${UNIQUE}@test.com`;
  const reg = await api('POST', '/auth/register', {
    email: regEmail,
    password: 'Password123!',
    confirmPassword: 'Password123!',
    name: 'New Test User',
    role: 'candidate',
  });
  check('Register returns success', reg.body?.success === true);
  if (reg.body?.success) check('Register has user data', !!reg.body?.data?.id || !!reg.body?.data?.user);
  else console.log(`  Register response:`, JSON.stringify(reg.body).slice(0, 300));

  // 3. Login as candidate (existing seed user)
  console.log('\n3. Login as Candidate');
  const login = await api('POST', '/auth/login', { email: 'candidate@test.com', password: 'password123' });
  check('Login returns success', login.body?.success === true);
  check('Has accessToken', !!login.body?.data?.accessToken);
  check('User role is candidate', login.body?.data?.user?.role === 'candidate');
  if (!login.body?.success) console.log('  Login response:', JSON.stringify(login.body).slice(0, 300));
  const candidateToken = login.body?.data?.accessToken;

  // 4. Get candidate profile
  if (candidateToken) {
    console.log('\n4. Get Candidate Profile');
    const profile = await api('GET', '/auth/profile', null, candidateToken);
    check('Profile returns success', profile.body?.success === true);
    check('Profile has email', profile.body?.data?.email === 'candidate@test.com');
    if (!profile.body?.success) console.log('  Profile response:', JSON.stringify(profile.body).slice(0, 300));
  }

  // 5. Login as employer
  console.log('\n5. Login as Employer');
  const empLogin = await api('POST', '/auth/login', { email: 'employer@test.com', password: 'password123' });
  check('Employer login success', empLogin.body?.success === true);
  check('Employer has accessToken', !!empLogin.body?.data?.accessToken);
  check('Employer role is employer', empLogin.body?.data?.user?.role === 'employer');
  if (!empLogin.body?.success) console.log('  Employer login response:', JSON.stringify(empLogin.body).slice(0, 300));
  const employerToken = empLogin.body?.data?.accessToken;

  // 6. Create job (use lowercase enum values for Zod schema)
  if (employerToken) {
    console.log('\n6. Create Job');
    const job = await api('POST', '/jobs', {
      title: 'Software Engineer at TestCo',
      description: 'We are looking for a talented software engineer to build great products for the Ghanaian market and grow our engineering team.',
      category: 'Technology',
      jobType: 'full-time',
      experienceLevel: 'mid-level',
      location: 'Accra, Greater Accra',
      salary: { min: 3000, max: 5000, currency: 'GHS' },
      skills: ['JavaScript', 'Node.js', 'React'],
    }, employerToken);
    check('Job creation success', job.body?.success === true);
    if (!job.body?.success) console.log('  Create job response:', JSON.stringify(job.body).slice(0, 500));
    const jobId = job.body?.data?._id || job.body?.data?.id;
    check('Job has an id', !!jobId);

    if (jobId) {
      console.log(`  Created job ID: ${jobId}`);

      // 7. Publish job first so it's available
      console.log('\n7. Publish Job');
      const publish = await api('POST', `/jobs/${jobId}/publish`, {}, employerToken);
      check('Job publish success', publish.body?.success === true);
      if (!publish.body?.success) console.log('  Publish response:', JSON.stringify(publish.body).slice(0, 300));

      // 8. List jobs (public)
      console.log('\n8. List Jobs (public)');
      const jobs = await api('GET', '/jobs?limit=5');
      check('Jobs list success', jobs.body?.success === true);
      const jobsData = Array.isArray(jobs.body?.data) ? jobs.body.data : (jobs.body?.data?.jobs || []);
      check('Jobs list has items', jobsData.length > 0);

      // 9. Get job by ID
      console.log('\n9. Get Job by ID');
      const jobDetail = await api('GET', `/jobs/${jobId}`);
      check('Job detail success', jobDetail.body?.success === true);
      check('Job title matches', jobDetail.body?.data?.title === 'Software Engineer at TestCo');

      // 10. Submit application
      if (candidateToken) {
        console.log('\n9. Submit Application');
        const app = await api('POST', '/applications', {
          jobId,
          coverLetter: 'I am very interested in this position and believe my skills are a great match for what you are looking for.',
        }, candidateToken);
        check('Application submission success', app.body?.success === true);
        if (!app.body?.success) console.log('  Submit app response:', JSON.stringify(app.body).slice(0, 500));
        const appId = app.body?.data?._id || app.body?.data?.id;
        check('Application has an id', !!appId);

        if (appId) {
          // 11. Get my applications
          console.log('\n11. Get My Applications');
          const myApps = await api('GET', '/applications/me', null, candidateToken);
          check('My apps success', myApps.body?.success === true);
          const myAppsData = Array.isArray(myApps.body?.data) ? myApps.body.data : (myApps.body?.data?.applications || []);
          check('Has applications', myAppsData.length > 0);

          // 12. Employer gets applications
          console.log('\n12. Employer Gets Applications');
          const empApps = await api('GET', '/applications/employer', null, employerToken);
          check('Employer apps success', empApps.body?.success === true);
          const empAppsData = Array.isArray(empApps.body?.data) ? empApps.body.data : (empApps.body?.data?.applications || []);
          check('Employer has apps', empAppsData.length > 0);

          // 14. Update status
          console.log('\n14. Update Application Status');
          const statusUpdate = await api('PATCH', `/applications/${appId}/status`, { status: 'shortlisted' }, employerToken);
          check('Status update success', statusUpdate.body?.success === true);
          if (!statusUpdate.body?.success) console.log('  Status update response:', JSON.stringify(statusUpdate.body).slice(0, 300));
        }
      }

      // 15. Close job
      console.log('\n15. Close Job');
      const close = await api('POST', `/jobs/${jobId}/close`, {}, employerToken);
      check('Job close success', close.body?.success === true);
      if (!close.body?.success) console.log('  Close response:', JSON.stringify(close.body).slice(0, 300));
    }
  }

  // 16. Forgot password
  console.log('\n16. Forgot Password');
  const forgot = await api('POST', '/auth/forgot-password', { email: 'candidate@test.com' });
  check('Forgot password accessible', forgot.ok || forgot.body?.success !== false);
  if (forgot.body?.message) console.log('  Message:', forgot.body.message);

  // Summary
  console.log(`\n${'='.repeat(40)}`);
  report.forEach(r => console.log(`  ${r.pass ? 'PASS' : 'FAIL'}: ${r.label}`));
  console.log(`\nResults: ${pass} passed, ${fail} failed, ${pass + fail} total`);
  console.log(`${'='.repeat(40)}`);
  
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('Test error:', e); process.exit(1); });
