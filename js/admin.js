// ============================================
// ADMIN DASHBOARD - MAIN SCRIPT
// ============================================

// Global state
let currentPage = 'dashboard';
let currentUserPage = 1;
let currentSongPage = 1;
let currentPlaylistPage = 1;
let currentArtistPage = 1;
let currentLogPage = 1;
const pageSize = 6; // Show 6 items per page

let charts = {
    genre: null,
    artist: null,
    daily: null
};

let pendingAction = null;

// Track if data has been loaded for each page
let pageDataLoaded = {
    dashboard: false,
    users: false,
    songs: false,
    playlists: false,
    artists: false,
    settings: false,
    logs: false
};

// ============================================
// AUTHENTICATION & INITIALIZATION
// ============================================

async function initializeAdmin() {
    console.log('🚀 Admin Dashboard initializing...');
    
    // Check authentication
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.log('❌ No token found, redirecting to login');
        window.location.href = 'login.html';
        return;
    }

    // Validate token
    const authResult = await authAPI.validate();
    if (!authResult.success || !authResult.data.valid) {
        console.log('❌ Invalid token');
        localStorage.removeItem('jwtToken');
        window.location.href = 'login.html';
        return;
    }

    // Check admin role (case-insensitive)
    const userRole = authResult.data.role || '';
    if (userRole.toUpperCase() !== 'ADMIN') {
        console.log('❌ User is not an admin - role:', userRole);
        window.location.href = 'user-dashboard.html';
        return;
    }

    // Update welcome message
    const username = authResult.data.username || 'Admin';
    document.getElementById('adminUsername').textContent = `Welcome, ${username}`;

    console.log('✅ Admin authenticated');

    // Set up event listeners
    setupEventListeners();

    // Load initial page
    await loadPage('dashboard');
}

function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            loadPage(page);
        });
    });

    // Search inputs with debounce
    setupSearch('userSearch', filterUsers);
    setupSearch('songSearch', filterSongs);
    setupSearch('playlistSearch', filterPlaylists);
    setupSearch('artistSearch', filterArtists);

    // Filter dropdowns
    document.getElementById('roleFilter')?.addEventListener('change', () => filterUsers());
    document.getElementById('genreFilter')?.addEventListener('change', () => filterSongs());
}

function setupSearch(inputId, filterFunc) {
    const input = document.getElementById(inputId);
    if (input) {
        let timeout;
        input.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(filterFunc, 300);
        });
    }
}

// ============================================
// PAGE NAVIGATION
// ============================================

async function loadPage(page) {
    console.log(`📄 Loading page: ${page}`);
    
    currentPage = page;

    // Hide all pages
    document.querySelectorAll('.page-content').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });

    // Remove active from nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Show selected page
    const pageEl = document.getElementById(`${page}-page`);
    if (pageEl) {
        pageEl.classList.add('active');
        pageEl.style.display = 'block';
    }

    // Set active nav link
    const navLink = document.querySelector(`[data-page="${page}"]`);
    if (navLink) {
        navLink.classList.add('active');
    }

    // Update page title
    const titles = {
        'dashboard': 'Dashboard Overview',
        'users': 'User Management',
        'songs': 'Song Management',
        'playlists': 'Playlist Management',
        'artists': 'Artist Management',
        'settings': 'System Settings',
        'logs': 'Admin Logs'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;

    // Load page content (only load data when page is accessed)
    try {
        switch (page) {
            case 'dashboard':
                await loadDashboard();
                break;
            case 'users':
                await loadUsers();
                break;
            case 'songs':
                await loadSongs();
                break;
            case 'playlists':
                await loadPlaylists();
                break;
            case 'artists':
                await loadArtists();
                break;
            case 'settings':
                await loadSettings();
                break;
            case 'logs':
                await loadLogs();
                break;
        }
        pageDataLoaded[page] = true;
    } catch (error) {
        console.error(`❌ Error loading page ${page}:`, error);
        showToast(`Error loading ${page} page`, 'error');
    }

    console.log(`✅ Page ${page} loaded`);
}

// ============================================
// DASHBOARD PAGE
// ============================================

async function loadDashboard() {
    console.log('📊 Loading dashboard...');
    
    // Show loading state for stats
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
        statsGrid.querySelectorAll('.stat-value').forEach(el => {
            el.innerHTML = '<div class="loading-spinner" style="width: 16px; height: 16px;"></div>';
        });
    }
    
    try {
        // Try to load statistics from /admin/stats
        let stats = null;
        const statsResult = await apiCall('/admin/stats');
        
        if (statsResult.success && statsResult.data) {
            stats = statsResult.data;
            console.log('✅ Stats loaded from /admin/stats');
        } else {
            // Fallback: Calculate stats from individual endpoints
            console.log('⚠️ /admin/stats failed, calculating from individual endpoints...');
            stats = await calculateStatsFromEndpoints();
        }
        
        updateStatCards(stats);

        // Load genre distribution
        const genreResult = await apiCall('/admin/stats/genres');
        console.log('🔍 Raw genre API result:', genreResult);
        console.log('🔍 Genre result.data:', genreResult.data);
        console.log('🔍 Genre result.data type:', typeof genreResult.data);
        if (genreResult.data) {
            console.log('🔍 Genre data keys:', Object.keys(genreResult.data));
        }
        
        if (genreResult.success && genreResult.data) {
            displayGenreChart(genreResult.data);
        } else {
            console.log('⚠️ Genre stats not available');
            displayGenreChart([]);
        }

        // Load top artists
        const artistResult = await apiCall('/admin/stats/artists');
        if (artistResult.success && artistResult.data) {
            displayArtistChart(artistResult.data);
        } else {
            console.log('⚠️ Artist stats not available');
            displayArtistChart([]);
        }

        // Load platform insights
        const insightResult = await apiCall('/admin/stats/platform');
        console.log('🔍 Platform insights result:', insightResult);
        if (insightResult.success && insightResult.data) {
            // Also pass genre data if we have it for counting total genres
            const genreCount = genreResult.success && genreResult.data?.topGenres 
                ? genreResult.data.topGenres.length 
                : (genreResult.data?.songGenres ? Object.keys(genreResult.data.songGenres).length : 0);
            updateInsights(insightResult.data, genreCount);
        } else {
            console.log('⚠️ Platform insights not available');
            updateInsights({ avgSongsPerPlaylist: 0, totalGenres: 0, totalPlays: 0 }, 0);
        }

        console.log('✅ Dashboard loaded');
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

// Fallback function to calculate stats from individual endpoints
async function calculateStatsFromEndpoints() {
    console.log('📊 Calculating stats from individual endpoints...');
    
    const stats = {
        totalUsers: 0,
        totalSongs: 0,
        totalArtists: 0,
        totalAlbums: 0,
        totalPlaylists: 0
    };
    
    try {
        // Fetch all endpoints in parallel including albums
        const [usersResult, songsResult, playlistsResult, artistsResult, albumsResult] = await Promise.all([
            apiCall('/users?page=0&size=1'),
            apiCall('/songs?page=0&size=1'),
            apiCall('/playlists?page=0&size=1'),
            apiCall('/artists?page=0&size=1'),
            apiCall('/albums?page=0&size=1')
        ]);
        
        // Extract total counts from pagination metadata
        if (usersResult.success && usersResult.data) {
            stats.totalUsers = usersResult.data.totalElements || usersResult.data.totalItems || 
                              (usersResult.data.data?.length) || (usersResult.data.users?.length) || 
                              (Array.isArray(usersResult.data) ? usersResult.data.length : 0);
        }
        
        if (songsResult.success && songsResult.data) {
            stats.totalSongs = songsResult.data.totalElements || songsResult.data.totalItems ||
                              (songsResult.data.data?.length) || (songsResult.data.songs?.length) || 
                              (Array.isArray(songsResult.data) ? songsResult.data.length : 0);
        }
        
        if (playlistsResult.success && playlistsResult.data) {
            stats.totalPlaylists = playlistsResult.data.totalElements || playlistsResult.data.totalItems ||
                                  (playlistsResult.data.data?.length) || (playlistsResult.data.playlists?.length) || 
                                  (Array.isArray(playlistsResult.data) ? playlistsResult.data.length : 0);
        }
        
        if (artistsResult.success && artistsResult.data) {
            stats.totalArtists = artistsResult.data.totalElements || artistsResult.data.totalItems ||
                                artistsResult.data.totalArtists ||
                                (artistsResult.data.data?.length) || (artistsResult.data.artists?.length) || 
                                (Array.isArray(artistsResult.data) ? artistsResult.data.length : 0);
        }
        
        if (albumsResult.success && albumsResult.data) {
            stats.totalAlbums = albumsResult.data.totalElements || albumsResult.data.totalItems ||
                               albumsResult.data.totalAlbums ||
                               (albumsResult.data.data?.length) || (albumsResult.data.albums?.length) || 
                               (Array.isArray(albumsResult.data) ? albumsResult.data.length : 0);
        }
        
        console.log('📊 Calculated stats:', stats);
    } catch (error) {
        console.error('Error calculating stats:', error);
    }
    
    return stats;
}

function updateStatCards(stats) {
    const elements = {
        'stat-users': stats.totalUsers,
        'stat-songs': stats.totalSongs,
        'stat-artists': stats.totalArtists,
        'stat-albums': stats.totalAlbums,
        'stat-playlists': stats.totalPlaylists
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) {
            if (typeof value === 'number') {
                el.textContent = value.toLocaleString();
            } else {
                el.textContent = value !== undefined ? value : '-';
            }
        }
    }
}

function displayGenreChart(data) {
    const ctx = document.getElementById('genreChart');
    if (!ctx) {
        console.log('❌ Genre chart canvas not found');
        return;
    }

    // Destroy existing chart
    if (charts.genre) {
        charts.genre.destroy();
        charts.genre = null;
    }

    // Debug: Log the raw data structure
    console.log('📊 Genre data received:', data);
    
    // Handle different response formats - API returns { topGenres: [...], songGenres: {...}, artistGenres: {...} }
    let genreData = [];
    
    if (Array.isArray(data)) {
        genreData = data;
    } else if (data && typeof data === 'object') {
        // Check for topGenres first (this is what the API returns)
        if (data.topGenres && Array.isArray(data.topGenres)) {
            genreData = data.topGenres;
        } else if (data.songGenres && typeof data.songGenres === 'object') {
            // Convert songGenres object {genre: count} to array format
            genreData = Object.entries(data.songGenres).map(([genre, count]) => ({
                genre: genre,
                count: count
            }));
        } else {
            // Try other possible structures
            genreData = data.genres || data.data || data.content || data.results || [];
        }
    }
    
    console.log('📊 Parsed genre data:', genreData);
    
    if (!Array.isArray(genreData) || genreData.length === 0) {
        console.log('⚠️ No genre data available after parsing');
        const container = ctx.parentElement;
        container.innerHTML = '<div class="chart-no-data"><i class="fas fa-chart-pie" style="font-size: 2rem; margin-bottom: 10px; display: block; opacity: 0.5;"></i>No genre data available</div>';
        return;
    }

    // Ensure canvas is available
    const chartContainer = ctx.parentElement;
    if (!chartContainer.querySelector('canvas')) {
        chartContainer.innerHTML = '<canvas id="genreChart"></canvas>';
    }
    
    const canvas = document.getElementById('genreChart');
    const context = canvas.getContext('2d');

    // Extract genre names and counts
    const genres = genreData.map(item => item.genre || item.name || 'Unknown');
    const counts = genreData.map(item => item.count || item.total || item.songCount || 0);
    
    console.log('📊 Chart labels:', genres);
    console.log('📊 Chart data:', counts);

    try {
        charts.genre = new Chart(context, {
            type: 'doughnut',
            data: {
                labels: genres,
                datasets: [{
                    data: counts,
                    backgroundColor: [
                        '#1DB954',
                        '#9B59B6',
                        '#3498DB',
                        '#E74C3C',
                        '#F39C12',
                        '#1ABC9C',
                        '#34495E',
                        '#E91E63',
                        '#00BCD4',
                        '#FF5722'
                    ],
                    borderColor: '#121212',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#FFFFFF',
                            padding: 15,
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
        console.log('✅ Genre chart rendered successfully');
    } catch (error) {
        console.error('❌ Error rendering genre chart:', error);
    }
}

function displayArtistChart(data) {
    const ctx = document.getElementById('artistChart');
    if (!ctx) {
        console.log('❌ Artist chart canvas not found');
        return;
    }

    // Destroy existing chart
    if (charts.artist) {
        charts.artist.destroy();
        charts.artist = null;
    }

    // Debug: Log the raw data structure
    console.log('🎤 Artist data received:', data);
    console.log('🎤 Artist data type:', typeof data);

    // Handle different response formats
    let artistData = [];
    
    if (Array.isArray(data)) {
        artistData = data;
    } else if (data && typeof data === 'object') {
        artistData = data.artists || data.data || data.content || data.results || data.topArtists || [];
        
        // If still not an array, check if data itself has artist properties
        if (!Array.isArray(artistData)) {
            if (Object.keys(data).length > 0) {
                artistData = Object.entries(data).map(([name, plays]) => ({
                    name: name,
                    totalPlays: typeof plays === 'number' ? plays : (plays?.totalPlays || plays?.plays || 0)
                }));
            }
        }
    }
    
    console.log('🎤 Parsed artist data:', artistData);
    
    if (!Array.isArray(artistData) || artistData.length === 0) {
        console.log('⚠️ No artist data available after parsing');
        const container = ctx.parentElement;
        container.innerHTML = '<div class="chart-no-data"><i class="fas fa-chart-bar" style="font-size: 2rem; margin-bottom: 10px; display: block; opacity: 0.5;"></i>No artist data available</div>';
        return;
    }

    // Ensure canvas is available
    const chartContainer = ctx.parentElement;
    if (!chartContainer.querySelector('canvas')) {
        chartContainer.innerHTML = '<canvas id="artistChart"></canvas>';
    }
    
    const canvas = document.getElementById('artistChart');
    const context = canvas.getContext('2d');

    // Take only top 5 artists
    const topArtists = artistData.slice(0, 5);
    const artists = topArtists.map(item => item.artist?.name || item.artistName || item.name || 'Unknown');
    const plays = topArtists.map(item => item.totalPlays || item.plays || item.playCount || 0);

    try {
        charts.artist = new Chart(context, {
            type: 'bar',
            data: {
                labels: artists,
                datasets: [{
                    label: 'Total Plays',
                    data: plays,
                    backgroundColor: '#1DB954',
                    borderColor: '#1ed760',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#B3B3B3' },
                        grid: { color: '#282828' },
                        beginAtZero: true
                    },
                    y: {
                        ticks: { color: '#B3B3B3' },
                        grid: { color: '#282828' }
                    }
                }
            }
        });
        console.log('✅ Artist chart rendered successfully');
    } catch (error) {
        console.error('❌ Error rendering artist chart:', error);
    }
}

function updateInsights(data, genreCountFromApi = 0) {
    console.log('📈 Updating insights with data:', data);
    
    const avgSongs = document.getElementById('insight-avg-songs');
    const genres = document.getElementById('insight-genres');
    const plays = document.getElementById('insight-plays');
    
    if (avgSongs) {
        // Try various property names for avg songs per playlist
        const avgValue = data.avgSongsPerPlaylist ?? data.averageSongsPerPlaylist ?? data.avgSongs ?? data.average;
        avgSongs.textContent = avgValue !== undefined && avgValue !== null
            ? parseFloat(avgValue).toFixed(1) 
            : '0';
    }
    if (genres) {
        // Try various property names for total genres, or use the count from genre API
        const genreValue = data.totalGenres ?? data.genreCount ?? data.genres ?? genreCountFromApi;
        genres.textContent = genreValue !== undefined && genreValue !== null ? genreValue : '0';
    }
    if (plays) {
        // Try various property names for total plays
        const playsValue = data.totalPlays ?? data.totalPlayCount ?? data.plays ?? data.playCount;
        plays.textContent = playsValue !== undefined && playsValue !== null
            ? Number(playsValue).toLocaleString() 
            : '0';
    }
}

// ============================================
// USER MANAGEMENT PAGE
// ============================================

async function loadUsers() {
    console.log('👥 Loading users...');
    
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="loading-text"><div class="loading-spinner"></div> Loading users...</div></td></tr>';
    
    try {
        const roleFilter = document.getElementById('roleFilter')?.value?.trim() || '';
        const search = document.getElementById('userSearch')?.value?.trim() || '';
        
        // Backend database uses lowercase roles ("admin", "user", "moderator")
        const role = roleFilter.toLowerCase();

        console.log('🔍 Filter values - Role:', JSON.stringify(role), 'Search:', JSON.stringify(search));

        const params = new URLSearchParams({
            page: currentUserPage - 1,
            size: pageSize
        });
        
        // Only add role if it's not empty
        if (role && role !== '') {
            params.append('role', role);
            console.log('👥 Filtering by role:', role);
        }
        
        // Only add search if it's not empty
        if (search && search !== '') {
            params.append('search', search);
            console.log('🔍 Searching for:', search);
        }

        const url = `/admin/users?${params}`;
        console.log('📍 Calling URL:', url);
        
        const result = await apiCall(url);
        console.log('📊 Users result:', result);
        
        if (result.success && result.data) {
            let users = [];
            
            // Handle different response formats - YOUR BACKEND USES { data: [] }
            if (result.data.data && Array.isArray(result.data.data)) {
                users = result.data.data;
                console.log('✅ Using data[] format for users');
            } else if (result.data.content && Array.isArray(result.data.content)) {
                users = result.data.content;
                console.log('✅ Using content[] format for users');
            } else if (result.data.users && Array.isArray(result.data.users)) {
                users = result.data.users;
                console.log('✅ Using users[] format');
            } else if (Array.isArray(result.data)) {
                users = result.data;
                console.log('✅ Using direct array format for users');
            } else {
                console.error('❌ Unexpected users response format:', result.data);
                users = [];
            }
            console.log('👥 Users loaded:', users.length);
            console.log('👥 First user:', users[0]);
            displayUsers(users);
            
            // Setup pagination if available
            const totalPages = result.data.totalPages || Math.ceil((result.data.totalElements || users.length) / pageSize) || 1;
            displayPagination('usersPagination', totalPages, currentUserPage, (page) => {
                currentUserPage = page;
                loadUsers();
            });
        } else {
            console.error('❌ Failed to load users:', result.error);
            showToast(`Failed to load users: ${result.error}`, 'error');
            tbody.innerHTML = 
                `<tr><td colspan="6" class="text-center text-danger">Failed to load users: ${result.error}</td></tr>`;
        }
    } catch (error) {
        console.error('❌ Error loading users:', error);
        showToast('Error loading users: ' + error.message, 'error');
        tbody.innerHTML = 
                `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No users found</td></tr>`;
        return;
    }

    tbody.innerHTML = users.map(user => {
        // Database stores lowercase roles ("admin", "user"), normalize for display
        const userRole = (user.role || 'user').toLowerCase();
        const displayRole = userRole.toUpperCase();
        return `
        <tr>
            <td>${user.username || 'N/A'}</td>
            <td>${user.email || 'N/A'}</td>
            <td><span class="badge ${getBadgeClass(displayRole)}">${displayRole}</span></td>
            <td>${user.joinDate || user.createdAt ? new Date(user.joinDate || user.createdAt).toLocaleDateString() : 'N/A'}</td>
            <td><span class="badge ${(user.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">${(user.status || 'ACTIVE').toUpperCase()}</span></td>
            <td class="actions">
                <button class="action-btn action-btn-edit" data-user-id="${user.id}" data-username="${user.username}" data-email="${user.email}" data-role="${userRole}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn action-btn-ban" data-user-id="${user.id}">
                    <i class="fas fa-ban"></i> Ban
                </button>
                <button class="action-btn action-btn-delete" data-user-id="${user.id}" data-username="${user.username}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
        `;
    }).join('');
    
    // Attach event listeners
    tbody.querySelectorAll('.action-btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.dataset.userId;
            const username = this.dataset.username;
            const email = this.dataset.email;
            const role = this.dataset.role;
            openEditUserModal(userId, username, email, role);
        });
    });
    
    tbody.querySelectorAll('.action-btn-ban').forEach(btn => {
        btn.addEventListener('click', function() {
            openBanUserModal(this.dataset.userId);
        });
    });
    
    tbody.querySelectorAll('.action-btn-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            confirmDeleteUser(this.dataset.userId, this.dataset.username);
        });
    });
}

function filterUsers() {
    currentUserPage = 1; // Reset to first page when filtering
    loadUsers();
}

function openEditUserModal(userId, username, email, role) {
    document.getElementById('editUserId').value = userId;
    document.getElementById('editUsername').value = username;
    document.getElementById('editEmail').value = email;
    document.getElementById('editRole').value = role;
    openModal('editUserModal');
}

async function saveUserEdit() {
    const userId = document.getElementById('editUserId').value;
    const email = document.getElementById('editEmail').value;
    const role = document.getElementById('editRole').value;

    if (!email) {
        showToast('Email is required', 'warning');
        return;
    }

    try {
        const result = await apiCall(`/admin/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ email, role })
        });

        if (result.success) {
            showToast('User updated successfully', 'success');
            closeModal('editUserModal');
            loadUsers();
        } else {
            showToast('Failed to update user', 'error');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showToast('Error updating user', 'error');
    }
}

function openBanUserModal(userId) {
    document.getElementById('banUserId').value = userId;
    document.getElementById('banReason').value = '';
    openModal('banUserModal');
}

async function confirmBanUser() {
    const userId = document.getElementById('banUserId').value;
    const reason = document.getElementById('banReason').value;

    if (!reason) {
        showToast('Please enter a ban reason', 'warning');
        return;
    }

    try {
        const result = await apiCall(`/admin/users/${userId}/ban`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });

        if (result.success) {
            showToast('User banned successfully', 'success');
            closeModal('banUserModal');
            loadUsers();
        } else {
            showToast('Failed to ban user', 'error');
        }
    } catch (error) {
        console.error('Error banning user:', error);
        showToast('Error banning user', 'error');
    }
}

function confirmDeleteUser(userId, username) {
    pendingAction = async () => {
        try {
            const result = await apiCall(`/users/${userId}`, {
                method: 'DELETE'
            });

            if (result.success) {
                showToast('User deleted successfully', 'success');
                closeModal('confirmModal');
                loadUsers();
            } else {
                showToast('Failed to delete user', 'error');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            showToast('Error deleting user', 'error');
        }
    };

    document.getElementById('confirmMessage').textContent = 
        `Are you sure you want to delete "${username}"? This action cannot be undone.`;
    document.getElementById('confirmBtn').textContent = 'Delete User';
    openModal('confirmModal');
}

// ============================================
// SONGS MANAGEMENT PAGE
// ============================================

// Filter songs by genre or search
function filterSongs() {
    currentSongPage = 1; // Reset to first page when filtering
    loadSongs();
}

async function loadSongs() {
    console.log('🎵 Loading songs...');
    
    const tbody = document.getElementById('songsTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="loading-text"><div class="loading-spinner"></div> Loading songs...</div></td></tr>';
    
    try {
        const genre = document.getElementById('genreFilter')?.value?.trim() || '';
        const search = document.getElementById('songSearch')?.value?.trim() || '';

        console.log('🔍 Filter values - Genre:', JSON.stringify(genre), 'Search:', JSON.stringify(search));

        const params = new URLSearchParams({
            page: currentSongPage - 1,
            size: pageSize
        });
        
        // Only add genre if it's not empty and not 'all'
        if (genre && genre !== 'all' && genre !== '') {
            params.append('genre', genre);
            console.log('🎨 Filtering by genre:', genre);
        }
        
        // Only add search if it's not empty
        if (search && search !== '') {
            params.append('search', search);
            console.log('🔍 Searching for:', search);
        }

        const url = `/songs?${params}`;
        console.log('📍 Calling URL:', url);
        
        const result = await apiCall(url);
        console.log('📊 Songs result:', result);
        console.log('📊 Songs result.data:', result.data);
        
        if (result.success && result.data) {
            let songs = [];
            
            // Handle different response formats - YOUR BACKEND USES { data: [] }
            if (result.data.data && Array.isArray(result.data.data)) {
                songs = result.data.data;
                console.log('✅ Using data[] format');
            } else if (result.data.content && Array.isArray(result.data.content)) {
                songs = result.data.content;
                console.log('✅ Using content[] format');
            } else if (result.data.songs && Array.isArray(result.data.songs)) {
                songs = result.data.songs;
                console.log('✅ Using songs[] format');
            } else if (Array.isArray(result.data)) {
                songs = result.data;
                console.log('✅ Using direct array format');
            } else {
                console.error('❌ Unexpected response format:', result.data);
                songs = [];
            }
            
            console.log('🎵 Songs loaded:', songs.length);
            console.log('🎵 First song:', songs[0]);
            displaySongs(songs);
            
            // Load genres for filter if not already loaded
            const genreFilter = document.getElementById('genreFilter');
            if (genreFilter && genreFilter.children.length <= 1) {
                await loadGenresForFilter();
            }
            
            const totalPages = result.data.totalPages || Math.ceil((result.data.totalElements || songs.length) / pageSize) || 1;
            displayPagination('songsPagination', totalPages, currentSongPage, (page) => {
                currentSongPage = page;
                loadSongs();
            });
        } else {
            console.error('❌ Failed to load songs:', result.error);
            showToast(`Failed to load songs: ${result.error}`, 'error');
            tbody.innerHTML = 
                `<tr><td colspan="7" class="text-center text-danger">Failed to load songs: ${result.error}</td></tr>`;
        }
    } catch (error) {
        console.error('❌ Error loading songs:', error);
        showToast('Error loading songs: ' + error.message, 'error');
        tbody.innerHTML = 
                `<tr><td colspan="7" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

async function loadGenresForFilter() {
    try {
        const result = await apiCall('/admin/stats/genres');
        if (result.success && result.data) {
            const genreFilter = document.getElementById('genreFilter');
            if (!genreFilter) return;
            
            let genres = [];
            
            // Handle different response formats
            if (Array.isArray(result.data)) {
                // Direct array of genre objects
                genres = result.data.map(item => item.genre || item.name || item);
            } else if (result.data.topGenres && Array.isArray(result.data.topGenres)) {
                // { topGenres: [...] } format
                genres = result.data.topGenres.map(item => item.genre || item.name || item);
            } else if (result.data.songGenres && typeof result.data.songGenres === 'object') {
                // { songGenres: { genre1: count, genre2: count } } format
                genres = Object.keys(result.data.songGenres);
            } else if (typeof result.data === 'object') {
                // Plain object { genre1: count, genre2: count }
                genres = Object.keys(result.data);
            }
            
            // Remove duplicates and filter out empty values
            genres = [...new Set(genres)].filter(g => g && g !== 'undefined');
            
            genres.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre;
                genreFilter.appendChild(option);
            });
            
            console.log('✅ Loaded genres for filter:', genres);
        }
    } catch (error) {
        console.error('Error loading genres:', error);
    }
}

function displaySongs(songs) {
    const tbody = document.getElementById('songsTableBody');
    
    if (!songs || songs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No songs found</td></tr>`;
        return;
    }

    tbody.innerHTML = songs.map(song => `
        <tr>
            <td>${song.title}</td>
            <td>${song.artist?.name || 'Unknown'}</td>
            <td>${song.genre || 'N/A'}</td>
            <td>${formatDuration(song.duration || 0)}</td>
            <td>${song.playCount || 0}</td>
            <td>${new Date(song.uploadedAt || song.createdAt).toLocaleDateString()}</td>
            <td class="actions">
                <button class="action-btn action-btn-view" data-song-url="${song.url || ''}">
                    <i class="fas fa-play"></i> Listen
                </button>
                <button class="action-btn action-btn-delete" data-song-id="${song.id}" data-song-title="${song.title}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
    
    // Attach event listeners
    tbody.querySelectorAll('.action-btn-view').forEach(btn => {
        btn.addEventListener('click', function() {
            const url = this.dataset.songUrl;
            if (url) window.open(url, '_blank');
        });
    });
    
    tbody.querySelectorAll('.action-btn-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            confirmDeleteSong(this.dataset.songId, this.dataset.songTitle);
        });
    });
}

function filterSongs() {
    currentSongPage = 1;
    loadSongs();
}

function confirmDeleteSong(songId, title) {
    pendingAction = async () => {
        try {
            const result = await apiCall(`/admin/content/songs/${songId}`, {
                method: 'DELETE'
            });

            if (result.success) {
                showToast('Song deleted successfully', 'success');
                closeModal('confirmModal');
                loadSongs();
            } else {
                showToast('Failed to delete song', 'error');
            }
        } catch (error) {
            console.error('Error deleting song:', error);
            showToast('Error deleting song', 'error');
        }
    };

    document.getElementById('confirmMessage').textContent = 
        `Are you sure you want to delete "${title}"?`;
    document.getElementById('confirmBtn').textContent = 'Delete Song';
    openModal('confirmModal');
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// PLAYLISTS MANAGEMENT PAGE
// ============================================

async function loadPlaylists() {
    console.log('📋 Loading playlists...');
    
    const tbody = document.getElementById('playlistsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="loading-text"><div class="loading-spinner"></div> Loading playlists...</div></td></tr>';
    
    try {
        const search = document.getElementById('playlistSearch')?.value || '';

        const params = new URLSearchParams({
            page: currentPlaylistPage - 1,
            size: pageSize,
            ...(search && { search })
        });

        const url = `/admin/content/playlists?${params}`;
        console.log('📍 Calling URL:', url);
        
        const result = await apiCall(url);
        console.log('📊 Playlists result:', result);
        
        if (result.success && result.data) {
            let playlists = [];
            
            // Handle different response formats - YOUR BACKEND USES { data: [] }
            if (result.data.data && Array.isArray(result.data.data)) {
                playlists = result.data.data;
                console.log('✅ Using data[] format for playlists');
            } else if (result.data.content && Array.isArray(result.data.content)) {
                playlists = result.data.content;
                console.log('✅ Using content[] format for playlists');
            } else if (result.data.playlists && Array.isArray(result.data.playlists)) {
                playlists = result.data.playlists;
                console.log('✅ Using playlists[] format');
            } else if (Array.isArray(result.data)) {
                playlists = result.data;
                console.log('✅ Using direct array format for playlists');
            } else {
                console.error('❌ Unexpected playlists response format:', result.data);
                playlists = [];
            }
            
            console.log('📋 Playlists loaded:', playlists.length);
            console.log('📋 First playlist:', playlists[0]);
            displayPlaylists(playlists);
            
            const totalPages = result.data.totalPages || Math.ceil((result.data.totalElements || playlists.length) / pageSize) || 1;
            displayPagination('playlistsPagination', totalPages, currentPlaylistPage, (page) => {
                currentPlaylistPage = page;
                loadPlaylists();
            });
        } else {
            console.error('❌ Failed to load playlists:', result.error);
            showToast(`Failed to load playlists: ${result.error}`, 'error');
            tbody.innerHTML = 
                `<tr><td colspan="6" class="text-center text-danger">Failed to load playlists: ${result.error}</td></tr>`;
        }
    } catch (error) {
        console.error('❌ Error loading playlists:', error);
        showToast('Error loading playlists: ' + error.message, 'error');
        tbody.innerHTML = 
                `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

function displayPlaylists(playlists) {
    const tbody = document.getElementById('playlistsTableBody');
    
    if (!playlists || playlists.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No playlists found</td></tr>`;
        return;
    }

    tbody.innerHTML = playlists.map(playlist => {
        // Handle MongoDB _id format
        const playlistId = playlist.id || playlist._id?.$oid || playlist._id;
        const createdBy = playlist.createdBy || playlist.creator?.username || playlist.user?.username || 'Unknown User';
        const createdDate = playlist.createdAt?.$date || playlist.createdAt;
        
        return `
        <tr>
            <td>${playlist.name || 'Untitled'}</td>
            <td>${createdBy}</td>
            <td>${playlist.songIds?.length || playlist.songs?.length || 0}</td>
            <td>${createdDate ? new Date(createdDate).toLocaleDateString() : 'N/A'}</td>
            <td><span class="badge ${playlist.isPublic ? 'badge-success' : 'badge-info'}">${playlist.isPublic ? 'Public' : 'Private'}</span></td>
            <td class="actions">
                <button class="action-btn action-btn-view" data-playlist-id="${playlistId}">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="action-btn action-btn-delete" data-playlist-id="${playlistId}" data-playlist-name="${playlist.name}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
        `;
    }).join('');
    
    // Attach event listeners
    tbody.querySelectorAll('.action-btn-view').forEach(btn => {
        btn.addEventListener('click', function() {
            viewPlaylist(this.dataset.playlistId);
        });
    });
    
    tbody.querySelectorAll('.action-btn-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            confirmDeletePlaylist(this.dataset.playlistId, this.dataset.playlistName);
        });
    });
}

function filterPlaylists() {
    currentPlaylistPage = 1;
    loadPlaylists();
}

async function viewPlaylist(playlistId) {
    try {
        const result = await apiCall(`/playlists/${playlistId}`);
        if (result.success) {
            const playlist = result.data;
            showToast(`Playlist: ${playlist.name} (${playlist.songIds?.length || 0} songs)`, 'info');
        } else {
            showToast('Failed to load playlist', 'error');
        }
    } catch (error) {
        console.error('Error viewing playlist:', error);
        showToast('Error loading playlist', 'error');
    }
}

function confirmDeletePlaylist(playlistId, name) {
    pendingAction = async () => {
        try {
            const result = await apiCall(`/admin/content/playlists/${playlistId}`, {
                method: 'DELETE'
            });

            if (result.success) {
                showToast('Playlist deleted successfully', 'success');
                closeModal('confirmModal');
                loadPlaylists();
            } else {
                showToast('Failed to delete playlist', 'error');
            }
        } catch (error) {
            console.error('Error deleting playlist:', error);
            showToast('Error deleting playlist', 'error');
        }
    };

    document.getElementById('confirmMessage').textContent = 
        `Are you sure you want to delete "${name}"?`;
    document.getElementById('confirmBtn').textContent = 'Delete Playlist';
    openModal('confirmModal');
}

// ============================================
// ARTISTS MANAGEMENT PAGE
// ============================================

async function loadArtists() {
    console.log('🎤 Loading artists...');
    
    const tbody = document.getElementById('artistsTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center"><div class="loading-text"><div class="loading-spinner"></div> Loading artists...</div></td></tr>';
    
    try {
        const search = document.getElementById('artistSearch')?.value || '';

        const params = new URLSearchParams({
            page: currentArtistPage - 1,
            size: pageSize,
            ...(search && { search })
        });

        const url = `/artists?${params}`;
        console.log('📍 Calling URL:', url);
        
        const result = await apiCall(url);
        console.log('📊 Artists result:', result);
        
        if (result.success && result.data) {
            let artists = [];
            
            // Handle different response formats - YOUR BACKEND USES { data: [] }
            if (result.data.data && Array.isArray(result.data.data)) {
                artists = result.data.data;
                console.log('✅ Using data[] format for artists');
            } else if (result.data.content && Array.isArray(result.data.content)) {
                artists = result.data.content;
                console.log('✅ Using content[] format for artists');
            } else if (result.data.artists && Array.isArray(result.data.artists)) {
                artists = result.data.artists;
                console.log('✅ Using artists[] format');
            } else if (Array.isArray(result.data)) {
                artists = result.data;
                console.log('✅ Using direct array format for artists');
            } else {
                console.error('❌ Unexpected artists response format:', result.data);
                artists = [];
            }
            
            console.log('🎤 Artists loaded:', artists.length);
            console.log('🎤 First artist:', artists[0]);
            displayArtists(artists);
            
            // Pagination for artists if available
            const totalPages = result.data.totalPages || Math.ceil((result.data.totalElements || artists.length) / pageSize) || 1;
            displayPagination('artistsPagination', totalPages, currentArtistPage, (page) => {
                currentArtistPage = page;
                loadArtists();
            });
        } else {
            console.error('❌ Failed to load artists:', result.error);
            showToast(`Failed to load artists: ${result.error}`, 'error');
            tbody.innerHTML = 
                `<tr><td colspan="5" class="text-center text-danger">Failed to load artists: ${result.error}</td></tr>`;
        }
    } catch (error) {
        console.error('❌ Error loading artists:', error);
        showToast('Error loading artists: ' + error.message, 'error');
        tbody.innerHTML = 
                `<tr><td colspan="5" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

function displayArtists(artists) {
    const tbody = document.getElementById('artistsTableBody');
    
    if (!artists || artists.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No artists found</td></tr>`;
        return;
    }

    tbody.innerHTML = artists.map(artist => `
        <tr>
            <td>${artist.name}</td>
            <td>${artist.genre || 'N/A'}</td>
            <td>${artist.songCount || 0}</td>
            <td>${artist.totalPlays || 0}</td>
            <td class="actions">
                <button class="action-btn action-btn-view" data-artist-name="${artist.name}" data-artist-genre="${artist.genre || 'N/A'}" data-artist-songs="${artist.songCount || 0}" data-artist-plays="${artist.totalPlays || 0}">
                    <i class="fas fa-info-circle"></i> Details
                </button>
            </td>
        </tr>
    `).join('');
    
    // Attach event listeners
    tbody.querySelectorAll('.action-btn-view').forEach(btn => {
        btn.addEventListener('click', function() {
            const name = this.dataset.artistName;
            const genre = this.dataset.artistGenre;
            const songs = this.dataset.artistSongs;
            const plays = this.dataset.artistPlays;
            alert(`Artist: ${name}\nGenre: ${genre}\nSongs: ${songs}\nTotal Plays: ${plays}`);
        });
    });
}

function filterArtists() {
    loadArtists();
}

// ============================================
// SETTINGS PAGE
// ============================================

async function loadSettings() {
    console.log('⚙️ Loading settings...');
    
    try {
        const result = await apiCall('/admin/settings');
        
        if (result.success && result.data) {
            const settings = result.data;
            
            // Update toggle switches
            const regToggle = document.getElementById('toggleRegistration');
            const maintToggle = document.getElementById('toggleMaintenance');
            
            if (regToggle) {
                if (settings.allowRegistration) {
                    regToggle.classList.add('on');
                } else {
                    regToggle.classList.remove('on');
                }
            }
            if (maintToggle) {
                if (settings.maintenanceMode) {
                    maintToggle.classList.add('on');
                } else {
                    maintToggle.classList.remove('on');
                }
            }
            
            // Update input fields
            const maxPlaylists = document.getElementById('maxPlaylists');
            const maxSongsPlaylist = document.getElementById('maxSongsPlaylist');
            
            if (maxPlaylists) {
                maxPlaylists.value = settings.maxPlaylistsPerUser || 50;
            }
            if (maxSongsPlaylist) {
                maxSongsPlaylist.value = settings.maxSongsPerPlaylist || 500;
            }
            
            console.log('✅ Settings loaded');
        } else {
            console.log('⚠️ Settings not available, using defaults');
        }
    } catch (error) {
        console.error('❌ Error loading settings:', error);
        showToast('Error loading settings', 'error');
    }
}

function toggleSetting(setting) {
    const toggle = document.getElementById(`toggle${capitalize(setting)}`);
    if (toggle) {
        toggle.classList.toggle('on');
    }
}

async function saveSettings() {
    try {
        const settings = {
            allowRegistration: document.getElementById('toggleRegistration').classList.contains('on'),
            maintenanceMode: document.getElementById('toggleMaintenance').classList.contains('on'),
            maxPlaylistsPerUser: parseInt(document.getElementById('maxPlaylists').value),
            maxSongsPerPlaylist: parseInt(document.getElementById('maxSongsPlaylist').value)
        };

        const result = await apiCall('/admin/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });

        if (result.success) {
            showToast('Settings saved successfully', 'success');
        } else {
            showToast('Failed to save settings', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Error saving settings', 'error');
    }
}

// ============================================
// LOGS PAGE
// ============================================

async function loadLogs() {
    console.log('📋 Loading logs...');
    
    const tbody = document.getElementById('logsTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><div class="loading-text"><div class="loading-spinner"></div> Loading logs...</div></td></tr>';
    
    try {
        const url = `/admin/logs?page=${currentLogPage - 1}&size=${pageSize}`;
        console.log('📍 Calling URL:', url);
        
        const result = await apiCall(url);
        console.log('📊 Logs result:', result);
        
        if (result.success) {
            const logsArray = result.data.logs || result.data.content || result.data || [];
            const logs = Array.isArray(logsArray) ? logsArray : [];
            console.log('📋 Logs loaded:', logs.length);
            displayLogs(logs);
            
            const totalPages = result.data.totalPages || Math.ceil((result.data.totalElements || logs.length) / pageSize) || 1;
            displayPagination('logsPagination', totalPages, currentLogPage, (page) => {
                currentLogPage = page;
                loadLogs();
            });
        } else {
            console.error('❌ Failed to load logs:', result.error);
            showToast(`Failed to load logs: ${result.error}`, 'error');
            tbody.innerHTML = 
                `<tr><td colspan="4" class="text-center text-danger">Failed to load logs: ${result.error}</td></tr>`;
        }
    } catch (error) {
        console.error('❌ Error loading logs:', error);
        showToast('Error loading logs: ' + error.message, 'error');
        tbody.innerHTML = 
                `<tr><td colspan="4" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

function displayLogs(logs) {
    const tbody = document.getElementById('logsTableBody');
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No logs found</td></tr>`;
        return;
    }

    tbody.innerHTML = logs.map(log => `
        <tr>
            <td>${new Date(log.timestamp).toLocaleString()}</td>
            <td>${log.adminUsername || 'System'}</td>
            <td>${log.action || 'N/A'}</td>
            <td>${log.details || 'N/A'}</td>
        </tr>
    `).join('');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function confirmAction() {
    if (pendingAction) {
        pendingAction();
        pendingAction = null;
    }
}

function displayPagination(containerId, totalPages, currentPageNum, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container || totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }

    container.innerHTML = '';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Previous';
    prevBtn.disabled = currentPageNum <= 1;
    if (currentPageNum > 1) {
        prevBtn.addEventListener('click', () => onPageChange(currentPageNum - 1));
    }
    container.appendChild(prevBtn);

    // Page numbers
    const startPage = Math.max(1, currentPageNum - 2);
    const endPage = Math.min(totalPages, currentPageNum + 2);

    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPageNum) {
            const span = document.createElement('span');
            span.className = 'active';
            span.textContent = i;
            container.appendChild(span);
        } else {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.addEventListener('click', () => onPageChange(i));
            container.appendChild(btn);
        }
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPageNum >= totalPages;
    if (currentPageNum < totalPages) {
        nextBtn.addEventListener('click', () => onPageChange(currentPageNum + 1));
    }
    container.appendChild(nextBtn);
}

function getBadgeClass(role) {
    const classes = {
        'ADMIN': 'badge-danger',
        'MODERATOR': 'badge-warning',
        'USER': 'badge-info'
    };
    return classes[role] || 'badge-info';
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    
    const icons = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

async function handleLogout() {
    console.log('👋 Logging out...');
    localStorage.removeItem('jwtToken');
    window.location.href = 'login.html';
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎵 Admin Dashboard starting...');
    await initializeAdmin();
});