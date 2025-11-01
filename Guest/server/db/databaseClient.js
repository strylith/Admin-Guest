// Database Client Factory
// Returns either mock or real Supabase client based on environment

import mockClient from './mockDatabaseClient.js';
import { supabaseWrapper, getSupabaseService, getSupabaseAnonService } from './supabaseClient.js';

// Determine which client to use
// Only use mock if explicitly enabled
const useMock = process.env.USE_MOCK_DB === 'true';

let realSupabase = null;
let realSupabaseAnon = null;

function initializeRealSupabase() {
  if (!realSupabase) {
    realSupabase = getSupabaseService();
    realSupabaseAnon = getSupabaseAnonService();
  }
}

// Create database client wrapper
function createDatabaseClient() {
  if (useMock) {
    return mockClient;
  }
  
  initializeRealSupabase();
  
  // Return Supabase client with unified interface
  return supabaseWrapper;
}

// Create auth client wrapper
function createAuthClient() {
  if (useMock) {
    return mockClient.auth;
  }
  
  initializeRealSupabase();
  
  return {
    admin: {
      createUser: (userData) => getSupabaseService().auth.admin.createUser(userData),
      deleteUser: (userId) => getSupabaseService().auth.admin.deleteUser(userId),
      getUserById: (userId) => getSupabaseService().auth.admin.getUserById(userId),
      listUsers: () => getSupabaseService().auth.admin.listUsers()
    },
    signInWithPassword: (credentials) => getSupabaseAnonService().auth.signInWithPassword(credentials),
    resetPasswordForEmail: (email, options) => getSupabaseAnonService().auth.resetPasswordForEmail(email, options)
  };
}

// Export clients
export const db = createDatabaseClient();
export const dbAuth = createAuthClient();

// Export factory functions for testing
export { createDatabaseClient, createAuthClient, mockClient };

// Log which client is being used
if (useMock) {
  console.log('🧪 Using MOCK database');
} else {
  console.log('🔗 Using REAL Supabase database');
}

