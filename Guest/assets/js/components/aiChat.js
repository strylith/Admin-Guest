// AI Chatbot functionality
// This file handles the AI chat popup and API integration

import { AI_CONFIG, isAPIConfigured, getMockResponse } from '../config/aiConfig.js';

// =============================================================================
// AI CHAT STATE MANAGEMENT
// =============================================================================
let isAIChatOpen = false;
let chatHistory = []; // For display purposes
let apiHistory = []; // Separate history for API context to avoid format conflicts

// =============================================================================
// AI CHAT UI FUNCTIONS
// =============================================================================

// Open AI chat popup
function openAIChat() {
  console.log('Opening AI chat...');
  const chatPopup = document.getElementById('ai-chat-popup');
  const aiButton = document.getElementById('resort-ai');
  const notification = document.getElementById('ai-notification');
  
  if (chatPopup) {
    console.log('Chat popup found, showing...');
    chatPopup.style.display = 'flex';
    setTimeout(() => {
      chatPopup.classList.add('show');
      console.log('Chat popup should be visible now');
    }, 10);
    isAIChatOpen = true;
    
    // Hide FAB when chat is open
    if (aiButton) {
      aiButton.classList.add('hidden');
    }
    
    // Hide notification when chat is open
    if (notification) {
      notification.style.display = 'none';
    }
  } else {
    console.error('Chat popup element not found!');
  }
}

// Close AI chat popup
function closeAIChat() {
  console.log('Closing AI chat...');
  const chatPopup = document.getElementById('ai-chat-popup');
  const aiButton = document.getElementById('resort-ai');
  
  if (chatPopup) {
    chatPopup.classList.remove('show');
    setTimeout(() => {
      chatPopup.style.display = 'none';
      console.log('Chat popup hidden');
    }, 300);
    isAIChatOpen = false;
    
    // Show FAB when chat is closed
    if (aiButton) {
      aiButton.classList.remove('hidden');
    }
  } else {
    console.error('Chat popup element not found for closing!');
  }
}

// Handle Enter key press in chat input
function handleAIChatKeypress(event) {
  if (event.key === 'Enter') {
    sendAIMessage();
  }
}

// Send message to AI
async function sendAIMessage() {
  console.log('sendAIMessage called');
  const input = document.getElementById('ai-chat-input');
  const messagesContainer = document.getElementById('ai-chat-messages');
  
  if (!input || !messagesContainer) {
    console.error('Input or messages container not found');
    return;
  }
  
  const message = input.value.trim();
  if (!message) {
    console.log('No message to send');
    return;
  }
  
  console.log('Sending message:', message);
  
  // Clear input
  input.value = '';
  
  // Add user message to chat
  addMessageToChat(message, 'user');
  
  // Show typing indicator
  const typingId = addTypingIndicator();
  
  try {
    console.log('Calling getAIResponse...');
    // Get AI response
    const response = await getAIResponse(message);
    console.log('AI Response received:', response);
    
    // Remove typing indicator
    removeTypingIndicator(typingId);
    
    // Add AI response to chat
    addMessageToChat(response, 'ai');
    
  } catch (error) {
    console.error('AI Chat Error:', error);
    
    // Remove typing indicator
    removeTypingIndicator(typingId);
    
    // Add error message
    addMessageToChat('Sorry, there was an error. Please try again.', 'ai');
  }
}

// Add message to chat interface
function addMessageToChat(message, sender) {
  const messagesContainer = document.getElementById('ai-chat-messages');
  if (!messagesContainer) return;
  
  const messageGroup = document.createElement('div');
  messageGroup.className = `message-group ${sender === 'user' ? 'user-message-group' : 'ai-message-group'}`;
  
  const avatar = sender === 'user' ? '👤' : '🤖';
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  messageGroup.innerHTML = `
    <div class="message-avatar">
      <div class="avatar-img">${avatar}</div>
    </div>
    <div class="message-bubble ${sender === 'user' ? 'user-message-bubble' : 'ai-message-bubble'}">
      <div class="message-text">
        <p>${message}</p>
      </div>
      <div class="message-time">${currentTime}</div>
    </div>
  `;
  
  messagesContainer.appendChild(messageGroup);
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  // Add to display chat history
  chatHistory.push({ message, sender, timestamp: new Date() });
}

// Add typing indicator
function addTypingIndicator() {
  const messagesContainer = document.getElementById('ai-chat-messages');
  if (!messagesContainer) return null;
  
  const typingId = 'typing-' + Date.now();
  const typingDiv = document.createElement('div');
  typingDiv.id = typingId;
  typingDiv.className = 'message-group ai-message-group typing-indicator';
  
  typingDiv.innerHTML = `
    <div class="message-avatar">
      <div class="avatar-img">🤖</div>
    </div>
    <div class="message-bubble ai-message-bubble">
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  
  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  return typingId;
}

// Remove typing indicator
function removeTypingIndicator(typingId) {
  if (!typingId) return;
  
  const typingElement = document.getElementById(typingId);
  if (typingElement) {
    typingElement.remove();
  }
}

// =============================================================================
// AI API INTEGRATION
// =============================================================================

// Get AI response from API
async function getAIResponse(userMessage) {
  console.log('Getting AI response for:', userMessage);
  
  // Check if API is configured
  if (!isAPIConfigured()) {
    console.log('API not configured, using mock response');
    return getMockResponse(userMessage);
  }
  
  // Add user message to API history
  apiHistory.push({ role: 'user', content: userMessage });
  
  // Limit history to prevent token overflow
  if (apiHistory.length > AI_CONFIG.MAX_HISTORY * 2) {
    apiHistory = apiHistory.slice(-(AI_CONFIG.MAX_HISTORY * 2));
  }
  
  try {
    console.log('Sending request to OpenRouter API...');
    
    // Construct full messages array with system prompt and history
    const messages = [
      { role: 'system', content: AI_CONFIG.SYSTEM_PROMPT },
      ...apiHistory
    ];
    
    const response = await fetch(AI_CONFIG.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: AI_CONFIG.MODEL,
        messages: messages,
        max_tokens: AI_CONFIG.MAX_TOKENS,
        temperature: AI_CONFIG.TEMPERATURE
      })
    });
    
    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('API response data:', data);
    
    const aiResponse = data.choices?.[0]?.message?.content?.trim() || 'No response received.';
    
    // Add assistant response to API history
    apiHistory.push({ role: 'assistant', content: aiResponse });
    
    return aiResponse;
    
  } catch (error) {
    console.error('AI API Error:', error);
    
    // Remove failed user message from history
    apiHistory.pop();
    
    return `Sorry, there was an error processing your request: ${error.message}. Please try again.`;
  }
}


// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize AI chat when DOM is loaded
function initializeAIChat() {
  // Only log in debug mode
  if (localStorage.getItem('DEBUG_AI') === 'true') {
    console.log('Initializing AI chat...');
    console.log('AI_CONFIG:', AI_CONFIG);
    console.log('isAPIConfigured():', isAPIConfigured());
  }
  
  // Add click event to AI button
  const aiButton = document.getElementById('resort-ai');
  if (aiButton) {
    if (localStorage.getItem('DEBUG_AI') === 'true') {
      console.log('AI button found, adding click handler');
    }
    // Remove any existing onclick handlers
    aiButton.removeAttribute('onclick');
    aiButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('AI button clicked, isAIChatOpen:', isAIChatOpen);
      if (isAIChatOpen) {
        closeAIChat();
      } else {
        openAIChat();
      }
    });
  } else {
    console.error('AI button not found!');
  }
  
  // Prevent chat popup from closing when clicking inside it
  const chatPopup = document.getElementById('ai-chat-popup');
  if (chatPopup) {
    chatPopup.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
  
  // Close chat when clicking outside of it
  document.addEventListener('click', function(e) {
    if (isAIChatOpen && chatPopup && !chatPopup.contains(e.target) && !aiButton.contains(e.target)) {
      closeAIChat();
    }
  });
  
  // CSS is now handled in the main stylesheet
}

// Test API connection function
async function testAPIConnection() {
  if (!isAPIConfigured()) {
    console.log('API not configured, skipping test');
    return;
  }
  
  try {
    console.log('Testing API connection...');
    const response = await fetch(AI_CONFIG.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: AI_CONFIG.MODEL,
        messages: [
          { role: 'system', content: AI_CONFIG.SYSTEM_PROMPT },
          { role: 'user', content: 'Hello, this is a test.' }
        ]
      })
    });
    
    console.log('Test response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API connection successful!', data);
    } else {
      const errorText = await response.text();
      console.log('❌ API connection failed:', response.status, errorText);
    }
  } catch (error) {
    console.log('❌ API connection error:', error.message);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeAIChat);

// Also try to initialize after a short delay in case DOMContentLoaded already fired
setTimeout(initializeAIChat, 100);

// Test API connection after a delay
setTimeout(testAPIConnection, 500);

// Minimize AI chat
function minimizeAIChat() {
  console.log('Minimizing AI chat...');
  closeAIChat();
}

// Export functions for global access
window.openAIChat = openAIChat;
window.closeAIChat = closeAIChat;
window.minimizeAIChat = minimizeAIChat;
window.handleAIChatKeypress = handleAIChatKeypress;
window.sendAIMessage = sendAIMessage;