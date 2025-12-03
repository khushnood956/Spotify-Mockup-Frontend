// ============================================
// SPOTIFY MOCK MUSIC PLAYER - player.js
// ============================================
// Complete music player class - Non-intrusive, works with existing app.js logic

class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audioPlayer');
        this.queue = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isShuffled = false;
        this.repeatMode = 0; // 0: no repeat, 1: repeat all, 2: repeat one
        this.isDragging = false;
        
        this.initializeElements();
        this.attachEventListeners();
        console.log('🎵 Music Player initialized');
    }

    initializeElements() {
        // Player Elements
        this.playerContainer = document.getElementById('musicPlayerContainer');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.repeatBtn = document.getElementById('repeatBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.queueBtn = document.getElementById('queueBtn');
        this.minimizePlayerBtn = document.getElementById('minimizePlayerBtn');
        
        // Info Elements
        this.songTitle = document.getElementById('playerSongTitle');
        this.artistName = document.getElementById('playerArtistName');
        this.playingIndicator = document.getElementById('playingIndicator');
        
        // Progress Elements
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.progressHandle = document.getElementById('progressHandle');
        this.currentTimeEl = document.getElementById('currentTime');
        this.durationEl = document.getElementById('duration');
        
        // Queue Modal
        this.queueModal = new bootstrap.Modal(document.getElementById('queueModal'));
        this.queueList = document.getElementById('queueList');
    }

    attachEventListeners() {
        // Player Controls
        if (this.playPauseBtn) this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.playPrevious());
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.playNext());
        if (this.shuffleBtn) this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        if (this.repeatBtn) this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        if (this.queueBtn) this.queueBtn.addEventListener('click', () => this.showQueue());
        if (this.minimizePlayerBtn) this.minimizePlayerBtn.addEventListener('click', () => this.minimizePlayer());
        
        // Audio Events
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('ended', () => this.handleSongEnded());
        this.audio.addEventListener('error', (e) => this.handleAudioError(e));
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.playingIndicator.classList.add('active');
            this.updatePlayPauseButton();
        });
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.playingIndicator.classList.remove('active');
            this.updatePlayPauseButton();
        });
        
        // Volume Control
        if (this.volumeSlider) {
            this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
            this.audio.volume = this.volumeSlider.value / 100;
        }
        
        // Progress Bar Click
        if (this.progressBar) {
            this.progressBar.addEventListener('click', (e) => this.seek(e));
            this.progressBar.addEventListener('mousedown', (e) => this.startDragging(e));
        }
    }

    /**
     * Play a song
     * @param {Object} song - Song object with id, title, artist, url, imageUrl
     */
    playSong(song) {
        console.log('🎵 Playing song:', song.title, 'by', song.artist);
        
        if (!song || !song.url) {
            console.error('❌ Invalid song object or missing URL');
            return false;
        }

        try {
            // Set audio source
            this.audio.src = song.url;
            
            // Update UI
            this.songTitle.textContent = song.title || 'Unknown Title';
            this.artistName.textContent = song.artist || 'Unknown Artist';
            
            // Play the song
            this.audio.play()
                .then(() => {
                    this.isPlaying = true;
                    this.updatePlayPauseButton();
                    this.playingIndicator.classList.add('active');
                    console.log('✅ Now playing: ' + song.title);
                })
                .catch((error) => {
                    console.error('❌ Error playing audio:', error);
                });
                
            return true;
        } catch (error) {
            console.error('❌ Error in playSong:', error);
            return false;
        }
    }

    /**
     * Add song to queue
     * @param {Object} song - Song object
     */
    addToQueue(song) {
        if (!song || !song.url) return false;
        this.queue.push(song);
        console.log('➕ Song added to queue:', song.title);
        return true;
    }

    /**
     * Create queue from array of songs
     * @param {Array} songs - Array of song objects
     */
    setQueue(songs) {
        this.queue = songs.filter(s => s && s.url); // Only valid songs
        this.currentIndex = 0;
        console.log('📋 Queue set with', this.queue.length, 'songs');
    }

    /**
     * Toggle Play/Pause
     */
    togglePlayPause() {
        // If no audio source set, start playing current song from queue
        if (!this.audio.src) {
            if (this.queue.length === 0) {
                console.warn('⚠️ Queue is empty - nothing to play');
                return;
            }
            if (this.queue.length > 0) {
                this.playSong(this.queue[this.currentIndex]);
            }
            return;
        }

        // Check if audio is currently paused
        if (this.audio.paused) {
            // Audio is paused, resume playing
            this.audio.play()
                .then(() => {
                    this.isPlaying = true;
                    this.playingIndicator.classList.add('active');
                    this.updatePlayPauseButton();
                    console.log('▶️ Resumed playing');
                })
                .catch(e => {
                    console.error('❌ Play error:', e);
                    this.isPlaying = false;
                    this.updatePlayPauseButton();
                });
        } else {
            // Audio is playing, pause it
            this.audio.pause();
            this.isPlaying = false;
            this.playingIndicator.classList.remove('active');
            this.updatePlayPauseButton();
            console.log('⏸️ Paused');
        }
    }

    /**
     * Play next song
     */
    playNext() {
        if (this.queue.length === 0) return;

        if (this.isShuffled) {
            this.currentIndex = Math.floor(Math.random() * this.queue.length);
        } else {
            this.currentIndex = (this.currentIndex + 1) % this.queue.length;
        }

        this.playSong(this.queue[this.currentIndex]);
    }

    /**
     * Play previous song
     */
    playPrevious() {
        if (this.queue.length === 0) return;

        this.currentIndex = (this.currentIndex - 1 + this.queue.length) % this.queue.length;
        this.playSong(this.queue[this.currentIndex]);
    }

    /**
     * Toggle shuffle mode
     */
    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        this.shuffleBtn.classList.toggle('active', this.isShuffled);
        console.log('🔀 Shuffle:', this.isShuffled ? 'ON' : 'OFF');
    }

    /**
     * Toggle repeat mode
     */
    toggleRepeat() {
        this.repeatMode = (this.repeatMode + 1) % 3;
        
        this.repeatBtn.classList.remove('active');
        if (this.repeatMode === 1) {
            this.repeatBtn.classList.add('active');
            this.repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
        } else if (this.repeatMode === 2) {
            this.repeatBtn.classList.add('active');
            this.repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
            this.repeatBtn.style.opacity = '0.6';
        } else {
            this.repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
            this.repeatBtn.style.opacity = '1';
        }

        console.log('🔁 Repeat mode:', ['OFF', 'ALL', 'ONE'][this.repeatMode]);
    }

    /**
     * Set volume
     * @param {number} value - Volume value (0-100)
     */
    setVolume(value) {
        this.audio.volume = Math.min(1, Math.max(0, value / 100));
    }

    /**
     * Seek to specific position
     * @param {Event} e - Click event
     */
    seek(e) {
        if (!this.audio.duration || isNaN(this.audio.duration)) return;

        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.audio.currentTime = Math.max(0, Math.min(1, percent)) * this.audio.duration;
    }

    /**
     * Start dragging on progress bar
     */
    startDragging(e) {
        if (!this.audio.duration || isNaN(this.audio.duration)) return;
        
        e.preventDefault();
        this.isDragging = true;
        
        const onMouseMove = (moveEvent) => {
            if (!this.isDragging) return;
            
            const rect = this.progressBar.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
            this.audio.currentTime = percent * this.audio.duration;
        };

        const onMouseUp = () => {
            this.isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    /**
     * Update progress bar
     */
    updateProgress() {
        if (!this.audio.duration || isNaN(this.audio.duration) || this.isDragging) return;

        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        this.progressFill.style.width = percent + '%';
        this.progressHandle.style.left = percent + '%';
        
        this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
    }

    /**
     * Update duration display
     */
    updateDuration() {
        const duration = isNaN(this.audio.duration) ? 0 : this.audio.duration;
        this.durationEl.textContent = this.formatTime(duration);
    }

    /**
     * Handle song ended
     */
    handleSongEnded() {
        if (this.repeatMode === 2) {
            // Repeat one
            this.audio.currentTime = 0;
            this.audio.play().catch(e => console.error('❌ Play error:', e));
        } else {
            // Play next
            this.playNext();
        }
    }

    /**
     * Update play/pause button
     */
    updatePlayPauseButton() {
        // Check actual audio state, prioritize isPlaying flag for immediate feedback
        const isCurrentlyPlaying = this.isPlaying || (!this.audio.paused && this.audio.currentTime > 0);
        
        if (isCurrentlyPlaying) {
            this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            this.playPauseBtn.title = 'Pause';
        } else {
            this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            this.playPauseBtn.title = 'Play';
        }
    }

    /**
     * Show queue modal
     */
    showQueue() {
        let html = '';
        
        if (this.queue.length === 0) {
            html = '<p class="text-muted text-center">Queue is empty</p>';
        } else {
            this.queue.forEach((song, index) => {
                const isPlaying = index === this.currentIndex;
                html += `
                    <div class="queue-item ${isPlaying ? 'playing' : ''}" onclick="player.playFromQueue(${index})">
                        <span class="queue-item-number">${index + 1}</span>
                        <div class="queue-item-info">
                            <p class="queue-item-title">${song.title}</p>
                            <p class="queue-item-artist">${song.artist}</p>
                        </div>
                        ${isPlaying ? '<i class="fas fa-music" style="color: #1db954;"></i>' : ''}
                    </div>
                `;
            });
        }

        this.queueList.innerHTML = html;
        this.queueModal.show();
    }

    /**
     * Play song from queue
     * @param {number} index - Index in queue
     */
    playFromQueue(index) {
        if (index >= 0 && index < this.queue.length) {
            this.currentIndex = index;
            this.playSong(this.queue[index]);
        }
    }

    /**
     * Minimize player
     */
    minimizePlayer() {
        this.playerContainer.style.display = 'none';
        console.log('📉 Player minimized');
        
        // Show a floating mini button to restore
        const miniBtn = document.createElement('button');
        miniBtn.className = 'btn btn-sm btn-success';
        miniBtn.id = 'miniPlayerBtn';
        miniBtn.innerHTML = '<i class="fas fa-music"></i>';
        miniBtn.style.position = 'fixed';
        miniBtn.style.bottom = '20px';
        miniBtn.style.right = '20px';
        miniBtn.style.zIndex = '999';
        miniBtn.onclick = () => {
            this.playerContainer.style.display = 'flex';
            miniBtn.remove();
            console.log('📈 Player restored');
        };
        document.body.appendChild(miniBtn);
    }

    /**
     * Format time in MM:SS
     * @param {number} seconds - Seconds
     */
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    /**
     * Get current song info
     */
    getCurrentSong() {
        if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
            return this.queue[this.currentIndex];
        }
        return null;
    }

    /**
     * Handle audio errors
     * @param {Event} error - Error event
     */
    handleAudioError(error) {
        console.error('❌ Audio Error:', error);
        let errorMsg = 'Error loading audio';
        
        if (this.audio.error) {
            switch(this.audio.error.code) {
                case 1: errorMsg = 'Audio loading aborted'; break;
                case 2: errorMsg = 'Network error'; break;
                case 3: errorMsg = 'Audio decoding failed'; break;
                case 4: errorMsg = 'Audio format not supported'; break;
            }
        }
        
        console.error('❌ Player Error:', errorMsg);
    }
}

// ============================================
// INITIALIZE PLAYER ON PAGE LOAD
// ============================================

let player = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎵 Initializing Music Player...');
    
    // Check if player elements exist
    if (document.getElementById('musicPlayerContainer')) {
        player = new MusicPlayer();
        window.player = player;
        console.log('✅ Music Player ready');
    } else {
        console.warn('⚠️ Music player HTML not found in DOM');
    }
});
