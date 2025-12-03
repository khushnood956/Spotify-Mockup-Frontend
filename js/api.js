// api.js - Complete API configuration and methods

// ============================================
// API Configuration
// ============================================
// const API_BASE = 'http://localhost:8082/api'; // Change this to match your backend port
const API_BASE = 'https://spotify-backend-production-681b.up.railway.app/api'; // Change this to match your backend port

// ============================================
// Utility Functions
// ============================================
const utils = {
    getToken: () => {
        return localStorage.getItem('jwtToken');
    },
    
    setToken: (token) => {
        localStorage.setItem('jwtToken', token);
    },
    
    removeToken: () => {
        localStorage.removeItem('jwtToken');
    },
    
    isAuthenticated: () => {
        return !!utils.getToken();
    }
};

// ============================================
// Generic API Call Function with Timeout
// ============================================
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = utils.getToken();
    
    const defaultHeaders = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };
    
    // Add timeout to prevent hanging on large datasets
    const timeout = options.timeout || 30000; // 30 seconds default
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        console.log(`📡 API Call: ${options.method || 'GET'} ${url}`);
        const response = await fetch(url, {
            ...config,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Handle different response types
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = { message: text };
            }
        }
        
        if (!response.ok) {
            return {
                success: false,
                error: data.message || data.error || `HTTP ${response.status}`,
                data: data,
                status: response.status
            };
        }
        
        return {
            success: true,
            data: data,
            status: response.status
        };
        
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            console.error('❌ API call timeout - request took too long');
            return {
                success: false,
                error: 'Request timeout - dataset too large. Please use pagination.',
                status: 408
            };
        }
        
        // Enhanced error messages for common issues
        let errorMessage = error.message;
        let userFriendlyMessage = '';
        
        if (error.message.includes('Failed to fetch')) {
            userFriendlyMessage = '🔴 Backend server is not responding. Please check:\n' +
                                 '1. Backend server is running (Railway deployment)\n' +
                                 '2. CORS is configured in backend\n' +
                                 '3. Network connection is stable';
            console.error('🔴 BACKEND DOWN OR CORS ISSUE');
            console.error('Backend URL:', API_BASE);
            console.error('Attempted URL:', url);
        } else if (error.message.includes('NetworkError') || error.message.includes('CORS')) {
            userFriendlyMessage = '🔴 CORS Error: Backend is not allowing requests from this domain.\n' +
                                 'Add this to your backend:\n' +
                                 '@CrossOrigin(origins = "*") or configure WebMvcConfigurer';
        }
        
        console.error('❌ API call failed:', error);
        if (userFriendlyMessage) {
            console.error(userFriendlyMessage);
        }
        
        return {
            success: false,
            error: errorMessage,
            userFriendlyError: userFriendlyMessage,
            status: 0
        };
    }
}

// ============================================
// Authentication API
// ============================================
const authAPI = {
    login: async (credentials) => {  // Accept credentials object
        return await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)  // Send the whole object
        });
    },
    
    register: async (userData) => {
        return await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },
    
    validate: async () => {
        return await apiCall('/auth/validate', {
            method: 'GET'
        });
    },
    
    // Logout
    logout: async () => {
        utils.removeToken();
        return { success: true };
    }
};

// ============================================
// Songs API
// ============================================
const songsAPI = {
    // Get all songs with pagination (MANDATORY for large datasets)
    getAll: async (page = 0, size = 10) => {
        return await apiCall(`/songs?page=${page}&size=${size}`, {
            method: 'GET',
            timeout: 60000 // 60 seconds for large datasets
        });
    },
    
    // Get song by ID
    getById: async (songId) => {
        return await apiCall(`/songs/${songId}`, {
            method: 'GET'
        });
    },
    
    // Play song (increment play count)
    play: async (songId) => {
        return await apiCall(`/songs/${songId}/play`, {
            method: 'POST'
        });
    },
    
    // Search songs
    search: async (query) => {
        return await apiCall(`/songs/search?q=${encodeURIComponent(query)}`, {
            method: 'GET'
        });
    }
};

// ============================================
// Playlists API
// ============================================
const playlistsAPI = {
    // Create a new playlist
    create: async (playlistData) => {
        return await apiCall('/playlists', {
            method: 'POST',
            body: JSON.stringify(playlistData)
        });
    },

    // Get all playlists for current user with pagination (MANDATORY for large datasets)
    getAll: async (page = 0, size = 10) => {
        return await apiCall(`/playlists?page=${page}&size=${size}`, {
            method: 'GET'
        });
    },

    // Get playlist by ID
    getById: async (playlistId) => {
        return await apiCall(`/playlists/${playlistId}`, {
            method: 'GET'
        });
    },

    // Update playlist
    update: async (playlistId, updateData) => {
        return await apiCall(`/playlists/${playlistId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    },

    // Delete playlist
    delete: async (playlistId) => {
        return await apiCall(`/playlists/${playlistId}`, {
            method: 'DELETE'
        });
    },
    
    // Add song to playlist
    addSong: async (playlistId, songId) => {
        console.log('📤 Adding song to playlist:', { playlistId, songId });
        return await apiCall(`/playlists/${playlistId}/songs/${songId}`, {
            method: 'POST'
        });
    },
    
    // Add multiple songs to playlist
    addSongs: async (playlistId, songIds) => {
        console.log('📤 Adding multiple songs to playlist:', { playlistId, songIds });
        return await apiCall(`/playlists/${playlistId}/songs`, {
            method: 'POST',
            body: JSON.stringify({ songIds: songIds })
        });
    },
    
    // Remove song from playlist
    removeSong: async (playlistId, songId) => {
        return await apiCall(`/playlists/${playlistId}/songs/${songId}`, {
            method: 'DELETE'
        });
    }
};

// ============================================
// Admin API
// ============================================
const adminAPI = {
    // Get admin statistics
    getStats: async () => {
        return await apiCall('/admin/stats', {
            method: 'GET'
        });
    },
    
    // Get all users
    getAllUsers: async () => {
        return await apiCall('/admin/users', {
            method: 'GET'
        });
    },
    
    // Delete user
    deleteUser: async (userId) => {
        return await apiCall(`/admin/users/${userId}`, {
            method: 'DELETE'
        });
    }
};

// ============================================
// Artists API
// ============================================
const artistsAPI = {
    // Get all artists with pagination (MANDATORY for large datasets)
    getAll: async (page = 0, size = 10) => {
        return await apiCall(`/artists?page=${page}&size=${size}`, {
            method: 'GET',
            timeout: 60000 // 60 seconds for large datasets
        });
    },
    
    // Get artist by ID
    getById: async (artistId) => {
        return await apiCall(`/artists/${artistId}`, {
            method: 'GET'
        });
    },
    
    // Get artist's songs
    getSongs: async (artistId) => {
        return await apiCall(`/artists/${artistId}/songs`, {
            method: 'GET'
        });
    }
};

// ============================================
// Albums API
// ============================================
const albumsAPI = {
    // Get all albums
    getAll: async () => {
        return await apiCall('/albums', {
            method: 'GET'
        });
    },
    
    // Get album by ID
    getById: async (albumId) => {
        return await apiCall(`/albums/${albumId}`, {
            method: 'GET'
        });
    },
    
    // Get album's songs
    getSongs: async (albumId) => {
        return await apiCall(`/albums/${albumId}/songs`, {
            method: 'GET'
        });
    }
};

// ============================================
// // Export for use in other files
// // ============================================
// console.log('✅ API module loaded');
// console.log('🌐 API Base URL:', API_BASE);


// Make available globally
window.authAPI = authAPI;
window.utils = utils;

console.log('✅ API module loaded');