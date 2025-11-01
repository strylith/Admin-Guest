// Authentication JavaScript

// Removed register and forgot password functionality
// Account creation is now managed by admin in the dashboard

// User type selection handler
function selectUserType(userType) {
    // Hide user type selection
    document.getElementById('userTypeSelection').style.display = 'none';
    
    // Show login form
    document.getElementById('loginForm').style.display = 'block';
    
    // Update login title based on user type
    const loginTitle = document.getElementById('loginTitle');
    if (userType === 'admin') {
        loginTitle.textContent = 'Admin Login';
    } else {
        loginTitle.textContent = 'Staff Login';
    }
    
    // Set the selected user type
    document.getElementById('userType').value = userType;
}

// Go back to user type selection
function goBackToSelection() {
    // Show user type selection
    document.getElementById('userTypeSelection').style.display = 'block';
    
    // Hide login form
    document.getElementById('loginForm').style.display = 'none';
    
    // Clear form fields
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    document.getElementById('errorMessage').textContent = '';
}

// Login form handler
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const userType = document.getElementById('userType').value;
    const errorDiv = document.getElementById('errorMessage');
    
    // Clear previous errors
    errorDiv.textContent = '';
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, userType })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            errorDiv.textContent = data.error || 'Login failed';
            return;
        }
        
        // Store user session info
        sessionStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect based on role
        if (data.user.role === 'admin') {
            window.location.href = '/admin-dashboard.html';
        } else {
            window.location.href = '/staff-dashboard.html';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'An error occurred. Please try again.';
    }
});

// Register and Forgot Password removed - now managed by admin

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const eyeIcon = button.querySelector('.eye-icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        // Eye closed/off icon
        eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
    } else {
        input.type = 'password';
        // Eye open icon
        eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
    }
}

// Check if user is already logged in
window.addEventListener('load', () => {
    fetch('/api/me')
        .then(res => res.json())
        .then(data => {
            if (data.user) {
                // Redirect to appropriate dashboard
                if (data.user.role === 'admin') {
                    window.location.href = '/admin-dashboard.html';
                } else {
                    window.location.href = '/staff-dashboard.html';
                }
            }
        })
        .catch(() => {
            // User not logged in, stay on login page
        });
});
