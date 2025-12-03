// Add these utility functions at the top:
function showMessage(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Try to show message in UI
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 3000);
        }
    } else {
        // Fallback to alert
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

function setToken(token) {
    localStorage.setItem('jwtToken', token);
    console.log('✅ Token stored');
}

function getToken() {
    return localStorage.getItem('jwtToken');
}

function removeToken() {
    localStorage.removeItem('jwtToken');
    console.log('✅ Token removed');
}

function redirect(url, delay = 0) {
    if (delay > 0) {
        setTimeout(() => {
            window.location.href = url;
        }, delay);
    } else {
        window.location.href = url;
    }
}
// Check if user is already logged in - FIXED VERSION
async function checkAuthStatus() {
    const token = localStorage.getItem('jwtToken');
    
    console.log('🔐 Checking auth status...');
    console.log('📝 Token exists:', !!token);
    
    // Only check auth status if we're on login/register pages
    const isLoginPage = window.location.pathname.includes('login.html');
    const isRegisterPage = window.location.pathname.includes('register.html');
    
    if (!isLoginPage && !isRegisterPage) {
        console.log('🔐 Not on auth page - skipping auto-redirect');
        return;
    }
    
    if (!token) {
        console.log('🔐 No token found - user needs to login');
        return; // Don't make API call if no token
    }

    console.log('🔐 On auth page with token - validating...');
    
    try {
        const result = await authAPI.validate();
        
        if (result.success && result.data.valid) {
            console.log('✅ User is authenticated - redirecting to dashboard');
            const user = result.data;
            
            // Small delay to avoid immediate redirect
            setTimeout(() => {
                // Database uses lowercase roles
                const userRole = (user.role || 'user').toLowerCase();
                if (userRole === 'admin') {
                    redirect('admin-dashboard.html');
                } else {
                    redirect('user-dashboard.html');
                }
            }, 500);
        } else {
            console.log('❌ Token invalid, clearing storage');
            removeToken();
        }
    } catch (error) {
        console.log('❌ Error validating token:', error);
        removeToken();
    }
}

// Handle login form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(loginForm);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        console.log('🔐 Attempting login with:', credentials);

        try {
            const result = await authAPI.login(credentials);

            if (result.success) {
                console.log('✅ Login successful!');
                
                // Store the JWT token
                setToken(result.data.token);
                showMessage('Login successful! Redirecting...', 'success');
                
                // Redirect based on user role (database uses lowercase)
                const userRole = (result.data.role || 'user').toLowerCase();
                console.log('👤 User role:', userRole);
                
                if (userRole === 'admin') {
                    redirect('admin-dashboard.html', 1500);
                } else {
                    redirect('user-dashboard.html', 1500);
                }
            } else {
                console.log('❌ Login failed:', result);
                
                // Enhanced error message display
                let errorMsg = result.error || 'Login failed';
                
                if (result.userFriendlyError) {
                    errorMsg = result.userFriendlyError;
                } else if (result.status === 0) {
                    errorMsg = '🔴 Backend Server Error\n\n' +
                              'The backend server is not responding. This could be due to:\n\n' +
                              '1. Server is down (Railway deployment stopped)\n' +
                              '2. CORS not configured in backend\n' +
                              '3. Network connectivity issues\n\n' +
                              'Backend URL: ' + API_BASE + '\n\n' +
                              'Please check your Railway logs and ensure:\n' +
                              '- Spring Boot app is running\n' +
                              '- CORS is enabled with @CrossOrigin\n' +
                              '- Database connection is working';
                } else if (result.status === 502) {
                    errorMsg = '🔴 Bad Gateway (502)\n\n' +
                              'Backend server crashed or is not responding.\n' +
                              'Check Railway logs for errors.';
                }
                
                showMessage(errorMsg, 'error');
                
                // Show alert for critical errors
                if (result.status === 0 || result.status === 502) {
                    alert(errorMsg);
                }
            }
        } catch (error) {
            console.log('❌ Login error:', error);
            const errorMsg = '🔴 Connection Failed\n\n' +
                           'Cannot connect to backend server.\n\n' +
                           'Backend URL: ' + API_BASE + '\n\n' +
                           'Error: ' + (error.message || 'Unknown error');
            showMessage(errorMsg, 'error');
            alert(errorMsg);
        }
    });
}

// Handle register form
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(registerForm);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        // Client-side validation
        if (password !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            showMessage('Password must be at least 6 characters', 'error');
            return;
        }

        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: password,
            displayName: formData.get('displayName') || formData.get('username'),
            role: formData.get('role') || 'USER' // Get role from form, default to USER
        };

        console.log('👤 Attempting registration with:', userData);

        try {
            const result = await authAPI.register(userData);

            if (result.success) {
                console.log('✅ Registration successful!');
                
                // Store the JWT token
                setToken(result.data.token);
                showMessage('Registration successful! Redirecting...', 'success');
                
                // Redirect based on user role (database uses lowercase)
                const userRole = (result.data.role || userData.role || 'user').toLowerCase();
                console.log('👤 Registered user role:', userRole);
                
                if (userRole === 'admin') {
                    redirect('admin-dashboard.html', 1500);
                } else {
                    redirect('user-dashboard.html', 1500);
                }
            } else {
                console.log('❌ Registration failed');
                showMessage(result.data?.error || result.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.log('❌ Registration error:', error);
            showMessage('Registration failed: ' + (error.message || 'Unknown error'), 'error');
        }
    });
}

// Backend health check
async function checkBackendHealth() {
    console.log('🏥 Checking backend health...');
    console.log('📍 Backend URL:', API_BASE);
    
    try {
        // Try multiple endpoints silently
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(API_BASE + '/health', { 
            method: 'GET', 
            mode: 'cors',
            signal: controller.signal 
        }).catch(() => 
            fetch(API_BASE + '/auth/health', { 
                method: 'GET', 
                mode: 'cors',
                signal: controller.signal 
            })
        ).catch(() => 
            fetch(API_BASE, { 
                method: 'GET', 
                mode: 'cors',
                signal: controller.signal 
            })
        );
        
        clearTimeout(timeoutId);
        
        if (response && response.ok) {
            console.log('✅ Backend is healthy');
            return true;
        }
    } catch (error) {
        // Only log, don't throw
        console.warn('🔴 Backend health check failed (this is normal on first load):', error.message);
    }
    
    // Don't show warning banner immediately - user might still be able to login
    return false;
}

// Check auth status on login/register pages
if (window.location.pathname.includes('login.html') || 
    window.location.pathname.includes('register.html')) {
    checkAuthStatus();
    
    // Check backend health
    setTimeout(() => {
        checkBackendHealth();
    }, 1000);
}

// Manual login as different user
window.loginAsDifferentUser = function() {
    console.log('🔄 Login as different user requested');
    
    removeToken();
    
    // Clear the form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.reset();
    }
    
    // Show message
    showMessage('Please enter new credentials', 'info');
    
    console.log('✅ Ready for new login');
};

// Global logout function
// Add this to auth.js (replace existing logout function)

// Global logout function - ENHANCED VERSION
// Replace the existing logout function with this:

// Global logout function - ENHANCED AND DEBUGGABLE
// ============================================
// Global Functions
// ============================================

// Global logout function
window.logout = function() {
    console.log('👋 LOGOUT: Function called');
    
    // Clear all authentication data
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    
    console.log('✅ All auth data cleared');
    
    // Show confirmation
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.textContent = 'Logging out...';
        messageEl.className = 'message info';
        messageEl.style.display = 'block';
    }
    
    // Redirect to login page
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 500);
};

// Emergency logout
window.emergencyLogout = function() {
    console.log('🚨 EMERGENCY LOGOUT');
    localStorage.clear();
    window.location.href = 'login.html';
};

console.log('✅ API module loaded');
console.log('✅ Logout function available:', typeof window.logout === 'function');

// Emergency logout that always works
window.emergencyLogout = function() {
    console.log('🚨 EMERGENCY LOGOUT: Called');
    localStorage.clear();
    window.location.href = 'login.html';
};

// Alternative logout function that's more visible
window.forceLogout = function() {
    if (confirm('Are you sure you want to logout?')) {
        window.logout();
    }
};

// Make sure utils functions are available globally for HTML onclick events
window.showMessage = showMessage;
window.setToken = setToken;
window.removeToken = removeToken;
window.redirect = redirect;

// Add this at the VERY END of auth.js:

// Make all functions globally available
window.showMessage = showMessage;
window.setToken = setToken;
window.getToken = getToken;
window.removeToken = removeToken;
window.redirect = redirect;
window.logout = logout; // This line is crucial!
window.emergencyLogout = emergencyLogout;
window.loginAsDifferentUser = window.loginAsDifferentUser;

console.log('✅ Auth module loaded');
console.log('✅ Logout function:', typeof window.logout);