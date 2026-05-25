/**
 * Auth Module - Model
 */
export const authSchema = {
  // User collection schema for MongoDB
  users: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['email', 'password', 'role', 'createdAt'],
        properties: {
          _id: { bsonType: 'objectId' },
          email: {
            bsonType: 'string',
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          },
          password: { bsonType: 'string' },
          name: { bsonType: 'string' },
          role: { enum: ['candidate', 'employer', 'admin'] },
          isVerified: { bsonType: 'bool' },
          isActive: { bsonType: 'bool' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  },
};

/**
 * Create indexes for auth collections
 */
export async function createAuthIndexes(db) {
  const usersCollection = db.collection('users');
  
  // Create unique index on email
  await usersCollection.createIndex({ email: 1 }, { unique: true });
  
  // Create index on createdAt for sorting
  await usersCollection.createIndex({ createdAt: -1 });
}

export default { authSchema, createAuthIndexes };
