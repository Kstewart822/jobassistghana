import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const client = new MongoClient('mongodb://localhost:27017');

try {
  await client.connect();
  const db = client.db('jobassist');
  const users = db.collection('users');

  // Delete existing test user
  const deleteResult = await users.deleteOne({ email: 'testcandidate@example.com' });
  console.log('Deleted old test user(s):', deleteResult.deletedCount);

  // Create new test user
  const hashedPassword = await bcrypt.hash('TestPassword123', 10);
  const result = await users.insertOne({
    email: 'testcandidate@example.com',
    password: hashedPassword,
    name: 'Test Candidate',
    role: 'candidate',
    createdAt: new Date(),
    updatedAt: new Date(),
    isVerified: true
  });

  console.log('✅ Created new test user:', result.insertedId);
  console.log('📧 Email: testcandidate@example.com');
  console.log('🔑 Password: TestPassword123');
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await client.close();
}
