/**
 * Material Music Pro - 最终完美修复版
 */

let playlists = {}, allSongs = [], currentPlaylist = [], currentIndex = 0;
let isPlaying = false, lyricsData = [];
let playMode = 'sequence'; 

// 滚动锁变量
let isUserScrolling = false;
let currentOffset = 0; 

const audio = document.getElementById('audio-player');
const lyricsContainer = document.getElementById('lyrics-container');
const lyricsTrack = document.getElementById('lyrics-track');
const appBg = document.getElementById('app-bg');

async function init() {
    try {
        const response = await fetch('./data.json');
        playlists = await response.json();
        
        Object.keys(playlists).forEach(pName => {
            playlists[pName].forEach((s, i) => allSongs.push({ ...s, playlistId: pName, songIndex: i }));
        });

        renderNav();
        initDrawer(); 
        initSearch();
        initLyricsInteraction();
        initControls();
        await restoreState();
        
        window.addEventListener('hashchange', handleRoute);
    } catch (e) { console.error("Init Error:", e); }
}

function initDrawer() {
    const drawer = document.getElementById('mobile-nav-drawer');
    const toggle = document.getElementById('mobile-playlist-toggle');
    const overlay = document.getElementById('drawer-overlay');
    const closeBtn = document.getElementById('close-drawer');

    const open = () => drawer.classList.add('active');
    const close = () => drawer.classList.remove('active');

    if(toggle) toggle.onclick = open;
    if(overlay) overlay.onclick = close;
    if(closeBtn) closeBtn.onclick = close;
}

async function restoreState() {
    const last = JSON.parse(localStorage.getItem('music_last_state'));
    if (last && playlists[last.playlistId]) {
        window.location.hash = last.playlistId;
        currentPlaylist = playlists[last.playlistId];
        currentIndex = last.index;
        const song = currentPlaylist[currentIndex];
        updatePlayerUI(song);
        audio.src = song.file;
        audio.currentTime = last.time; 
        loadLyrics(song.file.replace(/\.(mp3|flac|wav|ogg)$/i, '.lrc'));
    } else { handleRoute(); }
}

function saveState() {
    if (!currentPlaylist[currentIndex]) return;
    localStorage.setItem('music_last_state', JSON.stringify({
        playlistId: decodeURIComponent(window.location.hash.substring(1)),
        index: currentIndex, time: audio.currentTime
    }));
}
setInterval(saveState, 5000);

function updatePlayerUI(song) {
    document.getElementById('mini-title').innerText = song.title;
    document.getElementById('mini-artist').innerText = song.artist;
    document.getElementById('mini-cover').src = song.cover;
    document.getElementById('mini-cover').classList.remove('hidden');

    document.getElementById('full-title').innerText = song.title;
    document.getElementById('full-artist').innerText = song.artist;
    document.getElementById('full-album').innerText = song.album || "Unknown Album";
    document.getElementById('full-cover').src = song.cover;
    
    appBg.style.backgroundImage = `url('${song.cover}')`;
    appBg.style.opacity = '1';

    audio.onloadedmetadata = () => {
        document.getElementById('time-duration').innerText = formatTime(audio.duration);
    };
}

async function playSong(index) {
    currentIndex = index;
    const song = currentPlaylist[index];
    updatePlayerUI(song);
    audio.src = song.file;
    
    // --- 切歌重置逻辑 ---
    isUserScrolling = false; // 解除用户滚动锁
    document.getElementById('btn-sync-lyrics').style.display = 'none'; // 隐藏恢复按钮
    currentOffset = 0; 
    updateLyricsTransform(0); // 歌词归位
    // ------------------

    try {
        await audio.play();
        isPlaying = true;
    } catch (e) { console.warn("Auto-play blocked"); }
    updatePlayState();
    loadLyrics(song.file.replace(/\.(mp3|flac|wav|ogg)$/i, '.lrc'));
}

function togglePlay() {
    audio.paused ? audio.play() : audio.pause();
    isPlaying = !audio.paused;
    updatePlayState();
}

function updatePlayState() {
    const icon = isPlaying ? 'pause' : 'play_arrow';
    const iconFull = isPlaying ? 'pause_circle' : 'play_circle';
    document.querySelector('#btn-play-mini span').innerText = icon;
    document.querySelector('#btn-play-full span').innerText = iconFull;
}

async function loadLyrics(url) {
    lyricsTrack.innerHTML = '<p class="lyric-line" style="text-align:center">Loading...</p>';
    lyricsData = [];
    
    try {
        const res = await fetch(url);
        if(!res.ok) throw new Error("No lyrics");
        const text = await res.text();
        parseLyrics(text);
    } catch (e) {
        lyricsTrack.innerHTML = '<p class="lyric-line" style="text-align:center">暂无歌词</p>';
        lyricsData = [];
    }
}

function parseLyrics(text) {
    const lines = text.split('\n');
    const tempMap = new Map();
    
    lines.forEach(line => {
        const match = /\[(\d{2}):(\d{2})(\.\d{2,3})?\]/.exec(line);
        if (match) {
            const time = parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3] ? parseFloat(match[3]) : 0);
            const content = line.replace(/\[.*?\]/g, '').trim();
            if (content) {
                if (tempMap.has(time)) {
                    tempMap.set(time, tempMap.get(time) + `<span class="lyric-sub">${content}</span>`);
                } else {
                    tempMap.set(time, content);
                }
            }
        }
    });

    lyricsData = Array.from(tempMap.entries())
        .map(([time, text]) => ({ time, text }))
        .sort((a, b) => a.time - b.time);

    lyricsTrack.innerHTML = lyricsData.map((l, i) => 
        `<div class="lyric-line" id="lrc-${i}" onclick="seekFromLyric(${l.time})">${l.text}</div>`
    ).join('');

    // --- 修复关键：解析完立即对齐一次，防止歌词不显示选中态 ---
    syncLyrics(true); 
}

function initLyricsInteraction() {
    const handleScroll = (deltaY) => {
        if(lyricsData.length === 0) return;
        isUserScrolling = true;
        document.getElementById('btn-sync-lyrics').style.display = 'flex';
        currentOffset -= deltaY * 0.6; 
        updateLyricsTransform(currentOffset);
    };

    lyricsContainer.addEventListener('wheel', (e) => handleScroll(e.deltaY), { passive: true });
    
    let touchStartY = 0;
    lyricsContainer.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
    lyricsContainer.addEventListener('touchmove', (e) => {
        const delta = touchStartY - e.touches[0].clientY;
        touchStartY = e.touches[0].clientY;
        handleScroll(delta);
    }, { passive: true });
}

function updateLyricsTransform(offset) {
    lyricsTrack.style.transform = `translateY(${offset}px)`;
}

function syncLyrics(force = false) {
    if ((isUserScrolling && !force) || lyricsData.length === 0) return;

    let activeIndex = -1;
    const ct = audio.currentTime;
    
    for (let i = 0; i < lyricsData.length; i++) {
        if (ct >= lyricsData[i].time) activeIndex = i;
        else break;
    }

    const lines = lyricsTrack.querySelectorAll('.lyric-line');
    lines.forEach(l => l.classList.remove('active'));

    if (activeIndex !== -1) {
        if(lines[activeIndex]) lines[activeIndex].classList.add('active');
        
        const activeLine = document.getElementById(`lrc-${activeIndex}`);
        if (activeLine) {
            const containerCenter = lyricsContainer.clientHeight / 2;
            const targetOffset = containerCenter - activeLine.offsetTop - (activeLine.clientHeight / 2);
            currentOffset = targetOffset;
            updateLyricsTransform(currentOffset);
        }
    }
}

window.seekFromLyric = function(time) {
    audio.currentTime = time;
    isUserScrolling = false; 
    document.getElementById('btn-sync-lyrics').style.display = 'none';
    if (!isPlaying) togglePlay();
    syncLyrics(true); 
};

function initControls() {
    const toggleFunc = (e) => { e.stopPropagation(); togglePlay(); };
    document.getElementById('btn-play-mini').onclick = toggleFunc;
    document.getElementById('btn-play-full').onclick = toggleFunc;

    const prevFunc = (e) => { 
        if(e) e.stopPropagation(); 
        handleTrackChange('prev'); 
    };
    const nextFunc = (e) => { 
        if(e) e.stopPropagation(); 
        handleTrackChange('next'); 
    };
    
    document.getElementById('btn-prev-mini').onclick = prevFunc;
    document.getElementById('btn-next-mini').onclick = nextFunc;
    document.getElementById('btn-prev-full').onclick = prevFunc;
    document.getElementById('btn-next-full').onclick = nextFunc;

    document.getElementById('full-progress-wrapper').onclick = (e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    };

    document.getElementById('mini-player').onclick = () => document.getElementById('lyrics-overlay').classList.add('open');
    document.getElementById('btn-close-lyrics').onclick = (e) => {
        e.stopPropagation();
        document.getElementById('lyrics-overlay').classList.remove('open');
    };

    document.getElementById('btn-sync-lyrics').onclick = (e) => {
        e.stopPropagation();
        isUserScrolling = false;
        e.currentTarget.style.display = 'none';
        syncLyrics(true);
    };

    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        const pct = (audio.currentTime / audio.duration) * 100;
        document.getElementById('mini-progress-fill').style.width = pct + '%';
        document.getElementById('full-progress-fill').style.width = pct + '%';
        document.getElementById('time-current').innerText = formatTime(audio.currentTime);
        syncLyrics(); 
    });
    
    audio.addEventListener('ended', () => {
        if (playMode === 'single') {
            audio.currentTime = 0;
            audio.play();
        } else {
            handleTrackChange('next', true);
        }
    });

    const modeModal = document.getElementById('mode-modal');
    const modeBtn = document.getElementById('btn-mode');
    const modeOverlay = document.getElementById('mode-overlay');
    const modeClose = document.getElementById('mode-close');

    if(modeBtn) {
        modeBtn.onclick = (e) => {
            e.stopPropagation();
            modeModal.classList.add('active');
        };
    }

    const closeModal = () => modeModal.classList.remove('active');
    if(modeOverlay) modeOverlay.onclick = closeModal;
    if(modeClose) modeClose.onclick = closeModal;

    document.querySelectorAll('.mode-item').forEach(item => {
        item.onclick = () => {
            playMode = item.dataset.mode;
            document.querySelectorAll('.mode-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            updateModeIcon();
            closeModal();
            if (playMode === 'random_all') {
                switchToAllSongsContext();
            }
        };
    });
}

function handleTrackChange(direction, isAuto = false) {
    let nextIndex = currentIndex;
    const len = currentPlaylist.length;
    if(len === 0) return;

    if (playMode === 'random_list' || playMode === 'random_all') {
        if (len > 1) {
            do {
                nextIndex = Math.floor(Math.random() * len);
            } while (nextIndex === currentIndex);
        }
    } else {
        if (direction === 'next') {
            nextIndex = (currentIndex + 1) % len;
        } else {
            nextIndex = (currentIndex - 1 + len) % len;
        }
    }
    playSong(nextIndex);
}

function updateModeIcon() {
    const iconMap = {
        'sequence': 'repeat',
        'single': 'repeat_one',
        'random_list': 'shuffle_on', 
        'random_all': 'shuffle'     
    };
    const btnSpan = document.querySelector('#btn-mode span');
    if(btnSpan) {
        btnSpan.innerText = iconMap[playMode];
        if(playMode === 'random_all') {
            btnSpan.style.color = 'var(--primary)';
        } else {
            btnSpan.style.color = ''; 
        }
    }
}

function switchToAllSongsContext() {
    const currentSong = currentPlaylist[currentIndex];
    currentPlaylist = allSongs;
    
    if(currentSong) {
        const newIndex = allSongs.findIndex(s => s.file === currentSong.file);
        if (newIndex !== -1) {
            currentIndex = newIndex;
        }
    }
    
    document.getElementById('playlist-title').innerText = "所有歌曲 (随机播放)";
    renderSongList(currentPlaylist);
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
}

function renderNav() {
    const html = Object.keys(playlists).map(key => `
        <div class="nav-item" data-id="${key}" onclick="selectPlaylist('${key}')">
            <span class="material-symbols-rounded">folder</span><span>${key}</span>
        </div>
    `).join('');
    
    document.getElementById('playlist-nav').innerHTML = html;
    document.getElementById('mobile-playlist-nav').innerHTML = html;
}

window.selectPlaylist = (key) => {
    window.location.hash = key;
    document.getElementById('mobile-nav-drawer').classList.remove('active');
    handleRoute();
};

function handleRoute() {
    const hash = decodeURIComponent(window.location.hash.substring(1));
    if (hash && playlists[hash]) {
        currentPlaylist = playlists[hash];
        document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.id === hash));
        document.getElementById('playlist-title').innerText = hash;
        renderSongList(currentPlaylist);
    }
}

function initSearch() {
    const input = document.getElementById('search-input');
    if(!input) return;
    input.oninput = (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (!q) { handleRoute(); return; }
        const f = allSongs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
        renderSongList(f, true);
    };
}

function renderSongList(songs, isSearch = false) {
    document.getElementById('song-list').innerHTML = songs.map((s, i) => `
        <div class="song-item" onclick="event.stopPropagation(); ${isSearch ? `playFromSearch('${s.playlistId}', ${s.songIndex})` : `playSong(${i})`}">
            <img src="${s.cover}" class="song-cover-mini" onerror="this.src='https://via.placeholder.com/150'">
            <div class="song-info"><b>${s.title}</b><small>${s.artist}</small></div>
        </div>
    `).join('');
}

window.playFromSearch = (pid, idx) => {
    window.location.hash = pid;
    currentPlaylist = playlists[pid];
    playSong(idx);
};

function formatTime(s) {
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

init();