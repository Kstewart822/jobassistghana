import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const client = new MongoClient('mongodb://localhost:27017');

try {
  await client.connect();
  const db = client.db('jobassist');
  const users = db.collection('users');

  // Delete all test users
  await users.deleteMany({ email: { $regex: 'test.*@example.com' } });
  console.log('Deleted old test users');

  // Create new test user with simple password
  const hashedPassword = await bcrypt.hash('password123', 10);
  const result = await users.insertOne({
    email: 'candidate@test.com',
    password: hashedPassword,
    name: 'Test Candidate',
    role: 'candidate',
    createdAt: new Date(),
    updatedAt: new Date(),
    isVerified: true,
    status: 'verified'
  });

  console.log('\n✅ Test user created successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:    candidate@test.com');
  console.log('🔑 Password: password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('User ID:', result.insertedId);
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await client.close();
}
