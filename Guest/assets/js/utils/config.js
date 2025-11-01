// Runtime configuration helpers
// Determines run mode and API base URLs; feature flags for placeholders

export function getRunMode() {
  // Always use real API now that backend uses real Supabase
  return 'api';
}

export function isProduction() {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return !isLocalhost;
}

export function getApiBase() {
  return isProduction()
    ? 'https://kina-resort-main-production.up.railway.app/api'
    : 'http://localhost:3000/api';
}

export function getMockBase() {
  return 'http://localhost:3000/mock';
}

export const FEATURE_FLAGS = {
  ai: false,
  weather: false
};



