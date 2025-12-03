// Add these functions to your app.js

// Store available songs globally
let availableSongs = [];

// Pagination state for user dashboard
let userDashboardState = {
    songs: {
        currentPage: 1,
        pageSize: 6,
        totalPages: 1
    },
    playlists: {
        currentPage: 1,
        pageSize: 6,
        totalPages: 1
    }
};

// ============= HELPER FUNCTIONS =============

// Global function for handling logout
function handleLogout() {
    console.log('👋 Logout initiated...');
    
    // Remove JWT token from localStorage
    localStorage.removeItem('jwtToken');
    console.log('✅ JWT token removed from storage');
    
    // Redirect to login page
    console.log('🔁 Redirecting to login page...');
    window.location.href = 'login.html';
}

// Helper: Set button loading state
function setButtonLoading(buttonId, isLoading, loadingText = '<i class="fas fa-spinner fa-spin"></i> Loading...', originalText) {
    const btn = document.getElementById(buttonId);
    if (!btn) return originalText || btn?.innerHTML;
    
    if (isLoading) {
        const savedText = originalText || btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = loadingText;
        return savedText;
    } else {
        btn.disabled = false;
        btn.innerHTML = originalText;
        return null;
    }
}

// Helper: Handle API errors consistently
function getErrorMessage(response) {
    if (!response) return 'Unknown error';
    if (response.error) return response.error;
    if (response.data?.error) return response.data.error;
    if (response.data?.message) return response.data.message;
    if (typeof response.data === 'string') return response.data;
    return 'Unknown error';
}

// Helper: Clear modal and reset checkboxes
function clearModalSelections(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.querySelectorAll('.song-checkbox').forEach(cb => {
        cb.checked = false;
        cb.closest('.song-item')?.classList.remove('selected');
    });
}

// Helper: Close modal by ID
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
            bootstrapModal.hide();
            
            // Schedule backdrop cleanup after modal animation completes
            setTimeout(() => {
                cleanupModalBackdrops();
            }, 300);
        }
    }
}

// Helper: Display error alert with retry option
function displayErrorAlert(title, message, retryFunction = null) {
    const alertHtml = `
        <div class="alert alert-danger">
            <h5>${title}</h5>
            <p>${message}</p>
            ${retryFunction ? '<button class="btn btn-sm btn-primary mt-2" onclick="' + retryFunction + '">Retry</button>' : ''}
        </div>
    `;
    return alertHtml;
}

// ============================================
// MUSIC PLAYER INTEGRATION FUNCTIONS
// ============================================
// These functions work with player.js to control music playback
// No existing logic is modified, only new functions added

/**
 * Play a song using the music player
 * @param {string} songId - Song ID to play
 */
async function playSong(songId) {
    try {
        console.log('🎵 Play song requested:', songId);
        
        // Check if player exists
        if (!window.player) {
            console.warn('⚠️ Player not initialized yet');
            return;
        }

        // Find song in availableSongs array or fetch it
        let song = availableSongs.find(s => s.id === songId);
        
        if (!song) {
            console.log('📡 Fetching song details...');
            // Try to get from API if not in availableSongs
            const response = await apiCall(`/songs/${songId}`, { method: 'GET' });
            
            if (!response.success) {
                console.error('❌ Could not load song:', getErrorMessage(response));
                return;
            }
            
            song = response.data;
        }

        // Try multiple URL property names (url, fileUrl, audioUrl)
        const audioUrl = song?.url || song?.fileUrl || song?.audioUrl;
        
        if (!song || !audioUrl) {
            console.error('❌ Song missing URL. Available properties:', Object.keys(song || {}));
            console.error('Song data:', song);
            return;
        }

        // Prepare song object for player
        const songObj = {
            id: song.id,
            title: song.title || 'Unknown Title',
            artist: song.artist?.name || song.artistName || 'Unknown Artist',
            url: audioUrl,
            imageUrl: song.imageUrl || song.cover || 'https://via.placeholder.com/60'
        };

        // Play through music player
        window.player.playSong(songObj);
        console.log('✅ Now playing:', songObj.title);
        
        // Increment play count
        try {
            const playResponse = await songsAPI.play(songId);
            if (playResponse.success) {
                console.log('📊 Play count incremented for:', songObj.title);
            }
        } catch (playError) {
            console.warn('⚠️ Could not increment play count:', playError);
            // Continue playing even if play count fails
        }
        
    } catch (error) {
        console.error('❌ Error in playSong:', error);
    }
}

/**
 * Play all songs from a playlist
 * @param {string} playlistId - Playlist ID
 */
async function playPlaylist(playlistId) {
    try {
        console.log('📋 Play playlist requested:', playlistId);
        
        if (!window.player) {
            console.warn('⚠️ Player not initialized');
            return;
        }

        // Fetch playlist songs
        const response = await apiCall(`/playlists/${playlistId}/songs`, { method: 'GET' });

        if (!response.success) {
            console.error('❌ Could not load playlist:', getErrorMessage(response));
            return;
        }

        const songs = response.data;
        if (!Array.isArray(songs) || songs.length === 0) {
            console.warn('⚠️ Playlist is empty');
            return;
        }

        // Convert songs to player format - handle multiple URL property names
        const formattedSongs = songs
            .map(song => {
                const audioUrl = song.url || song.fileUrl || song.audioUrl;
                return {
                    id: song.id,
                    title: song.title || 'Unknown',
                    artist: song.artist?.name || song.artistName || 'Unknown',
                    url: audioUrl,
                    imageUrl: song.imageUrl || song.cover || 'https://via.placeholder.com/60'
                };
            })
            .filter(s => s.url); // Only include songs with URLs

        if (formattedSongs.length === 0) {
            console.warn('⚠️ No playable songs in playlist');
            return;
        }

        // Set queue and play first song
        window.player.setQueue(formattedSongs);
        window.player.playSong(formattedSongs[0]);
        
        console.log('✅ Playing playlist with', formattedSongs.length, 'songs');
        
    } catch (error) {
        console.error('❌ Error in playPlaylist:', error);
    }
}

/**
 * Add song to queue
 * @param {string} songId - Song ID to add to queue
 */
async function addSongToQueue(songId) {
    try {
        if (!window.player) {
            console.warn('⚠️ Player not initialized');
            return;
        }

        // Find song or fetch it
        let song = availableSongs.find(s => s.id === songId);
        
        if (!song) {
            const response = await apiCall(`/songs/${songId}`, { method: 'GET' });
            if (!response.success) return;
            song = response.data;
        }

        // Try multiple URL property names
        const audioUrl = song?.url || song?.fileUrl || song?.audioUrl;
        
        if (!song || !audioUrl) {
            console.error('❌ Song missing URL for queue');
            return;
        }

        // Prepare song object
        const songObj = {
            id: song.id,
            title: song.title || 'Unknown',
            artist: song.artist?.name || song.artistName || 'Unknown',
            url: audioUrl,
            imageUrl: song.imageUrl || song.cover
        };

        // Add to queue
        window.player.addToQueue(songObj);
        console.log('➕ Added to queue:', songObj.title);
        
    } catch (error) {
        console.error('❌ Error adding to queue:', error);
    }
}

/**
 * Add multiple songs to queue from array
 * @param {Array} songIds - Array of song IDs
 */
async function addMultipleSongsToQueue(songIds) {
    try {
        if (!window.player || !Array.isArray(songIds)) return;

        for (const songId of songIds) {
            await addSongToQueue(songId);
        }
        
        console.log('➕ Added', songIds.length, 'songs to queue');
    } catch (error) {
        console.error('❌ Error adding songs to queue:', error);
    }
}

// // Load songs into the modal when it opens
// document.getElementById('createPlaylistModal')?.addEventListener('shown.bs.modal', async function() {
//     await loadSongsForSelection('songsSelection');
// });

// document.getElementById('addSongsModal')?.addEventListener('shown.bs.modal', async function() {
//     await loadSongsForSelection('addSongsSelection');
// });

// Initialize modals with proper event listeners
function initializeModals() {
    // Load songs when create playlist modal opens
    const createPlaylistModal = document.getElementById('createPlaylistModal');
    if (createPlaylistModal) {
        createPlaylistModal.addEventListener('shown.bs.modal', async function() {
            console.log('📋 Create Playlist modal opened - loading songs...');
            await loadSongsForSelection('songsSelection');
        });
        
        // Clean up backdrop on hide
        createPlaylistModal.addEventListener('hidden.bs.modal', function() {
            console.log('📋 Create Playlist modal closed - cleaning up...');
            cleanupModalBackdrops();
        });
    }
    
    // Load songs when add songs modal opens
    const addSongsModal = document.getElementById('addSongsModal');
    if (addSongsModal) {
        addSongsModal.addEventListener('shown.bs.modal', async function() {
            console.log('➕ Add Songs modal opened - loading songs...');
            await loadSongsForSelection('addSongsSelection');
        });
        
        // Clean up backdrop on hide
        addSongsModal.addEventListener('hidden.bs.modal', function() {
            console.log('➕ Add Songs modal closed - cleaning up...');
            cleanupModalBackdrops();
        });
    }
}

// Helper: Clean up stray modal backdrops
function cleanupModalBackdrops() {
    // Remove all stray modal-backdrop divs
    const backdrops = document.querySelectorAll('.modal-backdrop');
    console.log(`🧹 Found ${backdrops.length} backdrop(s), cleaning up...`);
    
    backdrops.forEach((backdrop, index) => {
        console.log(`   Removing backdrop ${index + 1}...`);
        backdrop.remove();
    });
    
    // Remove modal-open class from body if no modals are open
    const openModals = document.querySelectorAll('.modal.show');
    if (openModals.length === 0) {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        console.log('✅ Body modal-open class removed');
    }
}

// Set up MutationObserver to auto-clean backdrops
function setupBackdropObserver() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.classList && node.classList.contains('modal-backdrop')) {
                        console.log('🔍 Detected stray modal-backdrop, will monitor...');
                        
                        // Check if modal is actually open
                        const openModals = document.querySelectorAll('.modal.show');
                        if (openModals.length === 0) {
                            // No open modals, remove the backdrop
                            setTimeout(() => {
                                if (!node.parentElement) return; // Already removed
                                console.log('🧹 Auto-removing stray backdrop...');
                                node.remove();
                            }, 100);
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: false
    });
    
    console.log('👁️ Backdrop observer initialized');
}

async function loadSongsForSelection(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<p class="text-center text-muted"><i class="fas fa-spinner fa-spin"></i> Loading songs...</p>';

    // Load only first page (6-10 songs) initially for performance with 1000+ documents
    const result = await songsAPI.getAll(0, 20); // First 20 songs only

    if (result.success && result.data) {
        let songs = [];
        
        // Handle different response formats
        if (result.data.data && Array.isArray(result.data.data)) {
            // Custom { data: [] } format (YOUR BACKEND)
            songs = result.data.data;
        } else if (result.data.content && Array.isArray(result.data.content)) {
            songs = result.data.content;
        } else if (result.data.songs && Array.isArray(result.data.songs)) {
            songs = result.data.songs;
        } else if (Array.isArray(result.data)) {
            songs = result.data.slice(0, 20); // Limit to 20 if unpaginated
        }
        
        availableSongs = songs;
        
        if (songs.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No songs available</p>';
            return;
        }

        // Create search input with backend search capability
        renderSongsWithBackendSearch(songs, containerId);
    } else {
        container.innerHTML = '<p class="text-center text-danger">Failed to load songs. Please try again.</p>';
    }
}

// Helper: Render songs with BACKEND search (for 1000+ documents)
function renderSongsWithBackendSearch(initialSongs, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const searchInputId = `${containerId}Search`;
    const songsListId = `${containerId}List`;

    // Create search input and songs list
    container.innerHTML = `
        <div class="mb-3">
            <input 
                type="text" 
                id="${searchInputId}" 
                class="form-control" 
                placeholder="🔍 Search songs (type to search 1000+ songs)..."
                style="border: 2px solid #e0e0e0; border-radius: 12px; padding: 10px 15px; font-size: 0.95rem;"
            >
            <small class="text-muted">Showing first 20 songs. Use search to find more.</small>
        </div>
        <div id="${songsListId}" style="max-height: 250px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; padding: 5px;">
            <!-- Songs will be rendered here -->
        </div>
    `;

    // Render initial songs list
    renderSongsList(initialSongs, songsListId, containerId);

    // Add debounced backend search
    const searchInput = document.getElementById(searchInputId);
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.trim();
            
            clearTimeout(searchTimeout);
            
            if (searchTerm.length === 0) {
                // Show initial 20 songs
                renderSongsList(initialSongs, songsListId, containerId);
                return;
            }
            
            if (searchTerm.length < 2) {
                return; // Wait for at least 2 characters
            }
            
            // Show loading
            const songsList = document.getElementById(songsListId);
            if (songsList) {
                songsList.innerHTML = '<p class="text-center text-muted"><i class="fas fa-spinner fa-spin"></i> Searching...</p>';
            }
            
            // Debounce search - wait 500ms after user stops typing
            searchTimeout = setTimeout(async () => {
                try {
                    // Backend search with query parameter
                    const result = await apiCall(`/songs?search=${encodeURIComponent(searchTerm)}&page=0&size=50`, {
                        method: 'GET'
                    });
                    
                    if (result.success && result.data) {
                        let songs = [];
                        if (result.data.data && Array.isArray(result.data.data)) songs = result.data.data;
                        else if (result.data.content) songs = result.data.content;
                        else if (result.data.songs) songs = result.data.songs;
                        else if (Array.isArray(result.data)) songs = result.data;
                        
                        renderSongsList(songs, songsListId, containerId);
                    } else {
                        songsList.innerHTML = '<p class="text-center text-danger">Search failed. Please try again.</p>';
                    }
                } catch (error) {
                    console.error('Search error:', error);
                    songsList.innerHTML = '<p class="text-center text-danger">Search error. Please try again.</p>';
                }
            }, 500);
        });
    }
}

// Keep the old function for backwards compatibility
function renderSongsWithSearch(songs, containerId) {
    renderSongsWithBackendSearch(songs, containerId);
}

// Helper: Render the songs list
function renderSongsList(songs, songsListId, containerId) {
    const songsList = document.getElementById(songsListId);
    if (!songsList) return;

    if (songs.length === 0) {
        songsList.innerHTML = '<p class="text-center text-muted" style="padding: 20px;">No songs found</p>';
        return;
    }

    songsList.innerHTML = songs.map(song => `
        <div class="song-item" onclick="toggleSongSelection(this, '${song.id}')">
            <div class="form-check">
                <input 
                    class="form-check-input song-checkbox" 
                    type="checkbox" 
                    value="${song.id}" 
                    id="song-${song.id}-${containerId}"
                    onclick="event.stopPropagation();"
                    onchange="toggleSongSelectionByCheckbox(this)"
                >
                <label class="form-check-label" for="song-${song.id}-${containerId}" style="cursor: pointer; width: 100%; margin: 0;">
                    <strong>${song.title}</strong>
                    <br>
                    <small class="text-muted">
                        ${song.artist?.name || 'Unknown Artist'} • 
                        ${song.duration ? formatDuration(song.duration) : 'Unknown'}
                    </small>
                </label>
            </div>
        </div>
    `).join('');
}

function toggleSongSelection(element, songId) {
    const checkbox = element.querySelector('input[type="checkbox"]');
    checkbox.checked = !checkbox.checked;
    updateSongItemSelection(checkbox);
}

// Toggle selection when clicking checkbox directly
function toggleSongSelectionByCheckbox(checkbox) {
    updateSongItemSelection(checkbox);
}

// Get selected song IDs from checkboxes
function getSelectedSongs(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    
    const checkboxes = container.querySelectorAll('.song-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// Helper: Update song item selection styling
function updateSongItemSelection(checkbox, isChecking = checkbox.checked) {
    const songItem = checkbox.closest('.song-item');
    if (isChecking) {
        songItem.classList.add('selected');
    } else {
        songItem.classList.remove('selected');
    }
}

// Create new playlist
const createPlaylist = async () => {
    try {
        console.log('🎵 Attempting to create playlist...');
        
        // Get form elements
        const playlistNameInput = document.getElementById('playlistName');
        const playlistDescriptionInput = document.getElementById('playlistDescription');
        const playlistPublicCheckbox = document.getElementById('playlistPublic');
        
        if (!playlistNameInput) {
            console.error('❌ Playlist name input not found!');
            alert('Error: Form elements not found. Please refresh the page.');
            return;
        }
        
        const playlistName = playlistNameInput.value.trim();
        const playlistDescription = playlistDescriptionInput ? playlistDescriptionInput.value.trim() : '';
        const isPublic = playlistPublicCheckbox ? playlistPublicCheckbox.checked : true;
        
        // Get selected songs
        const selectedSongIds = getSelectedSongs('songsSelection');
        
        console.log('📝 Form values:', {
            name: playlistName,
            description: playlistDescription,
            isPublic: isPublic,
            selectedSongs: selectedSongIds.length
        });
        
        if (!playlistName) {
            alert('⚠️ Please enter a playlist name');
            playlistNameInput.focus();
            playlistNameInput.classList.add('is-invalid');
            return;
        }
        
        playlistNameInput.classList.remove('is-invalid');

        // Get current user
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            alert('❌ Please login to create a playlist');
            window.location.href = 'login.html';
            return;
        }

        console.log('🔐 Getting current user info...');
        const userResult = await authAPI.validate();
        
        if (!userResult.success || !userResult.data || !userResult.data.userId) {
            console.error('❌ Could not get user ID:', userResult);
            alert('❌ Could not verify user. Please login again.');
            window.location.href = 'login.html';
            return;
        }

        const userId = userResult.data.userId;
        console.log('✅ User ID obtained:', userId);

        const playlistData = {
            name: playlistName,
            description: playlistDescription,
            isPublic: isPublic,
            userId: userId,
            songIds: selectedSongIds  // Include selected songs
        };

        console.log('🎵 Creating playlist with data:', playlistData);

        // Show loading state
        const originalBtnText = setButtonLoading('createPlaylistBtn', true, '<i class="fas fa-spinner fa-spin"></i> Creating...');

        // Create playlist
        const response = await playlistsAPI.create(playlistData);

        console.log('📡 API Response:', response);

        // Reset button state
        setButtonLoading('createPlaylistBtn', false, '', originalBtnText);

        if (response.success) {
            console.log('✅ Playlist created successfully:', response.data);
            const songsText = selectedSongIds.length > 0 ? ` with ${selectedSongIds.length} song(s)` : '';
            alert(`🎉 Playlist "${playlistName}"${songsText} created successfully!`);
            
            // Clear form and selections
            playlistNameInput.value = '';
            if (playlistDescriptionInput) playlistDescriptionInput.value = '';
            if (playlistPublicCheckbox) playlistPublicCheckbox.checked = true;
            
            clearModalSelections('songsSelection');
            
            // Close modal
            closeModal('createPlaylistModal');
            
            // Refresh playlists list
            await loadPlaylists();
            
        } else {
            console.error('❌ Failed to create playlist:', response);
            const errorMessage = getErrorMessage(response);
            alert('❌ Failed to create playlist: ' + errorMessage);
        }
        
    } catch (error) {
        console.error('❌ Error creating playlist:', error);
        
        let errorMessage = 'Please try again.';
        if (error.message) {
            errorMessage = error.message;
        }
        
        alert('❌ Error creating playlist: ' + errorMessage);
        
        const originalBtnText = '<i class="fas fa-plus"></i> Create Playlist';
        setButtonLoading('createPlaylistBtn', false, '', originalBtnText);
    }
};

async function openAddSongsModal(playlistId, playlistName) {
    console.log('🎵 Opening add songs modal for playlist:', playlistId);
    
    // Store the playlist ID
    document.getElementById('currentPlaylistId').value = playlistId;
    
    // Update modal title
    document.getElementById('addSongsModalLabel').innerHTML = 
        `<i class="fas fa-music"></i> Add Songs to "${playlistName}"`;
    
    // Clear previous selection
    const container = document.getElementById('addSongsSelection');
    container.innerHTML = '<p class="text-center text-muted"><i class="fas fa-spinner fa-spin"></i> Loading songs...</p>';
    
    // Show modal FIRST
    const modalElement = document.getElementById('addSongsModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    // Then load songs
    try {
        await loadSongsForSelection('addSongsSelection');
    } catch (error) {
        console.error('Error loading songs:', error);
        container.innerHTML = '<p class="text-center text-danger">Failed to load songs</p>';
    }
}

async function addSongsToPlaylist() {
    try {
        const playlistId = document.getElementById('currentPlaylistId').value;
        const selectedSongIds = getSelectedSongs('addSongsSelection');
        
        if (selectedSongIds.length === 0) {
            alert('⚠️ Please select at least one song to add');
            return;
        }
        
        console.log('🎵 Adding songs to playlist:', {
            playlistId,
            songIds: selectedSongIds
        });
        
        // Show loading state
        const originalBtnText = setButtonLoading('addSongsBtn', true, '<i class="fas fa-spinner fa-spin"></i> Adding...');
        
        // Add each song to the playlist
        let successCount = 0;
        let failCount = 0;
        
        for (const songId of selectedSongIds) {
            const result = await playlistsAPI.addSong(playlistId, songId);
            if (result.success) {
                successCount++;
            } else {
                failCount++;
                console.error('Failed to add song:', songId, result);
            }
        }
        
        // Reset button
        setButtonLoading('addSongsBtn', false, '', originalBtnText);
        
        if (successCount > 0) {
            alert(`✅ Successfully added ${successCount} song(s) to playlist!${failCount > 0 ? `\n⚠️ ${failCount} song(s) failed to add.` : ''}`);
            
            clearModalSelections('addSongsSelection');
            closeModal('addSongsModal');
            
            // Refresh playlists
            await loadPlaylists();
        } else {
            alert('❌ Failed to add songs to playlist');
        }
        
    } catch (error) {
        console.error('❌ Error adding songs:', error);
        alert('❌ Error adding songs to playlist');
        
        const originalBtnText = '<i class="fas fa-plus"></i> Add Selected Songs';
        setButtonLoading('addSongsBtn', false, '', originalBtnText);
    }
}

// Update the checkAuthAndLoadDashboard function
async function checkAuthAndLoadDashboard() {
    const token = localStorage.getItem('jwtToken');
    
    console.log('🏠 Dashboard loading...');
    console.log('📝 Token exists:', !!token);
    
    if (!token) {
        console.log('❌ No token found, redirecting to login');
        window.location.href = 'login.html';
        return;
    }

    console.log('🔐 Validating token...');
    const result = await authAPI.validate();
    
    if (!result.success || !result.data.valid) {
        console.log('❌ Invalid token, redirecting to login');
        localStorage.removeItem('jwtToken');
        window.location.href = 'login.html';
        return;
    }

    const user = result.data;
    console.log('✅ User authenticated:', user.username);
    
    // Update welcome message
    const welcomeEl = document.getElementById('userWelcome');
    if (welcomeEl) {
        welcomeEl.textContent = `Welcome, ${user.displayName || user.username}!`;
    }

    console.log('📊 Loading dashboard content...');
    // Load appropriate content based on user role and page
    if (user.role === 'admin') {
        await loadAdminDashboard();
    } else {
        await loadUserDashboard();
    }
    
    console.log('✅ Dashboard loaded successfully');
}

// Add to loadUserDashboard function
async function loadUserDashboard() {
    if (!window.location.pathname.includes('user-dashboard.html')) {
        return;
    }

    console.log('👤 Loading user dashboard...');
    await loadSongs();
    await loadPlaylists();
}

// Load user's playlists - UPDATED WITH PAGINATION
async function loadPlaylists(page = null) {
    const playlistsList = document.getElementById('playlistsList');
    if (!playlistsList) {
        console.log('❌ playlistsList container not found');
        return;
    }

    if (page !== null) {
        userDashboardState.playlists.currentPage = page;
    }

    console.log('📋 Loading playlists... Page:', userDashboardState.playlists.currentPage);
    
    // Show loading
    playlistsList.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><p>Loading playlists...</p></div>';
    
    try {
        // ALWAYS use pagination for large datasets (1000+ documents)
        const result = await playlistsAPI.getAll(
            userDashboardState.playlists.currentPage - 1,
            userDashboardState.playlists.pageSize
        );
        
        console.log('📋 Playlists API response:', result);
        
        if (result && result.success && result.data) {
            let playlists = [];
            let totalElements = 0;
            
            // Handle paginated response formats
            if (result.data.data && Array.isArray(result.data.data)) {
                // Custom { data: [], totalElements: X } format (YOUR BACKEND)
                playlists = result.data.data;
                totalElements = result.data.totalElements || 0;
                console.log('✅ Using data[] format');
            } else if (result.data.content && Array.isArray(result.data.content)) {
                // Spring Data Page format
                playlists = result.data.content;
                totalElements = result.data.totalElements || result.data.totalItems || 0;
                console.log('✅ Using content[] format');
            } else if (result.data.playlists && Array.isArray(result.data.playlists)) {
                // Custom { playlists: [], totalElements: X } format
                playlists = result.data.playlists;
                totalElements = result.data.totalElements || result.data.totalItems || 0;
                console.log('✅ Using playlists[] format');
            } else if (Array.isArray(result.data)) {
                // Direct array (inefficient for large datasets)
                console.warn('⚠️ Backend returned unpaginated data - this is inefficient!');
                const allPlaylists = result.data;
                totalElements = allPlaylists.length;
                const startIdx = (userDashboardState.playlists.currentPage - 1) * userDashboardState.playlists.pageSize;
                playlists = allPlaylists.slice(startIdx, startIdx + userDashboardState.playlists.pageSize);
            } else {
                console.error('❌ Unexpected response format:', result.data);
                playlists = [];
                totalElements = 0;
            }
            
            console.log('📋 Playlists found:', playlists.length);
            
            if (playlists.length === 0 && userDashboardState.playlists.currentPage === 1) {
                playlistsList.innerHTML = `
                    <div class="alert alert-info">
                        <h5>No Playlists Yet</h5>
                        <p>You haven't created any playlists. Click the "Create Playlist" button to get started!</p>
                    </div>
                `;
            } else {
                displayPlaylists(playlists, playlistsList);
                
                // Calculate and display pagination
                userDashboardState.playlists.totalPages = Math.ceil(totalElements / userDashboardState.playlists.pageSize);
                if (userDashboardState.playlists.totalPages > 1) {
                    displayUserPagination('playlistsList', userDashboardState.playlists, loadPlaylists);
                }
            }
        } else {
            console.error('❌ Error loading playlists:', result);
            playlistsList.innerHTML = displayErrorAlert(
                'Unable to Load Playlists',
                `Status: ${result.status || 'Unknown'} | Error: ${getErrorMessage(result)}`,
                'loadPlaylists()'
            );
        }
    } catch (error) {
        console.error('❌ Exception loading playlists:', error);
        playlistsList.innerHTML = displayErrorAlert(
            'Error Loading Playlists',
            error.message || 'Network error',
            'loadPlaylists()'
        );
    }
}

function displayPlaylists(playlists, container) {
    if (!playlists || playlists.length === 0) {
        container.innerHTML = '<p>You don\'t have any playlists yet. Create your first one!</p>';
        return;
    }

    console.log('🎨 Displaying playlists:', playlists);
    
    container.innerHTML = playlists.map(playlist => {
        // Handle MongoDB _id format
        const playlistId = playlist.id || playlist._id?.$oid || playlist._id;
        const playlistName = playlist.name || 'Untitled Playlist';
        const createdDate = playlist.createdAt?.$date || playlist.createdAt;
        const songCount = playlist.songIds?.length || playlist.songs?.length || 0;
        
        return `
        <div class="playlist-card">

            <div class="playlist-info">
                <h4>${playlistName}</h4>
                <p>${playlist.description || 'No description'}</p>
                <p><strong>${playlist.isPublic ? '🌐 Public' : '🔒 Private'}</strong></p>
                <p>🎵 Songs: ${songCount}</p>
                <p>📅 Created: ${createdDate ? new Date(createdDate).toLocaleDateString() : 'Recently'}</p>
            </div>
            <div class="playlist-actions">
                <button class="btn btn-success btn-sm" onclick="openAddSongsModal('${playlistId}', '${playlistName.replace(/'/g, "\\'")}')">
                    <i class="fas fa-plus"></i> Add Songs
                </button>
                <button class="btn btn-info btn-sm" onclick="viewPlaylist('${playlistId}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-danger btn-sm" onclick="deletePlaylist('${playlistId}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// View playlist details
async function viewPlaylist(playlistId) {
    console.log('👀 Viewing playlist:', playlistId);
    
    try {
        const playlists = await playlistsAPI.getAll();
        const playlist = playlists.data.find(p => p.id === playlistId);
        
        if (playlist) {
            alert(`Playlist: ${playlist.name}\n\nDescription: ${playlist.description}\n\nSongs: ${playlist.songs ? playlist.songs.length : 0} songs\n\nCreated: ${new Date(playlist.createdAt).toLocaleDateString()}`);
        } else {
            alert('Playlist not found');
        }
    } catch (error) {
        console.error('Error viewing playlist:', error);
        alert('Error loading playlist details');
    }
}

// Edit playlist
async function editPlaylist(playlistId) {
    console.log('✏️ Editing playlist:', playlistId);
    
    try {
        const playlists = await playlistsAPI.getAll();
        const playlist = playlists.data.find(p => p.id === playlistId);
        
        if (playlist) {
            const newName = prompt('Enter new playlist name:', playlist.name);
            if (newName && newName !== playlist.name) {
                // Call update API (you'll need to implement this in backend)
                alert(`Would update playlist name to: ${newName}\n\n(Update functionality to be implemented)`);
            }
            
            const newDescription = prompt('Enter new description:', playlist.description);
            if (newDescription && newDescription !== playlist.description) {
                alert(`Would update description to: ${newDescription}`);
            }
        }
    } catch (error) {
        console.error('Error editing playlist:', error);
        alert('Error editing playlist');
    }
}

// Delete playlist
async function deletePlaylist(playlistId) {
    console.log('🗑️ Deleting playlist:', playlistId);
    
    if (confirm('Are you sure you want to delete this playlist? This action cannot be undone.')) {
        try {
            const result = await playlistsAPI.delete(playlistId);
            if (result.success) {
                alert('✅ Playlist deleted successfully!');
                await loadPlaylists();
            } else {
                alert('❌ Failed to delete playlist: ' + getErrorMessage(result));
            }
        } catch (error) {
            console.error('Error deleting playlist:', error);
            alert('❌ Error deleting playlist');
        }
    }
}

// Helper: Build song card HTML
function buildSongCardHtml(song, isPlayableCard = true) {
    return `
        <div class="song-card">
            <div class="song-info">
                <h4>${song.title || 'Unknown Title'}</h4>
                <p>Artist: ${song.artist?.name || song.artistName || 'Unknown Artist'}</p>
                <p>Album: ${song.album?.title || song.albumName || 'Single'}</p>
                <p>Duration: ${song.duration ? formatDuration(song.duration) : 'Unknown'}</p>
                <p>Plays: ${song.playCount || 0}</p>
                ${song.genre ? `<p>Genre: ${song.genre}</p>` : ''}
            </div>
            <div class="song-actions">
                ${isPlayableCard ? `<button class="btn btn-primary" onclick="playSong('${song.id}')">Play</button>` : ''}
            </div>
        </div>
    `;
}

// NOTE: playSong() function is now defined earlier in this file (line ~97)
// with full music player integration. The old implementation below has been removed.
// The new implementation supports:
// - Playing through the music player at the bottom of the screen
// - Queue management
// - Play count tracking
// - Proper error handling
// - Works with the global player instance

// Keeping showNowPlaying for backward compatibility (if needed by other code)
function showNowPlaying(song) {
    // This function is kept for backward compatibility
    // The music player now handles "now playing" display
    console.log('🎵 Now playing:', song.title || song);
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            filterContent(searchTerm);
        });
    }
}

// Filter songs and playlists
function filterContent(searchTerm) {
    // Filter songs
    const songCards = document.querySelectorAll('.song-card');
    songCards.forEach(card => {
        const songText = card.textContent.toLowerCase();
        card.style.display = songText.includes(searchTerm) ? 'block' : 'none';
    });
    
    // Filter playlists
    const playlistCards = document.querySelectorAll('.playlist-card');
    playlistCards.forEach(card => {
        const playlistText = card.textContent.toLowerCase();
        card.style.display = playlistText.includes(searchTerm) ? 'block' : 'none';
    });
}

async function loadSongs(page = null) {
    const songsList = document.getElementById('songsList');
    if (!songsList) return;

    if (page !== null) {
        userDashboardState.songs.currentPage = page;
    }

    console.log('🎵 Loading songs... Page:', userDashboardState.songs.currentPage);
    console.log('📍 Request URL will be: /songs?page=' + (userDashboardState.songs.currentPage - 1) + '&size=' + userDashboardState.songs.pageSize);
    
    // Show loading
    songsList.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><p>Loading songs (page ' + userDashboardState.songs.currentPage + ')...</p><small class="text-muted">If this takes too long, your backend needs pagination support</small></div>';
    
    try {
        // ALWAYS use pagination for large datasets (1000+ documents)
        let result = await songsAPI.getAll(
            userDashboardState.songs.currentPage - 1,
            userDashboardState.songs.pageSize
        );
        
        console.log('🎵 Songs API response:', result);
        
        // If timeout or error, the backend might not support pagination properly
        // Try with a very specific endpoint format
        if (!result || !result.success) {
            if (result?.status === 408 || result?.error?.includes('timeout')) {
                console.warn('⚠️ First attempt timed out, backend may be loading all documents');
                console.warn('⚠️ Your backend needs to implement pagination on /songs endpoint');
                
                songsList.innerHTML = `
                    <div class="alert alert-danger">
                        <h5>⚠️ Backend Performance Issue</h5>
                        <p><strong>Your backend is trying to load all ${result.totalElements || '1000+'} songs at once!</strong></p>
                        <p>Please implement pagination in your backend:</p>
                        <pre style="background: #000; color: #0f0; padding: 10px; border-radius: 5px; font-size: 12px;">
// Java Spring example:
@GetMapping("/songs")
public Page&lt;Song&gt; getSongs(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size
) {
    return songRepository.findAll(
        PageRequest.of(page, size)
    );
}</pre>
                        <p class="mb-0">Current request: <code>GET /songs?page=${userDashboardState.songs.currentPage - 1}&size=${userDashboardState.songs.pageSize}</code></p>
                    </div>
                `;
                return;
            }
        }

        if (result && result.success && result.data) {
            let songs = [];
            let totalElements = 0;
            
            // Handle paginated response formats (Spring Data, custom pagination)
            if (result.data.data && Array.isArray(result.data.data)) {
                // Custom { data: [], totalElements: X } format (YOUR BACKEND)
                songs = result.data.data;
                totalElements = result.data.totalElements || 0;
                console.log('✅ Using data[] format');
            } else if (result.data.content && Array.isArray(result.data.content)) {
                // Spring Data Page format
                songs = result.data.content;
                totalElements = result.data.totalElements || result.data.totalItems || 0;
                console.log('✅ Using content[] format');
            } else if (result.data.songs && Array.isArray(result.data.songs)) {
                // Custom { songs: [], totalElements: X } format
                songs = result.data.songs;
                totalElements = result.data.totalElements || result.data.totalItems || 0;
                console.log('✅ Using songs[] format');
            } else if (Array.isArray(result.data)) {
                // Direct array (backend sent unpaginated - limit to current page only)
                console.warn('⚠️ Backend returned unpaginated data - this is inefficient for large datasets!');
                const allSongs = result.data;
                totalElements = allSongs.length;
                // Extract only current page
                const startIdx = (userDashboardState.songs.currentPage - 1) * userDashboardState.songs.pageSize;
                songs = allSongs.slice(startIdx, startIdx + userDashboardState.songs.pageSize);
            } else {
                console.error('❌ Unexpected response format:', result.data);
                songs = [];
                totalElements = 0;
            }
            
            console.log('🎵 Songs found:', songs.length);
            console.log('🎵 Total elements:', totalElements);
            console.log('🎵 First song sample:', songs[0]);
            
            // Verify songs have required fields
            if (songs.length > 0 && !songs[0].id) {
                console.error('❌ Songs missing ID field!');
            }
            
            // Store in global array for player
            availableSongs = songs;
            
            displaySongs(songs, songsList);
            
            // Calculate and display pagination
            userDashboardState.songs.totalPages = Math.ceil(totalElements / userDashboardState.songs.pageSize);
            if (userDashboardState.songs.totalPages > 1) {
                displayUserPagination('songsList', userDashboardState.songs, loadSongs);
            }
        } else {
            console.error('❌ Error loading songs:', result);
            
            if (result?.status === 408 || result?.error?.includes('timeout')) {
                // Timeout specific message already shown above
                return;
            }
            
            songsList.innerHTML = `
                <div class="alert alert-warning">
                    <h5>⚠️ Unable to Load Songs</h5>
                    <p><strong>Error:</strong> ${result?.error || 'Unknown error'}</p>
                    <p><strong>Status:</strong> ${result?.status || 'N/A'}</p>
                    <hr>
                    <p><strong>Possible causes:</strong></p>
                    <ul>
                        <li>Backend endpoint <code>/songs</code> doesn't support pagination parameters</li>
                        <li>Database query is timing out (1000+ documents)</li>
                        <li>Backend needs indexing on database fields</li>
                    </ul>
                    <button class="btn btn-sm btn-primary" onclick="loadSongs()">
                        <i class="fas fa-sync"></i> Try Again
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Exception loading songs:', error);
        songsList.innerHTML = displayErrorAlert(
            'Error Loading Songs',
            error.message,
            'loadSongs()'
        );
    }
}

function displaySongs(songs, container) {
    if (!songs || songs.length === 0) {
        container.innerHTML = '<p>No songs available in the database</p>';
        return;
    }

    console.log('🎨 Displaying songs:', songs.length);
    container.innerHTML = songs.map(song => buildSongCardHtml(song, true)).join('');
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Add to loadAdminDashboard function
async function loadAdminDashboard() {
    if (!window.location.pathname.includes('admin-dashboard.html')) {
        return;
    }

    await loadAdminStats();
    await loadSongs();
}

// New function to load admin statistics
async function loadAdminStats() {
    const result = await adminAPI.getStats();
    
    if (result.success) {
        const stats = result.data.data;
        
        // Update basic stats
        document.getElementById('totalUsers').textContent = stats.totalUsers;
        document.getElementById('totalSongs').textContent = stats.totalSongs;
        document.getElementById('totalArtists').textContent = stats.totalArtists;
        document.getElementById('totalAlbums').textContent = stats.totalAlbums;
        document.getElementById('totalPlaylists').textContent = stats.totalPlaylists;
        
        // Display top songs
        displayTopSongs(stats.topSongs);
        
        // Display top artists
        displayTopArtists(stats.topArtists);
    } else {
        console.error('Failed to load admin stats');
    }
}

function displayTopSongs(songs) {
    const container = document.getElementById('topSongsList');
    if (!container) return;

    if (!songs || songs.length === 0) {
        container.innerHTML = '<p>No song data available</p>';
        return;
    }

    container.innerHTML = songs.map(song => buildSongCardHtml(song, false)).join('');
}

// Helper function to display pagination for user dashboard
function displayUserPagination(containerId, state, loadFunction) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Remove existing pagination if any
    const existingPagination = container.parentElement.querySelector('.pagination-controls');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    // Only show pagination if there's more than one page
    if (state.totalPages <= 1) return;
    
    const paginationHtml = `
        <div class="pagination-controls" style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; padding: 15px;">
            <button 
                class="btn btn-sm btn-secondary" 
                onclick="${loadFunction.name}(${state.currentPage - 1})" 
                ${state.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i> Previous
            </button>
            <span style="color: #fff; font-size: 14px;">
                Page ${state.currentPage} of ${state.totalPages}
            </span>
            <button 
                class="btn btn-sm btn-secondary" 
                onclick="${loadFunction.name}(${state.currentPage + 1})" 
                ${state.currentPage >= state.totalPages ? 'disabled' : ''}>
                Next <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('afterend', paginationHtml);
}

function displayTopArtists(artists) {
    const container = document.getElementById('topArtistsList');
    if (!container) return;

    if (!artists || artists.length === 0) {
        container.innerHTML = '<p>No artist data available</p>';
        return;
    }

    container.innerHTML = artists.map(artist => `
        <div class="artist-card">
            <div class="artist-info">
                <h4>${artist.artist.name}</h4>
                <p>Songs: ${artist.songCount}</p>
                <p>Total Plays: ${artist.totalPlays}</p>
            </div>
        </div>
    `).join('');
}

// Consolidated DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 App initializing...');
    
    // Clean up any stray backdrops on page load
    cleanupModalBackdrops();
    
    // Set up backdrop observer to auto-clean
    setupBackdropObserver();
    
    // Initialize modals with event listeners
    initializeModals();
    
    // Add logout functionality to all pages
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        console.log('🔘 Logout button found, adding event listener');
        logoutBtn.addEventListener('click', handleLogout);
    } else {
        console.log('⚠️ Logout button not found on this page');
    }

    // Setup search functionality
    setupSearch();

    // Add songs button listener
    const addSongsBtn = document.getElementById('addSongsBtn');
    if (addSongsBtn) {
        addSongsBtn.addEventListener('click', addSongsToPlaylist);
    }
    
    // Create playlist button listener
    const createBtn = document.getElementById('createPlaylistBtn');
    if (createBtn) {
        createBtn.addEventListener('click', createPlaylist);
        console.log('✅ Create playlist button listener attached');
    }

    // Check authentication and load dashboard
    await checkAuthAndLoadDashboard();
    
    console.log('✅ App initialization complete');
});

// Add manual refresh function for debugging
window.refreshPlaylists = function() {
    console.log('🔄 Manually refreshing playlists...');
    loadPlaylists();
};