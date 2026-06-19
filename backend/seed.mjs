import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/jobassist';

const seedUsers = [
  {
    email: 'candidate@test.com',
    password: 'password123',
    name: 'Kwasi Mensah',
    role: 'candidate',
    phone: '0244123456',
    gender: 'Male',
    region: 'Greater Accra',
    isEmailVerified: true,
    status: 'active',
  },
  {
    email: 'employer@test.com',
    password: 'password123',
    name: 'Ama Serwaa',
    role: 'employer',
    phone: '0244987654',
    companyName: 'Tech Ghana Ltd',
    isEmailVerified: true,
    status: 'active',
  },
  {
    email: 'admin@test.com',
    password: 'admin12345',
    name: 'Admin User',
    role: 'admin',
    phone: '0244000000',
    isEmailVerified: true,
    status: 'active',
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URL);
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    const existing = await usersCollection.countDocuments();
    console.log(`Existing users: ${existing}`);

    for (const user of seedUsers) {
      const exists = await usersCollection.findOne({ email: user.email });
      if (exists) {
        console.log(`User ${user.email} already exists, skipping`);
        continue;
      }
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const doc = {
        ...user,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await usersCollection.insertOne(doc);
      console.log(`Created user: ${user.email} (${user.role})`);
    }

    console.log('\n--- Test Credentials ---');
    console.log('  Candidate: candidate@test.com / password123');
    console.log('  Employer:  employer@test.com / password123');
    console.log('  Admin:     admin@test.com / admin12345');
    console.log('------------------------\n');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
