// let playlists = {}, allSongs = [], currentPlaylist = [], currentIndex = 0;
// let isPlaying = false, lyricsData = [];
// let playMode = 'sequence'; 
// let isUserScrolling = false;
// let currentOffset = 0; 
// let recentlyPlayed = [];

// const audio = document.getElementById('audio-player');
// const lyricsContainer = document.getElementById('lyrics-container');
// const lyricsTrack = document.getElementById('lyrics-track');
// const appBg = document.getElementById('app-bg');

// async function init() {
//     try {
//         const response = await fetch('./data.json');
//         playlists = await response.json();
//         Object.keys(playlists).forEach(pName => {
//             playlists[pName].forEach((s, i) => allSongs.push({ ...s, playlistId: pName, songIndex: i }));
//         });

//         loadRecentlyPlayed();
//         renderNav();
//         initDrawer(); 
//         initSearch();
//         initLyricsInteraction();
//         initControls();
//         await restoreState();
        
//         window.addEventListener('hashchange', handleRoute);
//     } catch (e) { console.error("Init Error:", e); }
// }

// function loadRecentlyPlayed() {
//     const stored = localStorage.getItem('recently_played');
//     if (stored) {
//         recentlyPlayed = JSON.parse(stored);
//     }
// }

// function saveRecentlyPlayed(song) {
//     const exists = recentlyPlayed.findIndex(s => s.file === song.file);
//     if (exists !== -1) {
//         recentlyPlayed.splice(exists, 1);
//     }
//     recentlyPlayed.unshift(song);
//     recentlyPlayed = recentlyPlayed.slice(0, 10);
//     localStorage.setItem('recently_played', JSON.stringify(recentlyPlayed));
// }

// function initDrawer() {
//     const drawer = document.getElementById('mobile-nav-drawer');
//     const toggle = document.getElementById('mobile-playlist-toggle');
//     const overlay = document.getElementById('drawer-overlay');
//     const closeBtn = document.getElementById('close-drawer');

//     const open = () => drawer.classList.add('active');
//     const close = () => drawer.classList.remove('active');

//     if(toggle) toggle.onclick = open;
//     if(overlay) overlay.onclick = close;
//     if(closeBtn) closeBtn.onclick = close;
// }

// async function restoreState() {
//     selectHome();
    
//     const last = JSON.parse(localStorage.getItem('music_last_state'));
//     if (last && playlists[last.playlistId]) {
//         currentPlaylist = playlists[last.playlistId];
//         currentIndex = last.index;
//         const song = currentPlaylist[currentIndex];
//         updatePlayerUI(song);
//         audio.src = song.file;
//         audio.currentTime = last.time; 
//         loadLyrics(song.file.replace(/\.(mp3|flac|wav|ogg)$/i, '.lrc'));
//     }
// }

// function saveState() {
//     if (!currentPlaylist[currentIndex]) return;
//     localStorage.setItem('music_last_state', JSON.stringify({
//         playlistId: decodeURIComponent(window.location.hash.substring(1)),
//         index: currentIndex, time: audio.currentTime
//     }));
// }
// setInterval(saveState, 5000);

// function updatePlayerUI(song) {
//     document.getElementById('mini-title').innerText = song.title;
//     document.getElementById('mini-artist').innerText = song.artist;
//     document.getElementById('mini-cover').src = song.cover;

//     document.getElementById('full-title').innerText = song.title;
//     document.getElementById('full-artist').innerText = song.artist;
//     document.getElementById('full-album').innerText = song.album || "Unknown Album";
//     document.getElementById('full-cover').src = song.cover;
    
//     appBg.style.backgroundImage = `url('${song.cover}')`;
//     appBg.style.opacity = '1';

//     audio.onloadedmetadata = () => {
//         document.getElementById('time-duration').innerText = formatTime(audio.duration);
//     };
// }

// async function playSong(index) {
//     currentIndex = index;
//     const song = currentPlaylist[index];
//     updatePlayerUI(song);
//     audio.src = song.file;
    
//     saveRecentlyPlayed(song);
    
//     isUserScrolling = false;
//     document.getElementById('btn-sync-lyrics').style.display = 'none';
//     currentOffset = 0; 
//     updateLyricsTransform(0);

//     try {
//         await audio.play();
//         isPlaying = true;
//     } catch (e) { console.warn("Auto-play blocked"); }
//     updatePlayState();
//     loadLyrics(song.file.replace(/\.(mp3|flac|wav|ogg)$/i, '.lrc'));
// }

// function togglePlay() {
//     audio.paused ? audio.play() : audio.pause();
//     isPlaying = !audio.paused;
//     updatePlayState();
// }

// function updatePlayState() {
//     const icon = isPlaying ? 'pause' : 'play_arrow';
//     const iconFull = isPlaying ? 'pause_circle' : 'play_circle';
//     document.querySelector('#btn-play-mini span').innerText = icon;
//     document.querySelector('#btn-play-full span').innerText = iconFull;
// }

// async function loadLyrics(url) {
//     lyricsTrack.innerHTML = '<p class="lyric-line" style="text-align:center">Loading...</p>';
//     lyricsData = [];
    
//     try {
//         const res = await fetch(url);
//         if(!res.ok) throw new Error("No lyrics");
//         const text = await res.text();
//         parseLyrics(text);
//     } catch (e) {
//         lyricsTrack.innerHTML = '<p class="lyric-line" style="text-align:center">暂无歌词</p>';
//         lyricsData = [];
//     }
// }

// function parseLyrics(text) {
//     const lines = text.split('\n');
//     const tempMap = new Map();
    
//     lines.forEach(line => {
//         const match = /\[(\d{2}):(\d{2})(\.\d{2,3})?\]/.exec(line);
//         if (match) {
//             const time = parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3] ? parseFloat(match[3]) : 0);
//             const content = line.replace(/\[.*?\]/g, '').trim();
//             if (content) {
//                 if (tempMap.has(time)) {
//                     tempMap.set(time, tempMap.get(time) + `<span class="lyric-sub">${content}</span>`);
//                 } else {
//                     tempMap.set(time, content);
//                 }
//             }
//         }
//     });

//     lyricsData = Array.from(tempMap.entries())
//         .map(([time, text]) => ({ time, text }))
//         .sort((a, b) => a.time - b.time);

//     lyricsTrack.innerHTML = lyricsData.map((l, i) => 
//         `<div class="lyric-line" id="lrc-${i}" onclick="seekFromLyric(${l.time})">${l.text}</div>`
//     ).join('');

//     syncLyrics(true); 
// }

// function initLyricsInteraction() {
//     const handleScroll = (deltaY) => {
//         if(lyricsData.length === 0) return;
//         isUserScrolling = true;
//         document.getElementById('btn-sync-lyrics').style.display = 'flex';
//         currentOffset -= deltaY * 0.6; 
//         updateLyricsTransform(currentOffset);
//     };

//     lyricsContainer.addEventListener('wheel', (e) => handleScroll(e.deltaY), { passive: true });
    
//     let touchStartY = 0;
//     lyricsContainer.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
//     lyricsContainer.addEventListener('touchmove', (e) => {
//         const delta = touchStartY - e.touches[0].clientY;
//         touchStartY = e.touches[0].clientY;
//         handleScroll(delta);
//     }, { passive: true });
// }

// function updateLyricsTransform(offset) {
//     lyricsTrack.style.transform = `translateY(${offset}px)`;
// }

// function syncLyrics(force = false) {
//     if ((isUserScrolling && !force) || lyricsData.length === 0) return;

//     let activeIndex = -1;
//     const ct = audio.currentTime;
    
//     for (let i = 0; i < lyricsData.length; i++) {
//         if (ct >= lyricsData[i].time) activeIndex = i;
//         else break;
//     }

//     const lines = lyricsTrack.querySelectorAll('.lyric-line');
//     lines.forEach(l => l.classList.remove('active'));

//     if (activeIndex !== -1) {
//         if(lines[activeIndex]) lines[activeIndex].classList.add('active');
//         const activeLine = document.getElementById(`lrc-${activeIndex}`);
//         if (activeLine) {
//             const containerCenter = lyricsContainer.clientHeight / 2;
//             const targetOffset = containerCenter - activeLine.offsetTop - (activeLine.clientHeight / 2);
//             currentOffset = targetOffset;
//             updateLyricsTransform(currentOffset);
//         }
//     }
// }

// window.seekFromLyric = function(time) {
//     audio.currentTime = time;
//     isUserScrolling = false; 
//     document.getElementById('btn-sync-lyrics').style.display = 'none';
//     if (!isPlaying) togglePlay();
//     syncLyrics(true); 
// };

// window.downloadSong = function(file, title) {
//     const a = document.createElement('a');
//     a.href = file;
//     a.download = title + file.substring(file.lastIndexOf('.'));
//     a.click();
// };

// function initControls() {
//     const toggleFunc = (e) => { e.stopPropagation(); togglePlay(); };
//     document.getElementById('btn-play-mini').onclick = toggleFunc;
//     document.getElementById('btn-play-full').onclick = toggleFunc;

//     const prevFunc = (e) => { 
//         if(e) e.stopPropagation(); 
//         handleTrackChange('prev'); 
//     };
//     const nextFunc = (e) => { 
//         if(e) e.stopPropagation(); 
//         handleTrackChange('next'); 
//     };
    
//     document.getElementById('btn-prev-mini').onclick = prevFunc;
//     document.getElementById('btn-next-mini').onclick = nextFunc;
//     document.getElementById('btn-prev-full').onclick = prevFunc;
//     document.getElementById('btn-next-full').onclick = nextFunc;

//     document.getElementById('full-progress-wrapper').onclick = (e) => {
//         e.stopPropagation();
//         const rect = e.currentTarget.getBoundingClientRect();
//         audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
//     };

//     document.getElementById('mini-player').onclick = () => document.getElementById('lyrics-overlay').classList.add('open');
//     document.getElementById('btn-close-lyrics').onclick = (e) => {
//         e.stopPropagation();
//         document.getElementById('lyrics-overlay').classList.remove('open');
//     };

//     document.getElementById('btn-sync-lyrics').onclick = (e) => {
//         e.stopPropagation();
//         isUserScrolling = false;
//         e.currentTarget.style.display = 'none';
//         syncLyrics(true);
//     };

//     audio.addEventListener('timeupdate', () => {
//         if (!audio.duration) return;
//         const pct = (audio.currentTime / audio.duration) * 100;
//         document.getElementById('mini-progress-fill').style.width = pct + '%';
//         document.getElementById('full-progress-fill').style.width = pct + '%';
//         document.getElementById('time-current').innerText = formatTime(audio.currentTime);
//         syncLyrics(); 
//     });
//     audio.addEventListener('ended', () => {
//         if (playMode === 'single') {
//             audio.currentTime = 0;
//             audio.play();
//         } else {
//             handleTrackChange('next', true);
//         }
//     });

//     const modeModal = document.getElementById('mode-modal');
//     const modeBtn = document.getElementById('btn-mode');
//     const modeBtnMini = document.getElementById('btn-mode-mini');
//     const modeOverlay = document.getElementById('mode-overlay');
//     const modeClose = document.getElementById('mode-close');

//     const openModal = (e) => {
//         e.stopPropagation();
//         modeModal.classList.add('active');
//     };

//     if(modeBtn) modeBtn.onclick = openModal;
//     if(modeBtnMini) modeBtnMini.onclick = openModal;

//     const closeModal = () => modeModal.classList.remove('active');
//     if(modeOverlay) modeOverlay.onclick = closeModal;
//     if(modeClose) modeClose.onclick = closeModal;

//     document.querySelectorAll('.mode-item').forEach(item => {
//         item.onclick = () => {
//             playMode = item.dataset.mode;
//             document.querySelectorAll('.mode-item').forEach(el => el.classList.remove('active'));
//             item.classList.add('active');
//             updateModeIcon();
//             closeModal();
//         };
//     });
// }

// function handleTrackChange(direction, isAuto = false) {
//     let nextIndex = currentIndex;
//     const len = currentPlaylist.length;
//     if(len === 0) return;

//     if (playMode === 'random') {
//         if (len > 1) {
//             do {
//                 nextIndex = Math.floor(Math.random() * len);
//             } while (nextIndex === currentIndex);
//         }
//     } else {
//         if (direction === 'next') {
//             nextIndex = (currentIndex + 1) % len;
//         } else {
//             nextIndex = (currentIndex - 1 + len) % len;
//         }
//     }
//     playSong(nextIndex);
// }

// function updateModeIcon() {
//     const iconMap = {
//         'sequence': 'repeat',
//         'single': 'repeat_one',
//         'random': 'shuffle'
//     };
//     const btnSpan = document.querySelector('#btn-mode span');
//     const btnMiniSpan = document.querySelector('#btn-mode-mini span');
    
//     if(btnSpan) btnSpan.innerText = iconMap[playMode];
//     if(btnMiniSpan) btnMiniSpan.innerText = iconMap[playMode];
// }

// function renderNav() {
//     const html = Object.keys(playlists).map(key => `
//         <div class="nav-item" data-id="${key}" onclick="selectPlaylist('${key}')">
//             <span class="material-icons">folder</span><span>${key}</span>
//         </div>
//     `).join('');
    
//     document.getElementById('playlist-nav').innerHTML = html;
//     document.getElementById('mobile-playlist-nav').innerHTML = html;
// }

// window.selectHome = () => {
//     window.location.hash = '';
//     document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
//     document.getElementById('playlist-title').innerText = '首页';
//     document.getElementById('mobile-nav-drawer').classList.remove('active');
//     renderHome();
// };

// function renderHome() {
//     const welcomeHour = new Date().getHours();
//     let greeting = '早上好';
//     if (welcomeHour >= 12 && welcomeHour < 18) greeting = '下午好';
//     else if (welcomeHour >= 18) greeting = '晚上好';

//     let html = `
//         <div class="home-container">
//             <div class="welcome-card">
//                 <h2>${greeting}！</h2>
//                 <p>欢迎使用 Material Music Pro，享受你的音乐时光</p>
//             </div>
//     `;

//     if (recentlyPlayed.length > 0) {
//         html += `<div class="section-title">最近播放</div>`;
//         html += '<div class="song-list-container">';
//         recentlyPlayed.forEach((song, i) => {
//     html += `
//         <div class="song-item" onclick="event.stopPropagation(); playFromRecent(${i})">
//                     <img src="${song.cover}" class="song-cover-mini" onerror="this.src='https://via.placeholder.com/150'">
//                     <div class="song-info"><b>${song.title}</b><small>${song.artist}</small></div>
//                     <button class="download-btn" onclick="event.stopPropagation(); downloadSong('${song.file}', '${song.title}')">
//                         <span class="material-icons">download</span>
//                     </button>
//                 </div>
//             `;
//         });
//         html += '</div>';
//     } else {
//         html += '<p style="color: var(--text-secondary); text-align: center; margin-top: 40px;">暂无播放记录，开始探索音乐吧！</p>';
//     }

//     html += '</div>';
//     document.getElementById('song-list').innerHTML = html;
// }

// window.playFromRecent = (index) => {
//     const song = recentlyPlayed[index];
    
//     // 直接使用 recentlyPlayed 中保存的完整歌曲信息
//     if (song && song.file) {
//         // 如果有播放列表ID，尝试切换到该播放列表
//         if (song.playlistId && playlists[song.playlistId]) {
//             currentPlaylist = playlists[song.playlistId];
//             const songIndex = currentPlaylist.findIndex(s => s.file === song.file);
//             if (songIndex !== -1) {
//                 currentIndex = songIndex;
//             }
//         }
        
//         // 直接播放歌曲
//         updatePlayerUI(song);
//         audio.src = song.file;
//         audio.load();
//         audio.play().then(() => {
//             isPlaying = true;
//             updatePlayState();
//         }).catch(err => {
//             console.error('播放失败:', err);
//         });
        
//         loadLyrics(song.file.replace(/\.(mp3|flac|wav|ogg)$/i, '.lrc'));
//         saveState();
//     }
// };

// window.selectPlaylist = (key) => {
//     window.location.hash = key;
//     document.getElementById('mobile-nav-drawer').classList.remove('active');
//     handleRoute();
// };

// function handleRoute() {
//     const hash = decodeURIComponent(window.location.hash.substring(1));
//     if (!hash) {
//         selectHome();
//         return;
//     }
//     if (hash && playlists[hash]) {
//         currentPlaylist = playlists[hash];
//         document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.id === hash));
//         document.getElementById('playlist-title').innerText = hash;
//         renderSongList(currentPlaylist);
//     }
// }

// function addToRecentlyPlayed(song) {
//     // 移除重复项
//     recentlyPlayed = recentlyPlayed.filter(s => s.file !== song.file);
//     // 添加到开头，保存完整的歌曲对象
//     recentlyPlayed.unshift({
//         ...song,  // 保存完整的歌曲信息
//         playlistId: window.location.hash.slice(1) || 'all'
//     });
//     // 只保留最近20首
//     if (recentlyPlayed.length > 20) {
//         recentlyPlayed.pop();
//     }
//     localStorage.setItem('music_recently_played', JSON.stringify(recentlyPlayed));
// }

// function initSearch() {
//     const input = document.getElementById('search-input');
//     if(!input) return;
//     input.oninput = (e) => {
//         const q = e.target.value.toLowerCase().trim();
//         if (!q) { handleRoute(); return; }
//         const f = allSongs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
//         renderSongList(f, true);
//     };
// }

// function renderSongList(songs, isSearch = false) {
//     const sorted = [...songs].sort((a, b) => a.title.localeCompare(b.title));
//     document.getElementById('song-list').innerHTML = sorted.map((s, i) => `
//         <div class="song-item" onclick="event.stopPropagation(); ${isSearch ? `playFromSearch('${s.playlistId}', ${s.songIndex})` : `playSong(${songs.indexOf(s)})`}">
//             <img src="${s.cover}" class="song-cover-mini" onerror="this.src='https://via.placeholder.com/150'">
//             <div class="song-info"><b>${s.title}</b><small>${s.artist}</small></div>
//             <button class="download-btn" onclick="event.stopPropagation(); downloadSong('${s.file}', '${s.title}')">
//                 <span class="material-icons">download</span>
//             </button>
//         </div>
//     `).join('');
// }

// window.playFromSearch = (pid, idx) => {
//     window.location.hash = pid;
//     currentPlaylist = playlists[pid];
//     playSong(idx);
// };

// function formatTime(s) {
//     return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
// }

// init();
let playlists = {}, allSongs = [], currentPlaylist = [], currentIndex = 0;
let isPlaying = false, lyricsData = [];
let playMode = 'sequence'; 
let isUserScrolling = false;
let currentOffset = 0; 
let recentlyPlayed = [];

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

        loadRecentlyPlayed();
        renderNav();
        initDrawer(); 
        initSearch();
        initLyricsInteraction();
        initControls();
        await restoreState();
        window.addEventListener('hashchange', handleRoute);
    } catch (e) { console.error("Init Error:", e); }
}

function loadRecentlyPlayed() {
    const stored = localStorage.getItem('recently_played');
    if (stored) {
        recentlyPlayed = JSON.parse(stored);
    }
}

function saveRecentlyPlayed(song) {
    const exists = recentlyPlayed.findIndex(s => s.file === song.file);
    if (exists !== -1) {
        recentlyPlayed.splice(exists, 1);
    }
    recentlyPlayed.unshift(song);
    recentlyPlayed = recentlyPlayed.slice(0, 10);
    localStorage.setItem('recently_played', JSON.stringify(recentlyPlayed));
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
    selectHome();
    
    const last = JSON.parse(localStorage.getItem('music_last_state'));
    if (last && playlists[last.playlistId]) {
        currentPlaylist = playlists[last.playlistId];
        currentIndex = last.index;
        const song = currentPlaylist[currentIndex];
        updatePlayerUI(song);
        audio.src = song.file;
        audio.currentTime = last.time; 
        loadLyrics(song.file.replace(/\.(mp3|flac|wav|ogg)$/i, '.lrc'));
    }
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
    saveRecentlyPlayed(song);
    
    isUserScrolling = false;
    document.getElementById('btn-sync-lyrics').style.display = 'none';
    currentOffset = 0; 
    updateLyricsTransform(0);

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
        lyricsTrack.innerHTML = '<p class="lyric-line" style="text-align:center">暂无歌词</p>';lyricsData = [];
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

window.downloadSong = function(file, title) {
    const a = document.createElement('a');
    a.href = file;
    a.download = title + file.substring(file.lastIndexOf('.'));
    a.click();
};

function initControls() {
    const toggleFunc = (e) => { e.stopPropagation(); togglePlay(); };
    document.getElementById('btn-play-mini').onclick = toggleFunc;
    document.getElementById('btn-play-full').onclick = toggleFunc;

    const prevFunc = (e) => { 
        if(e) e.stopPropagation(); 
        handleTrackChange('prev', false); 
    };
    const nextFunc = (e) => { 
        if(e) e.stopPropagation(); 
        handleTrackChange('next', false); 
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

    // 音量按钮
    const volumeBtn = document.querySelector('.playback-controls .icon-btn:last-child');
    if (volumeBtn) {
        volumeBtn.onclick = (e) => {
            e.stopPropagation();
            audio.muted = !audio.muted;
            const icon = volumeBtn.querySelector('span');
            icon.innerText = audio.muted ? 'volume_off' : 'volume_up';};
    }

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

    const openModal = (e) => {
        e.stopPropagation();
        modeModal.classList.add('active');
    };

    if(modeBtn) modeBtn.onclick = openModal;

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
        };
    });
}

function handleTrackChange(direction, isAuto = false) {
    let nextIndex = currentIndex;
    const len = currentPlaylist.length;
    if(len === 0) return;

    if (playMode === 'random_list') {
        // 列表随机
        if (len > 1) {
            do {
                nextIndex = Math.floor(Math.random() * len);
            } while (nextIndex === currentIndex);
        }
    } else if (playMode === 'random_all') {
        // 全部随机
        if (allSongs.length > 1) {
            const randomSong = allSongs[Math.floor(Math.random() * allSongs.length)];
            if (playlists[randomSong.playlistId]) {
                currentPlaylist = playlists[randomSong.playlistId];
                nextIndex = randomSong.songIndex;
            }
        }
    } else if (playMode === 'single') {
        // 单曲循环在ended事件处理
        if (!isAuto) {
            nextIndex = direction === 'next' ? (currentIndex + 1) % len : (currentIndex - 1 + len) % len;
        }
    } else {
        // sequence 顺序播放
        if (direction === 'next') {
            if (currentIndex < len - 1) {
                nextIndex = currentIndex + 1;
            } else if (!isAuto) {
                nextIndex = 0; // 手动点击循环
            } else {
                return; // 自动播放完毕停止
            }
        } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : len - 1; // 手动上一曲循环
        }
    }
    
    playSong(nextIndex);
}

function updateModeIcon() {
    const iconMap = {
        'sequence': 'repeat',
        'single': 'repeat_one',
        'random_list': 'shuffle',
        'random_all': 'shuffle'
    };
    const btnSpan = document.querySelector('#btn-mode span');
    if(btnSpan) btnSpan.innerText = iconMap[playMode];
}

function renderNav() {
    const html = Object.keys(playlists).map(key => `
        <div class="nav-item" data-id="${key}" onclick="selectPlaylist('${key}')">
            <span class="material-icons">folder</span><span>${key}</span>
        </div>
    `).join('');
    
    document.getElementById('playlist-nav').innerHTML = html;
    document.getElementById('mobile-playlist-nav').innerHTML = html;
}

window.selectHome = () => {
    window.location.hash = '';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('playlist-title').innerText = '首页';
    document.getElementById('mobile-nav-drawer').classList.remove('active');
    renderHome();
};

function renderHome() {
    const welcomeHour = new Date().getHours();
    let greeting = '早上好';
    if (welcomeHour >= 12 && welcomeHour < 18) greeting = '下午好';
    else if (welcomeHour >= 18) greeting = '晚上好';

    let html = `
        <div class="home-container">
            <div class="welcome-card">
                <h2>${greeting}！</h2>
                <p>欢迎使用 Material Music Pro，享受你的音乐时光</p>
            </div>
    `;

    if (recentlyPlayed.length > 0) {
        html += `<div class="section-title">最近播放</div>`;
        html += '<div class="song-list-container">';
        recentlyPlayed.forEach((song, i) => {
            html += `
                <div class="song-item" onclick="event.stopPropagation(); playFromRecent(${i})">
                    <img src="${song.cover}" class="song-cover-mini" onerror="this.src='https://via.placeholder.com/150'">
                    <div class="song-info"><b>${song.title}</b><small>${song.artist}</small></div>
                    <button class="download-btn" onclick="event.stopPropagation(); downloadSong('${song.file}', '${song.title}')">
                        <span class="material-icons">download</span>
                    </button>
                </div>
            `;
        });
        html += '</div>';
    } else {
        html += '<p style="color: var(--text-secondary); text-align: center; margin-top: 40px;">暂无播放记录，开始探索音乐吧！</p>';
    }

    html += '</div>';
    document.getElementById('song-list').innerHTML = html;
}

window.playFromRecent = (index) => {
    const song = recentlyPlayed[index];
    if (song && song.file) {
        if (song.playlistId && playlists[song.playlistId]) {
            currentPlaylist = playlists[song.playlistId];
            const songIndex = currentPlaylist.findIndex(s => s.file === song.file);
            if (songIndex !== -1) {
                playSong(songIndex);
                return;
            }
        }
        
        // 如果找不到播放列表，使用全部歌曲
        currentPlaylist = allSongs;
        const songIndex = allSongs.findIndex(s => s.file === song.file);
        if (songIndex !== -1) {
            playSong(songIndex);
        }
    }
};
window.selectPlaylist = (key) => {
    window.location.hash = key;
    document.getElementById('mobile-nav-drawer').classList.remove('active');
    handleRoute();
};

function handleRoute() {
    const hash = decodeURIComponent(window.location.hash.substring(1));
    if (!hash) {
        selectHome();
        return;
    }
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
    const sorted = [...songs].sort((a, b) => a.title.localeCompare(b.title));
    document.getElementById('song-list').innerHTML = sorted.map((s, i) => `
        <div class="song-item" onclick="event.stopPropagation(); ${isSearch ? `playFromSearch('${s.playlistId}', ${s.songIndex})` : `playSong(${songs.indexOf(s)})`}">
            <img src="${s.cover}" class="song-cover-mini" onerror="this.src='https://via.placeholder.com/150'">
            <div class="song-info"><b>${s.title}</b><small>${s.artist}</small></div>
            <button class="download-btn" onclick="event.stopPropagation(); downloadSong('${s.file}', '${s.title}')">
                <span class="material-icons">download</span>
            </button>
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