// Admin Dashboard JavaScript
// API_BASE is defined in api.js - using that instead

// Chart instances
let genreChartInstance = null;
let artistChartInstance = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Dashboard Initializing...');
    
    // Check authentication - use jwtToken (the actual key used by auth.js)
    const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
    
    if (!token) {
        console.warn('No token found, redirecting to login');
        window.location.href = 'login.html';
        return;
    }
    
    // Validate token and get user role from API
    validateAndInitialize(token);
});

// Validate token and initialize dashboard
async function validateAndInitialize(token) {
    try {
        const response = await fetch(`${API_BASE}/auth/validate`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('Token validation failed');
            localStorage.clear();
            window.location.href = 'login.html';
            return;
        }
        
        const userData = await response.json();
        console.log('User data:', userData);
        
        const userRole = userData.role || userData.userRole || '';
        
        // Check if user is admin (case insensitive)
        if (userRole.toLowerCase() !== 'admin') {
            console.warn('User is not admin, redirecting to user dashboard');
            window.location.href = 'user-dashboard.html';
            return;
        }
        
        console.log('Admin authenticated, loading dashboard...');
        
        // Initialize dashboard
        initializeDashboard();
        
    } catch (error) {
        console.error('Error validating token:', error);
        // Don't redirect on network error - just try to load dashboard
        console.log('Attempting to load dashboard anyway...');
        initializeDashboard();
    }
}

// Initialize the dashboard
async function initializeDashboard() {
    try {
        // Load stats tab by default
        openTab('stats');
        
        // Load initial data
        await loadDashboardStats();
        
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
}

// Tab switching function
function openTab(tabName) {
    console.log('Opening tab:', tabName);
    
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });
    
    // Remove active class from all buttons
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
        selectedTab.style.display = 'block';
        console.log('Tab shown:', tabName);
    } else {
        console.error('Tab not found:', tabName);
    }
    
    // Add active class to clicked button
    const activeBtn = document.querySelector(`[onclick="openTab('${tabName}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Load data based on tab
    switch(tabName) {
        case 'stats':
            loadDashboardStats();
            break;
        case 'users':
            loadUsers();
            break;
        case 'content':
            loadContent();
            break;
        case 'system':
            console.log('System settings tab opened');
            break;
    }
}

// Admin fetch with authentication
async function adminFetch(url, options = {}) {
    const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
    
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    const response = await fetch(url, mergedOptions);
    
    if (response.status === 401 || response.status === 403) {
        console.error('Authentication failed');
        localStorage.clear();
        window.location.href = 'login.html';
        throw new Error('Authentication failed');
    }
    
    return response;
}

// Load dashboard statistics
async function loadDashboardStats() {
    console.log('Loading dashboard stats...');
    
    try {
        const response = await adminFetch(`${API_BASE}/admin/stats`);
        const stats = await response.json();
        
        console.log('Stats received:', stats);
        
        // Update stat cards
        updateStatCard('totalUsers', stats.totalUsers || 0);
        updateStatCard('totalSongs', stats.totalSongs || 0);
        updateStatCard('totalArtists', stats.totalArtists || 0);
        updateStatCard('totalAlbums', stats.totalAlbums || 0);
        updateStatCard('totalPlaylists', stats.totalPlaylists || 0);
        updateStatCard('activeUsers', stats.activeToday || 0);
        
        // Load chart data
        await loadGenreData();
        await loadArtistData();
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update stat card value
function updateStatCard(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
        console.log(`Updated ${id}: ${value}`);
    } else {
        console.error(`Element not found: ${id}`);
    }
}

// Load genre distribution data
async function loadGenreData() {
    console.log('Loading genre data...');
    
    try {
        const response = await adminFetch(`${API_BASE}/admin/stats/genres`);
        const data = await response.json();
        
        console.log('Genre data received:', data);
        
        // Handle different response formats
        let genreArray = [];
        
        if (data.topGenres && Array.isArray(data.topGenres)) {
            // Format: { topGenres: [...] }
            genreArray = data.topGenres;
        } else if (data.artistGenres && Array.isArray(data.artistGenres)) {
            // Format: { artistGenres: [...] }
            genreArray = data.artistGenres;
        } else if (Array.isArray(data)) {
            // Direct array format
            genreArray = data;
        }
        
        console.log('Processed genre array:', genreArray);
        
        if (genreArray && genreArray.length > 0) {
            createGenreChart(genreArray);
        } else {
            console.warn('No genre data available');
        }
    } catch (error) {
        console.error('Error loading genre data:', error);
    }
}

// Load top artists data
async function loadArtistData() {
    console.log('Loading artist data...');
    
    try {
        const response = await adminFetch(`${API_BASE}/admin/stats/artists`);
        const data = await response.json();
        
        console.log('Artist data received:', data);
        
        // Handle different response formats
        let artistArray = [];
        
        if (data.topArtists && Array.isArray(data.topArtists)) {
            // Format: { topArtists: [...] }
            artistArray = data.topArtists;
        } else if (data.artists && Array.isArray(data.artists)) {
            // Format: { artists: [...] }
            artistArray = data.artists;
        } else if (Array.isArray(data)) {
            // Direct array format
            artistArray = data;
        }
        
        console.log('Processed artist array:', artistArray);
        
        if (artistArray && artistArray.length > 0) {
            createArtistChart(artistArray);
        } else {
            console.warn('No artist data available');
        }
    } catch (error) {
        console.error('Error loading artist data:', error);
    }
}

// Create Genre Pie Chart using Chart.js
function createGenreChart(data) {
    console.log('Creating genre chart with data:', data);
    
    const canvas = document.getElementById('genrePieChart');
    if (!canvas) {
        console.error('genrePieChart canvas not found!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if any
    if (genreChartInstance) {
        genreChartInstance.destroy();
    }
    
    // Prepare data - handle different formats
    let labels = [];
    let values = [];
    
    data.forEach(item => {
        // Try different property names
        labels.push(item.genre || item.name || item.artistGenre || 'Unknown');
        values.push(item.count || item.songCount || item.value || 0);
    });
    
    console.log('Chart labels:', labels);
    console.log('Chart values:', values);
    
    // Colors for pie chart
    const colors = [
        '#1DB954', // Spotify green
        '#1ed760',
        '#b3b3b3',
        '#535353',
        '#191414',
        '#ff6b6b',
        '#4ecdc4',
        '#45b7d1',
        '#96ceb4',
        '#ffeaa7'
    ];
    
    genreChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#121212',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 12
                        },
                        padding: 15
                    }
                },
                title: {
                    display: false
                }
            }
        }
    });
    
    console.log('Genre chart created successfully');
}

// Create Artist Bar Chart using Chart.js
function createArtistChart(data) {
    console.log('Creating artist chart with data:', data);
    
    const canvas = document.getElementById('artistBarChart');
    if (!canvas) {
        console.error('artistBarChart canvas not found!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if any
    if (artistChartInstance) {
        artistChartInstance.destroy();
    }
    
    // Prepare data (take top 5)
    const topArtists = data.slice(0, 5);
    let labels = [];
    let values = [];
    
    topArtists.forEach(item => {
        labels.push(item.artistName || item.name || 'Unknown');
        values.push(item.playCount || item.plays || item.count || 0);
    });
    
    console.log('Artist chart labels:', labels);
    console.log('Artist chart values:', values);
    
    artistChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Play Count',
                data: values,
                backgroundColor: 'rgba(29, 185, 84, 0.8)',
                borderColor: '#1DB954',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#b3b3b3'
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
    
    console.log('Artist chart created successfully');
}

// Load users
async function loadUsers() {
    console.log('Loading users...');
    
    try {
        const response = await adminFetch(`${API_BASE}/users?page=0&size=100`);
        const data = await response.json();
        
        console.log('Users data received:', data);
        
        // Handle different response formats
        const users = data.content || data.users || data || [];
        
        displayUsers(users);
        
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Display users in table
function displayUsers(users) {
    console.log('Displaying users:', users.length);
    
    const tbody = document.getElementById('usersTableBody');
    
    if (!tbody) {
        console.error('usersTableBody element NOT FOUND!');
        return;
    }
    
    console.log('usersTableBody found, clearing...');
    tbody.innerHTML = '';
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #b3b3b3;">No users found</td></tr>';
        return;
    }
    
    users.forEach((user, index) => {
        const row = document.createElement('tr');
        row.style.cssText = 'border-bottom: 1px solid #282828;';
        
        const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
        const role = user.role || 'user';
        const status = user.active !== false ? 'Active' : 'Inactive';
        
        row.innerHTML = `
            <td style="padding: 12px; color: #ffffff;">${user.username || user.name || 'Unknown'}</td>
            <td style="padding: 12px; color: #b3b3b3;">${user.email || 'N/A'}</td>
            <td style="padding: 12px;">
                <span style="background: ${role === 'admin' ? 'rgba(255, 107, 107, 0.2)' : 'rgba(29, 185, 84, 0.2)'}; 
                       color: ${role === 'admin' ? '#ff6b6b' : '#1DB954'}; 
                       padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                    ${role}
                </span>
            </td>
            <td style="padding: 12px; color: #b3b3b3;">${createdDate}</td>
            <td style="padding: 12px;">
                <button class="delete-user-btn" data-user-id="${user.id}" style="background: transparent; border: 1px solid #1DB954; color: #1DB954; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px;">View</button>
                <button class="delete-user-btn-del" data-user-id="${user.id}" style="background: transparent; border: 1px solid #ff6b6b; color: #ff6b6b; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Delete</button>
            </td>
        `;
        
        tbody.appendChild(row);
        
        // Add event listeners for buttons
        const viewBtn = row.querySelector('.delete-user-btn');
        const deleteBtn = row.querySelector('.delete-user-btn-del');
        
        if (viewBtn) {
            viewBtn.addEventListener('click', () => viewUser(user.id));
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteUser(user.id));
        }
    });
    
    console.log('Users displayed successfully:', users.length);
}

// Load content (songs, playlists, artists)
async function loadContent() {
    console.log('Loading content...');
    
    await Promise.all([
        loadAdminSongs(),
        loadAdminPlaylists(),
        loadAdminArtists()
    ]);
}

// Load admin songs
async function loadAdminSongs() {
    console.log('Loading songs...');
    
    try {
        const response = await adminFetch(`${API_BASE}/songs?page=0&size=100`);
        const data = await response.json();
        
        console.log('Songs data received:', data);
        
        const songs = data.content || data.songs || data || [];
        displayAdminSongs(songs);
        
    } catch (error) {
        console.error('Error loading songs:', error);
    }
}

// Display admin songs
function displayAdminSongs(songs) {
    console.log('Displaying songs:', songs.length);
    
    const container = document.getElementById('adminSongsList');
    
    if (!container) {
        console.error('adminSongsList element NOT FOUND!');
        return;
    }
    
    console.log('adminSongsList found, clearing...');
    container.innerHTML = '';
    
    if (!songs || songs.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #b3b3b3; padding: 20px;">No songs found</div>';
        return;
    }
    
    songs.forEach(song => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #1a1a1a; border-radius: 8px; margin-bottom: 8px;';
        
        const artistName = song.artistName || song.artist?.name || 'Unknown Artist';
        const playCount = song.playCount || song.plays || 0;
        const placeholderImg = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Crect fill=%22%23282828%22 width=%2240%22 height=%2240%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23888%22 font-size=%2216%22%3E%F0%9D%98%B6%3C/text%3E%3C/svg%3E';
        
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <img src="${song.coverImage || song.albumCover || placeholderImg}" 
                     alt="${song.title}" 
                     style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;"
                     onerror="this.src='${placeholderImg}'">
                <div>
                    <div style="color: #ffffff; font-weight: 500;">${song.title || 'Unknown Title'}</div>
                    <div style="color: #b3b3b3; font-size: 12px;">${artistName}</div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 20px;">
                <span style="color: #b3b3b3; font-size: 14px;">▶ ${playCount} plays</span>
                <button class="delete-song-btn" data-song-id="${song.id}" style="background: transparent; border: 1px solid #ff6b6b; color: #ff6b6b; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Delete</button>
            </div>
        `;
        
        container.appendChild(item);
        
        // Add event listener for delete button
        const deleteBtn = item.querySelector('.delete-song-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteSong(song.id));
        }
    });
    
    console.log('Songs displayed successfully:', songs.length);
}

// Load admin playlists
async function loadAdminPlaylists() {
    console.log('Loading playlists...');
    
    try {
        const response = await adminFetch(`${API_BASE}/playlists?page=0&size=100`);
        const data = await response.json();
        
        console.log('Playlists data received:', data);
        
        const playlists = data.content || data.playlists || data || [];
        displayAdminPlaylists(playlists);
        
    } catch (error) {
        console.error('Error loading playlists:', error);
    }
}

// Display admin playlists
function displayAdminPlaylists(playlists) {
    console.log('Displaying playlists:', playlists.length);
    
    const container = document.getElementById('adminPlaylistsList');
    
    if (!container) {
        console.error('adminPlaylistsList element NOT FOUND!');
        return;
    }
    
    console.log('adminPlaylistsList found, clearing...');
    container.innerHTML = '';
    
    if (!playlists || playlists.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #b3b3b3; padding: 20px;">No playlists found</div>';
        return;
    }
    
    playlists.forEach(playlist => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #1a1a1a; border-radius: 8px; margin-bottom: 8px;';
        
        const songCount = playlist.songCount || playlist.songs?.length || 0;
        const ownerName = playlist.ownerUsername || playlist.owner?.username || 'Unknown';
        
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #1DB954, #191414); border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                    <span style="color: #ffffff; font-size: 18px;">🎵</span>
                </div>
                <div>
                    <div style="color: #ffffff; font-weight: 500;">${playlist.name || 'Unknown Playlist'}</div>
                    <div style="color: #b3b3b3; font-size: 12px;">by ${ownerName} • ${songCount} songs</div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="background: ${playlist.isPublic !== false ? 'rgba(29, 185, 84, 0.2)' : 'rgba(179, 179, 179, 0.2)'}; 
                       color: ${playlist.isPublic !== false ? '#1DB954' : '#b3b3b3'}; 
                       padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                    ${playlist.isPublic !== false ? 'Public' : 'Private'}
                </span>
                <button class="delete-playlist-btn" data-playlist-id="${playlist.id}" style="background: transparent; border: 1px solid #ff6b6b; color: #ff6b6b; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Delete</button>
            </div>
        `;
        
        container.appendChild(item);
        
        // Add event listener for delete button
        const deleteBtn = item.querySelector('.delete-playlist-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deletePlaylist(playlist.id));
        }
    });
    
    console.log('Playlists displayed successfully:', playlists.length);
}

// Load admin artists
async function loadAdminArtists() {
    console.log('Loading admin artists...');
    
    try {
        const response = await adminFetch(`${API_BASE}/artists`);
        const data = await response.json();
        
        console.log('Artists data received:', data);
        
        const artists = data.content || data.artists || data || [];
        displayAdminArtists(artists);
        
    } catch (error) {
        console.error('Error loading artists:', error);
    }
}

// Display admin artists
function displayAdminArtists(artists) {
    console.log('Displaying artists:', artists.length);
    
    const container = document.getElementById('adminArtistsList');
    
    if (!container) {
        console.error('adminArtistsList element NOT FOUND!');
        return;
    }
    
    console.log('adminArtistsList found, clearing...');
    container.innerHTML = '';
    
    if (!artists || artists.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #b3b3b3; padding: 20px;">No artists found</div>';
        return;
    }
    
    artists.forEach(artist => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #1a1a1a; border-radius: 8px; margin-bottom: 8px;';
        
        const followers = artist.followers || artist.followerCount || 0;
        const placeholderImg = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Ccircle cx=%2220%22 cy=%2220%22 r=%2220%22 fill=%22%23282828%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23888%22 font-size=%2216%22%3E%F0%9D%98%B6%3C/text%3E%3C/svg%3E';
        
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <img src="${artist.profileImage || artist.image || placeholderImg}" 
                     alt="${artist.name}" 
                     style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;"
                     onerror="this.src='${placeholderImg}'">
                <div>
                    <div style="color: #ffffff; font-weight: 500;">${artist.name || 'Unknown Artist'}</div>
                    <div style="color: #b3b3b3; font-size: 12px;">${followers.toLocaleString()} followers</div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="background: rgba(29, 185, 84, 0.2); color: #1DB954; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                    Verified
                </span>
                <button class="view-artist-btn" data-artist-id="${artist.id}" style="background: transparent; border: 1px solid #1DB954; color: #1DB954; padding: 6px 12px; border-radius: 4px; cursor: pointer;">View</button>
            </div>
        `;
        
        container.appendChild(item);
        
        // Add event listener for view button
        const viewBtn = item.querySelector('.view-artist-btn');
        if (viewBtn) {
            viewBtn.addEventListener('click', () => viewArtist(artist.id));
        }
    });
    
    console.log('Artists displayed successfully:', artists.length);
}

// User management functions
function viewUser(userId) {
    console.log('View user:', userId);
    alert('User details: ID ' + userId);
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    console.log('Deleting user:', userId);
    
    try {
        // Try the standard DELETE method first
        let response = await adminFetch(`${API_BASE}/users/${userId}`, {
            method: 'DELETE'
        });
        
        console.log('Delete response status:', response.status);
        
        // If DELETE fails with 500, the endpoint isn't properly configured on backend
        if (response.status === 500) {
            console.warn('DELETE endpoint returned 500, trying POST with query parameter...');
            // Try as POST instead
            response = await adminFetch(`${API_BASE}/users/${userId}?_method=DELETE`, {
                method: 'POST'
            });
        }
        
        if (response.ok) {
            const data = await response.json().catch(() => ({}));
            console.log('Delete response:', data);
            alert('User deleted successfully');
            loadUsers();
        } else if (response.status === 204) {
            // 204 No Content is success for DELETE
            alert('User deleted successfully');
            loadUsers();
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Delete failed:', response.status, errorData);
            alert('⚠️ Failed to delete user\n\nBackend returned: ' + (errorData.message || response.statusText) + '\n\nPlease check backend configuration.');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user: ' + error.message);
    }
}

// Content management functions
async function deleteSong(songId) {
    if (!confirm('Are you sure you want to delete this song?')) return;
    
    console.log('Deleting song:', songId);
    
    try {
        let response = await adminFetch(`${API_BASE}/songs/${songId}`, {
            method: 'DELETE'
        });
        
        console.log('Delete response status:', response.status);
        
        if (response.status === 500) {
            console.warn('DELETE endpoint returned 500, trying POST with query parameter...');
            response = await adminFetch(`${API_BASE}/songs/${songId}?_method=DELETE`, {
                method: 'POST'
            });
        }
        
        if (response.ok || response.status === 204) {
            alert('Song deleted successfully');
            loadAdminSongs();
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Delete failed:', response.status, errorData);
            alert('Failed to delete song: ' + (errorData.message || response.statusText));
        }
    } catch (error) {
        console.error('Error deleting song:', error);
        alert('Error deleting song: ' + error.message);
    }
}

async function deletePlaylist(playlistId) {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    
    console.log('Deleting playlist:', playlistId);
    
    try {
        let response = await adminFetch(`${API_BASE}/playlists/${playlistId}`, {
            method: 'DELETE'
        });
        
        console.log('Delete response status:', response.status);
        
        if (response.status === 500) {
            console.warn('DELETE endpoint returned 500, trying POST with query parameter...');
            response = await adminFetch(`${API_BASE}/playlists/${playlistId}?_method=DELETE`, {
                method: 'POST'
            });
        }
        
        if (response.ok || response.status === 204) {
            alert('Playlist deleted successfully');
            loadAdminPlaylists();
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Delete failed:', response.status, errorData);
            alert('Failed to delete playlist: ' + (errorData.message || response.statusText));
        }
    } catch (error) {
        console.error('Error deleting playlist:', error);
        alert('Error deleting playlist: ' + error.message);
    }
}

function viewArtist(artistId) {
    console.log('View artist:', artistId);
    alert('Artist details: ID ' + artistId);
}

// System settings functions
function saveSettings() {
    const settings = {
        siteName: document.getElementById('siteName')?.value || 'Spotify Mock',
        maxUploadSize: document.getElementById('maxUploadSize')?.value || '50',
        allowRegistration: document.getElementById('allowRegistration')?.checked ?? true
    };
    
    console.log('Saving settings:', settings);
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    alert('Settings saved successfully!');
}

function loadSettings() {
    const savedSettings = localStorage.getItem('adminSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        const siteNameEl = document.getElementById('siteName');
        const maxUploadEl = document.getElementById('maxUploadSize');
        const allowRegEl = document.getElementById('allowRegistration');
        
        if (siteNameEl) siteNameEl.value = settings.siteName || 'Spotify Mock';
        if (maxUploadEl) maxUploadEl.value = settings.maxUploadSize || '50';
        if (allowRegEl) allowRegEl.checked = settings.allowRegistration ?? true;
    }
}

// Logout function
function adminLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// Search functions
function searchUsers() {
    const query = document.getElementById('userSearch')?.value?.toLowerCase() || '';
    const rows = document.querySelectorAll('#usersTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

function searchContent() {
    const query = document.getElementById('contentSearch')?.value?.toLowerCase() || '';
    
    // Search songs
    const songs = document.querySelectorAll('#adminSongsList > div');
    songs.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? '' : 'none';
    });
    
    // Search playlists
    const playlists = document.querySelectorAll('#adminPlaylistsList > div');
    playlists.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? '' : 'none';
    });
    
    // Search artists
    const artists = document.querySelectorAll('#adminArtistsList > div');
    artists.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? '' : 'none';
    });
}

// Make functions globally available
window.openTab = openTab;
window.openContentTab = openContentTab;
window.viewUser = viewUser;
window.deleteUser = deleteUser;
window.deleteSong = deleteSong;
window.deletePlaylist = deletePlaylist;
window.viewArtist = viewArtist;
window.saveSettings = saveSettings;
window.adminLogout = adminLogout;
window.searchUsers = searchUsers;
window.searchContent = searchContent;
window.loadUsers = loadUsers;
window.loadAllContent = loadContent;
window.filterUsers = searchUsers;

// Content tab switching
function openContentTab(tabName) {
    console.log('Opening content tab:', tabName);
    
    // Hide all content panels
    const panels = document.querySelectorAll('.content-tab-panel');
    panels.forEach(panel => {
        panel.classList.remove('active');
        panel.style.display = 'none';
    });
    
    // Remove active from all content tab buttons
    const buttons = document.querySelectorAll('.content-tab');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'transparent';
        btn.style.color = '#b3b3b3';
        btn.style.boxShadow = 'none';
    });
    
    // Show selected panel
    const selectedPanel = document.getElementById(tabName + '-content');
    if (selectedPanel) {
        selectedPanel.classList.add('active');
        selectedPanel.style.display = 'block';
    }
    
    // Highlight active button
    const activeBtn = document.querySelector(`.content-tab[onclick="openContentTab('${tabName}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.background = 'linear-gradient(135deg, #1db954, #1ed760)';
        activeBtn.style.color = 'white';
        activeBtn.style.boxShadow = '0 4px 12px rgba(29, 185, 84, 0.3)';
    }
}

console.log('Admin.js loaded successfully');
