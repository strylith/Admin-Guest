// AI API Configuration
// This file contains all AI-related configuration settings

// =============================================================================
// AI API CONFIGURATION
// =============================================================================
// OpenRouter API Configuration

export const AI_CONFIG = {
  // API Key - OpenRouter API key
  // Get your API key from: https://openrouter.ai/keys
  API_KEY: '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',
  
  // AI Model Version - OpenRouter model
  // Using GPT-4o-mini for fast, cost-effective responses
  MODEL: 'openai/gpt-4o-mini',
  
  // API Endpoint - OpenRouter's API endpoint (OpenAI-compatible)
  API_ENDPOINT: 'https://openrouter.ai/api/v1/chat/completions',
  
  // System prompt for the AI assistant
  SYSTEM_PROMPT: `You are Kina Resort's AI assistant located in Island Province, Philippines. You help guests with resort information, bookings, and inquiries.

ACCOMMODATIONS & PRICING:
- ROOMS (₱1,500/night, 4 units available): Standard Room (4 guests), Ocean View Room (4 guests), Deluxe Suite (6 guests), Premium King (7 guests)
- COTTAGES (day use only): Open Cottage (₱300, 8 guests), Standard Cottage (₱400, 8 guests), Family Cottage (₱500, 8 guests)
- FUNCTION HALLS (₱10,000+): Grand Function Hall (100 guests), Intimate Function Hall (100 guests)

ENTRANCE FEES (pool access):
- Adults: Morning ₱70, Night ₱120
- Kids: Morning ₱60, Night ₱100, 1 year old FREE
- Height-based pricing available

DINING OPTIONS:
- Breakfast: ₱800/person
- Lunch Special: ₱1,200/person
- Dinner Experience: ₱1,800/person
- All-Day Dining: ₱2,500/person

ACTIVITIES:
- Water Sports Package: ₱1,500/person
- Island Tour: ₱2,000/person
- Spa Treatment: ₱1,800/person

AMENITIES:
- Infinity pool with 15-meter water slide and pool playground
- Tropical gardens and beach access
- Air-conditioned rooms with private bathrooms
- Modern resort facilities

OPERATING HOURS:
- Pool: Monday-Friday 6:00 AM-10:00 PM, Saturday 6:00 AM-6:00 PM
- Closed on Sundays

SPECIAL OFFERS:
- 10% discount for groups of 4+ guests and children
- Extra function hall chairs/tables: ₱70

Be friendly, helpful, and professional. Keep responses concise and accurate. Direct guests to our booking system for reservations.`,
  
  // API Request Settings
  MAX_TOKENS: 500,
  TEMPERATURE: 0.7,
  MAX_HISTORY: 10, // Keep last 10 messages for context
};

// =============================================================================
// MOCK RESPONSES FOR DEVELOPMENT
// =============================================================================
// These responses are used when API is not configured or fails
// Remove this section when using real API

export const MOCK_RESPONSES = {
  'hello': 'Hello! Welcome to Kina Resort in Island Province, Philippines. How can I help you today?',
  'booking': 'I can help you with bookings! We offer rooms (₱1,500/night), cottages (₱300-₱500/day), function halls (₱10,000+), pool access (entrance fees from ₱70), dining packages, and activities. What are you interested in?',
  'weather': 'The weather at Kina Resort is typically tropical and sunny. You can check our weather page for current conditions and forecasts.',
  'amenities': 'We have an infinity pool with 15-meter water slide, pool playground, tropical gardens, beach access, air-conditioned rooms, dining options, and water sports. What would you like to know more about?',
  'pricing': 'Rooms: ₱1,500/night. Cottages: ₱300-₱500/day. Entrance: Adult ₱70-₱120, Kids ₱60-₱100. Function halls: ₱10,000+. Dining: ₱800-₱2,500/person. We offer 10% off for groups of 4+ guests!',
  'contact': 'You can reach us through our website or visit our resort. We\'re located in Island Province, Philippines. Pool hours: Mon-Fri 6AM-10PM, Sat 6AM-6PM, Closed Sundays.',
  'default': 'I\'m here to help with your Kina Resort inquiries. Ask me about accommodations, pricing, amenities, operating hours, or bookings!'
};

// =============================================================================
// API INTEGRATION FUNCTIONS
// =============================================================================

// Check if API is properly configured
export function isAPIConfigured() {
  const hasValidKey = AI_CONFIG.API_KEY && AI_CONFIG.API_KEY.startsWith('sk-or-v1-');
  const hasValidEndpoint = AI_CONFIG.API_ENDPOINT && AI_CONFIG.API_ENDPOINT.includes('openrouter.ai');
  
  // Only log in debug mode
  if (localStorage.getItem('DEBUG_AI') === 'true') {
    console.log('API Configuration Check:');
    console.log('- API_KEY:', AI_CONFIG.API_KEY ? 'Present' : 'Missing');
    console.log('- API_ENDPOINT:', AI_CONFIG.API_ENDPOINT);
    console.log('- Has valid key:', hasValidKey);
    console.log('- Has valid endpoint:', hasValidEndpoint);
    console.log('- Final result:', hasValidKey && hasValidEndpoint);
  }
  
  return hasValidKey && hasValidEndpoint;
}

// Get mock response for development
export function getMockResponse(userMessage) {
  const message = userMessage.toLowerCase();
  
  // Check for keywords and return appropriate response
  if (message.includes('hello') || message.includes('hi')) {
    return MOCK_RESPONSES.hello;
  } else if (message.includes('book') || message.includes('reservation')) {
    return MOCK_RESPONSES.booking;
  } else if (message.includes('weather')) {
    return MOCK_RESPONSES.weather;
  } else if (message.includes('amenities') || message.includes('facilities')) {
    return MOCK_RESPONSES.amenities;
  } else if (message.includes('price') || message.includes('cost')) {
    return MOCK_RESPONSES.pricing;
  } else if (message.includes('contact') || message.includes('reach')) {
    return MOCK_RESPONSES.contact;
  } else {
    return MOCK_RESPONSES.default;
  }
}

// =============================================================================
// SETUP INSTRUCTIONS
// =============================================================================
/*
SETUP INSTRUCTIONS:

1. API KEY SETUP:
   - Go to https://openrouter.ai/keys
   - Sign up and create a new API key
   - Replace placeholder with your actual API key

2. MODEL SELECTION:
   - 'openai/gpt-4o-mini': Fast, cost-effective general chat model
   - Other models available via OpenRouter platform

3. API ENDPOINT:
   - Uses OpenRouter's official API, compatible with OpenAI format

4. TESTING:
   - The system will use mock responses if API is not configured
   - Test with mock responses first, then configure API
   - Check browser console for API errors

5. SECURITY:
   - Never commit API keys to version control
   - Use environment variables in production
   - Consider using a backend proxy for API calls in production             
*/