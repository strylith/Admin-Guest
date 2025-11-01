// Script to create test users in Supabase
// Run with: node server/create-test-users.js

import { supabase } from './config/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

const testUsers = [
  {
    email: 'admin@kinaresort.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  },
  {
    email: 'john@example.com',
    password: 'customer123',
    firstName: 'John',
    lastName: 'Doe',
    role: 'customer'
  },
  {
    email: 'jane@example.com',
    password: 'customer123',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'customer'
  }
];

async function createTestUsers() {
  console.log('🚀 Creating test users in Supabase...\n');

  for (const user of testUsers) {
    try {
      console.log(`Creating user: ${user.email}`);
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          firstName: user.firstName,
          lastName: user.lastName
        }
      });

      if (authError) {
        console.error(`❌ Error creating auth user ${user.email}:`, authError.message);
        continue;
      }

      console.log(`✅ Auth user created: ${authData.user.id}`);

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          member_since: new Date().toISOString(),
          loyalty_points: 0,
          total_bookings: 0
        });

      if (profileError) {
        console.error(`❌ Error creating profile for ${user.email}:`, profileError.message);
        // Try to delete auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        continue;
      }

      console.log(`✅ Profile created for ${user.email}\n`);

    } catch (error) {
      console.error(`❌ Unexpected error for ${user.email}:`, error.message);
    }
  }

  console.log('✨ Done creating test users!');
}

createTestUsers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });














