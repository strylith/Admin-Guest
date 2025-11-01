// Real Supabase Client Wrapper
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let supabaseClient = null;
let supabaseAnonClient = null;

export function getSupabaseService() {
  if (!supabaseClient) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }
    
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'kina'
        }
      }
    );
  }
  return supabaseClient;
}

export function getSupabaseAnonService() {
  if (!supabaseAnonClient) {
    if (!process.env.SUPABASE_URL) {
      throw new Error('Missing SUPABASE_URL');
    }
    
    supabaseAnonClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'kina'
        }
      }
    );
  }
  return supabaseAnonClient;
}

// Export as object with from method
export const supabaseWrapper = {
  get from() {
    return (table) => getSupabaseService().from(table);
  },
  auth: {
    admin: {
      createUser: (userData) => getSupabaseService().auth.admin.createUser(userData),
      deleteUser: (userId) => getSupabaseService().auth.admin.deleteUser(userId),
      getUserById: (userId) => getSupabaseService().auth.admin.getUserById(userId),
      listUsers: () => getSupabaseService().auth.admin.listUsers()
    },
    signInWithPassword: (credentials) => getSupabaseAnonService().auth.signInWithPassword(credentials),
    resetPasswordForEmail: (email, options) => getSupabaseAnonService().auth.resetPasswordForEmail(email, options)
  }
};

export default supabaseWrapper;

