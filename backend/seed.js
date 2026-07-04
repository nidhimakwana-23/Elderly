// For Node 18+, global fetch is available.

async function runSeed() {
  const baseUrl = 'http://localhost:3001/api';
  console.log('Seeding data...');

  // 1. Sign up a dummy user to get a token
  let token = '';
  try {
    const signupRes = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test User',
        birthdate: '1980-01-01',
        email: 'test@example.com',w
        
        password: 'password123'
      })
    });
    const signupData = await signupRes.json();
    if (signupRes.ok) {
      token = signupData.token;
      console.log('User registered successfully.');
    } else {
      // Maybe already registered? Let's try to login
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });
      const loginData = await loginRes.json();
      token = loginData.token;
      console.log('User logged in successfully.');
    }
  } catch (error) {
    console.error('Failed to auth:', error.message);
    return;
  }

  if (!token) {
    console.log('No token obtained, aborting.');
    return;
  }

  // 2. Add some medicine logs
  const today = new Date().toISOString().split('T')[0];
  const elderlyId = 'e1'; // We'll just use a dummy ID

  const logs = [
    {
      medicineId: 'm1', elderlyId, medicineName: 'Aspirin', dosage: '1 pill',
      scheduledDate: today, scheduledTime: '08:00', status: 'Taken', takenTime: '08:15'
    },
    {
      medicineId: 'm2', elderlyId, medicineName: 'Metformin', dosage: '500mg',
      scheduledDate: today, scheduledTime: '13:00', status: 'Missed', takenTime: null
    },
    {
      medicineId: 'm3', elderlyId, medicineName: 'Lisinopril', dosage: '10mg',
      scheduledDate: today, scheduledTime: '20:00', status: 'Pending', takenTime: null
    }
  ];

  for (const log of logs) {
    const res = await fetch(`${baseUrl}/medicine-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(log)
    });
    if (res.ok) {
      console.log(`Log created for ${log.medicineName}`);
    } else {
      const err = await res.json();
      console.error(`Failed to create log for ${log.medicineName}:`, err);
    }
  }

  console.log('\n--- Seeding complete! ---');
  console.log(`Elderly ID: ${elderlyId}`);
  console.log(`Bearer Token (for testing API): ${token}`);
  console.log('You can now check the report at:');
  console.log(`GET /api/medicine-report/${elderlyId}`);
}

runSeed();
