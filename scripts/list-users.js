import { db } from '../server/utils/db';
import { users } from '../server/database/schema';

async function listUsers() {
  try {
    const allUsers = await db.select().from(users).all();
    console.log('--- Registered Users ---');
    allUsers.forEach(u => {
      console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}`);
    });
    console.log('------------------------');
  } catch (error) {
    console.error('Failed to list users:', error);
  }
}

listUsers();
