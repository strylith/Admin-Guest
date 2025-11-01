import { createClient } from '@supabase/supabase-js';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Database connection (PostgreSQL or Supabase)
let dbConnection = null;
let connectionType = 'supabase'; // 'supabase' or 'postgres'

// Parse PostgreSQL connection string
function parseDatabaseUrl(url) {
  if (!url) return null;
  
  try {
    const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!match) return null;
    
    return {
      user: match[1],
      password: match[2],
      host: match[3],
      port: parseInt(match[4]),
      database: match[5],
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  } catch (error) {
    console.error('Error parsing database URL:', error);
    return null;
  }
}

// Initialize database connection - Always use Supabase JS client
export async function initializeDatabase() {
  console.log('🔗 Initializing Supabase connection...');
  connectionType = 'supabase';
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)');
  }
  
  dbConnection = createClient(
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
  
  console.log('✅ Supabase connection established');
  return dbConnection;
}

// Get the database connection
export function getDbConnection() {
  if (!dbConnection) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbConnection;
}

export function getConnectionType() {
  return connectionType;
}

// Export Supabase clients for backward compatibility
let supabaseClient = null;
let supabaseAnonClient = null;

export function getSupabase() {
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

export function getSupabaseAnon() {
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

// Export as object getters (lazy initialization)
export const supabase = {
  get value() { return getSupabase(); }
};

export const supabaseAnon = {
  get value() { return getSupabaseAnon(); }
};

// For routes that call supabase directly, create wrapper
export function getSupabaseWrapper() {
  return {
    ...getSupabase(),
    auth: {
      ...getSupabase().auth,
      admin: {
        ...getSupabase().auth.admin
      }
    }
  };
}

// Default export
export default getSupabase;

