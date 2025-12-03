// utils.js - Utility functions for the application

// Message display function
function showMessage(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Try to find message element
    let messageEl = document.getElementById('message');
    if (!messageEl) {
        // Create message element if it doesn't exist
        messageEl = document.createElement('div');
        messageEl.id = 'message';
        messageEl.style.padding = '10px';
        messageEl.style.margin = '10px 0';
        messageEl.style.borderRadius = '4px';
        messageEl.style.display = 'none';
        
        // Insert at the top of the body
        document.body.insertBefore(messageEl, document.body.firstChild);
    }
    
    // Set message content and style
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    // Set color based on type
    const colors = {
        success: '#d4edda',
        error: '#f8d7da',
        warning: '#fff3cd',
        info: '#d1ecf1'
    };
    
    const textColors = {
        success: '#155724',
        error: '#721c24',
        warning: '#856404',
        info: '#0c5460'
    };
    
    messageEl.style.backgroundColor = colors[type] || colors.info;
    messageEl.style.color = textColors[type] || textColors.info;
    messageEl.style.border = `1px solid ${textColors[type] || textColors.info}`;
    
    // Auto-hide after 5 seconds for success/info messages
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
}

// Token management
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

// Redirect function
function redirect(url, delay = 0) {
    if (delay > 0) {
        setTimeout(() => {
            window.location.href = url;
        }, delay);
    } else {
        window.location.href = url;
    }
}

// Error handling
function handleApiError(error, defaultMessage = 'An error occurred') {
    console.error('API Error:', error);
    
    if (error.response?.data?.error) {
        return error.response.data.error;
    } else if (error.message) {
        return error.message;
    } else {
        return defaultMessage;
    }
}