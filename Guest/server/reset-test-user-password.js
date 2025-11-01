// Script to reset password for a test user in Supabase Auth
// Run with: node server/reset-test-user-password.js

import { getSupabase } from './config/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = getSupabase();

async function resetUserPassword(email, newPassword) {
  console.log(`🔄 Resetting password for: ${email}`);
  
  try {
    // First, get the user
    const { data: users, error: findError } = await supabase.auth.admin.listUsers();
    
    if (findError) {
      console.error('❌ Error finding users:', findError);
      return;
    }
    
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ User ${email} not found`);
      return;
    }
    
    console.log(`📧 Found user: ${user.email}`);
    console.log(`🆔 User ID: ${user.id}`);
    
    // Update the user's password
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        password: newPassword,
        email_confirm: true
      }
    );
    
    if (error) {
      console.error('❌ Error resetting password:', error);
      return;
    }
    
    console.log(`✅ Password successfully reset for ${email}`);
    console.log(`   New password: ${newPassword}`);
    
    return data;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Test credentials - reset all three users
async function resetAllTestUsers() {
  console.log('🚀 Resetting test user passwords...\n');
  
  const users = [
    { email: 'john@example.com', password: 'customer12345' },
    { email: 'jane@example.com', password: 'customer12345' },
    { email: 'admin@kinaresort.com', password: 'admin12345678' }
  ];
  
  for (const user of users) {
    await resetUserPassword(user.email, user.password);
    console.log('');
  }
  
  console.log('✨ All passwords reset!');
  console.log('\nTest credentials:');
  users.forEach(u => {
    console.log(`  ${u.email} / ${u.password}`);
  });
}

resetAllTestUsers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


