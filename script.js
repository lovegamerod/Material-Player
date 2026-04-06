const BASE_PATH = window.location.hostname === 'lovegamerod.github.io'
    ? '/Material-Player'
    : '';

let playlists = {}, allSongs = [], currentPlaylist = [], currentIndex = 0;
let isPlaying = false, lyricsData = [];
let playMode = 'sequence';
let recentlyPlayed = [];

let autoFollowLyrics = true;
let currentActiveIndex = -1;

let currentOffset = 0;
let targetOffset = 0;
let velocity = 0;
let rafId = 0;

let isPointerDown = false;
let isDragging = false;
let pointerDownTargetLine = null;
let startPointerX = 0;
let startPointerY = 0;
let lastPointerY = 0;
let lastMoveTime = 0;

const DRAG_THRESHOLD = 8;
const LONG_PRESS_DELAY = 200;

let longPressTimer = null;
let longPressTriggered = false;

let dragPreviewIndex = -1;

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];
let currentSpeedIndex = 1;

const audio = document.getElementById('audio-player');
const lyricsContainer = document.getElementById('lyrics-container');
const lyricsTrack = document.getElementById('lyrics-track');
const appBg = document.getElementById('app-bg');
const lyricsOverlay = document.getElementById('lyrics-overlay');

let lockedMainScrollTop = 0;

function setOverlayOpenState(open) {
    const mainContent = document.querySelector('.main-content');

    document.documentElement.classList.toggle('overlay-open', open);
    document.body.classList.toggle('overlay-open', open);

    if (lyricsOverlay) {
        lyricsOverlay.classList.toggle('open', open);
    }

    if (mainContent) {
        if (open) {
            lockedMainScrollTop = mainContent.scrollTop;
            mainContent.style.overflow = 'hidden';
            mainContent.style.touchAction = 'none';
        } else {
            mainContent.style.overflow = '';
            mainContent.style.touchAction = '';
            mainContent.scrollTop = lockedMainScrollTop;
        }
    }
}

async function init() {
    try {
        const response = await fetch(`${BASE_PATH}/data.json`);
        playlists = await response.json();

        Object.keys(playlists).forEach(pName => {
            playlists[pName] = playlists[pName].map((s, i) => ({
                ...s,
                file: `${BASE_PATH}/${s.file.replace(/^\//, '')}`,
                cover: `${BASE_PATH}/${s.cover.replace(/^\//, '')}`,
                playlistId: pName,
                songIndex: i
            }));
            playlists[pName].forEach(s => allSongs.push(s));
        });

        loadRecentlyPlayed();
        renderNav();
        initDrawer();
        initSearch();
        initLyricsInteraction();
        initControls();
        initPosterFeature();
        startLyricsAnimationLoop();
        await restoreState();
        window.addEventListener('hashchange', handleRoute);

        const storedRate = parseFloat(localStorage.getItem('music_playback_rate') || '1');
        setPlaybackRate(storedRate);
    } catch (e) {
        console.error('Init Error:', e);
    }
}

function loadRecentlyPlayed() {
    const stored = localStorage.getItem('recently_played');
    if (stored) recentlyPlayed = JSON.parse(stored);
}

function saveRecentlyPlayed(song) {
    const exists = recentlyPlayed.findIndex(s => s.file === song.file);
    if (exists !== -1) recentlyPlayed.splice(exists, 1);
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

    if (toggle) toggle.onclick = open;
    if (overlay) overlay.onclick = close;
    if (closeBtn) closeBtn.onclick = close;
}

async function restoreState() {
    selectHome();

    const last = JSON.parse(localStorage.getItem('music_last_state'));
    if (last && playlists[last.playlistId]) {
        currentPlaylist = playlists[last.playlistId];
        currentIndex = last.index;
        const song = currentPlaylist[currentIndex];
        if (!song) return;

        updatePlayerUI(song);
        await loadSong(song);
        audio.currentTime = last.time || 0;
        loadLyrics(song.file.replace(/\.(mp3|flac|wav|ogg)$/i, '.lrc'));
    }
}

function saveState() {
    if (!currentPlaylist[currentIndex]) return;
    localStorage.setItem('music_last_state', JSON.stringify({
        playlistId: currentPlaylist[currentIndex].playlistId,
        index: currentIndex,
        time: audio.currentTime
    }));
}
setInterval(saveState, 5000);

function updatePlayerUI(song) {
    document.getElementById('mini-title').innerText = song.title;
    document.getElementById('mini-artist').innerText = song.artist;
    document.getElementById('mini-cover').src = song.cover;

    document.getElementById('full-title').innerText = song.title;
    document.getElementById('full-artist').innerText = song.artist;
    document.getElementById('full-cover').src = song.cover;

    if (appBg) {
        appBg.style.backgroundImage = `url('${song.cover}')`;
    }

    applyDynamicThemeFromImage(song.cover);
    updatePosterContent();

    audio.onloadedmetadata = () => {
        document.getElementById('time-duration').innerText = formatTime(audio.duration || 0);
        updatePosterContent();
    };
}

async function loadSong(song) {
    audio.src = song.file;
}

async function playSong(index) {
    currentIndex = index;
    const song = currentPlaylist[index];
    if (!song) return;

    updatePlayerUI(song);
    await loadSong(song);
    saveRecentlyPlayed(song);

    autoFollowLyrics = true;
    currentActiveIndex = -1;
    dragPreviewIndex = -1;

    resetLyricsGestureState();
    velocity = 0;
    currentOffset = 0;
    targetOffset = 0;
    applyLyricsTransform(currentOffset);

    try {
        await audio.play();
        isPlaying = true;
    } catch (e) {
        console.warn('Auto-play blocked');
    }

    updatePlayState();
    loadLyrics(song.file.replace(/\.(mp3|flac|wav|ogg)$/i, '.lrc'));
}

function togglePlay() {
    if (audio.paused) {
        audio.play();
        isPlaying = true;
    } else {
        audio.pause();
        isPlaying = false;
    }
    updatePlayState();
}

function updatePlayState() {
    const icon = isPlaying ? 'pause' : 'play_arrow';
    const iconFull = isPlaying ? 'pause_circle' : 'play_circle';
    document.querySelector('#btn-play-mini span').innerText = icon;
    document.querySelector('#btn-play-full span').innerText = iconFull;
    document.body.classList.toggle('is-playing', isPlaying);
}

async function loadLyrics(url) {
    lyricsTrack.innerHTML = '<p class="lyric-line" style="text-align:center">Loading...</p>';
    lyricsData = [];
    currentActiveIndex = -1;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('No lyrics');
        const text = await res.text();
        parseLyrics(text);
    } catch (e) {
        lyricsTrack.innerHTML = '<p class="lyric-line" style="text-align:center">暂无歌词</p>';
        lyricsData = [];
    }
}

function parseLyrics(text) {
    const lines = text.split('\n').map(v => v.trim()).filter(Boolean);
    const tempMap = new Map();

    for (const line of lines) {
        const timeTags = [...line.matchAll(/\[(\d{2}):(\d{2})(\.\d{2,3})?\]/g)];
        if (!timeTags.length) continue;

        const content = line.replace(/\[.*?\]/g, '').trim();
        if (!content) continue;

        for (const match of timeTags) {
            const time = parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3] ? parseFloat(match[3]) : 0);

            if (!tempMap.has(time)) {
                tempMap.set(time, {
                    main: content,
                    subs: []
                });
            } else {
                tempMap.get(time).subs.push(content);
            }
        }
    }

    lyricsData = Array.from(tempMap.entries())
        .map(([time, value]) => ({
            time,
            main: value.main,
            subs: value.subs
        }))
        .sort((a, b) => a.time - b.time);

    lyricsTrack.innerHTML = lyricsData.map((l, i) => `
        <div class="lyric-line" id="lrc-${i}" data-time="${l.time}">
            <div class="lyric-main">
                <span class="lyric-text lyric-base">${escapeHtml(l.main)}</span>
                <span class="lyric-text lyric-fill">${escapeHtml(l.main)}</span>
            </div>
            ${l.subs.map(sub => `<div class="lyric-sub">${escapeHtml(sub)}</div>`).join('')}
        </div>
    `).join('');

    requestAnimationFrame(() => {
        autoFollowLyrics = true;
        currentActiveIndex = -1;
        dragPreviewIndex = -1;
        velocity = 0;
        currentOffset = 0;
        targetOffset = 0;
        updateLyricsByTime(true);
        updatePseudoWordHighlight();
    });
}

function escapeHtml(str = '') {
    return str
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function startLyricsAnimationLoop() {
    const tick = () => {
        updateOffsetPhysics();
        updatePseudoWordHighlight();
        rafId = requestAnimationFrame(tick);
    };
    if (!rafId) tick();
}

function updateOffsetPhysics() {
    if (!lyricsContainer || !lyricsTrack) return;

    if (isDragging) {
        applyLyricsTransform(currentOffset);
        updateDragPreviewLine();
        return;
    }

    clearDragPreviewLine();

    if (Math.abs(velocity) > 0.02) {
        targetOffset += velocity;
        velocity *= 0.92;
    } else {
        velocity = 0;
    }

    targetOffset = clampLyricsOffset(targetOffset);

    const lerp = autoFollowLyrics ? 0.18 : 0.14;
    currentOffset += (targetOffset - currentOffset) * lerp;

    if (Math.abs(targetOffset - currentOffset) < 0.08) {
        currentOffset = targetOffset;
    }

    applyLyricsTransform(currentOffset);
}

function applyLyricsTransform(offset) {
    lyricsTrack.style.transform = `translate3d(0, ${offset}px, 0)`;
}

function clearLongPressTimer() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
}

function resetLyricsGestureState() {
    clearLongPressTimer();
    isPointerDown = false;
    isDragging = false;
    pointerDownTargetLine = null;
    startPointerX = 0;
    startPointerY = 0;
    lastPointerY = 0;
    lastMoveTime = 0;
    longPressTriggered = false;
    lyricsContainer?.classList.remove('dragging');
    lyricsContainer?.classList.remove('show-guide');
    clearDragPreviewLine();
}

function seekToLyricTime(time) {
    if (!Number.isFinite(time)) return;

    audio.currentTime = time;
    autoFollowLyrics = true;
    velocity = 0;
    updateLyricsByTime(true);

    if (audio.paused) {
        audio.play();
        isPlaying = true;
        updatePlayState();
    }
}

function initLyricsInteraction() {
    if (!lyricsContainer) return;

    const enterManualMode = () => {
        autoFollowLyrics = false;
    };

    const syncBtn = document.getElementById('btn-sync-lyrics');
    if (syncBtn) {
        syncBtn.onclick = (e) => {
            e.stopPropagation();
            autoFollowLyrics = true;
            velocity = 0;
            updateLyricsByTime(true);
        };
    }

    // 阻止歌词页触摸时带动背景滚动
    lyricsOverlay?.addEventListener('touchmove', (e) => {
    if (!lyricsOverlay.classList.contains('open')) return;
    e.preventDefault();
    }, { passive: false });

    // 桌面滚轮
    lyricsContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (!lyricsData.length) return;

        enterManualMode();

        velocity += -e.deltaY * 0.03;
        velocity = clamp(velocity, -3.2, 3.2);

        targetOffset -= e.deltaY * 0.55;
        targetOffset = clampLyricsOffset(targetOffset);
    }, { passive: false });

    // ========== Pointer 事件：桌面 / 支持 Pointer 的设备 ==========
    lyricsContainer.addEventListener('pointerdown', (e) => {
        if (!lyricsData.length) return;

        if (e.pointerType !== 'mouse') {
            e.preventDefault();
        }

        isPointerDown = true;
        isDragging = false;
        pointerDownTargetLine = e.target.closest('.lyric-line');

        startPointerX = e.clientX;
        startPointerY = e.clientY;
        lastPointerY = e.clientY;
        lastMoveTime = performance.now();

        velocity = 0;
        longPressTriggered = false;
        lyricsContainer.classList.remove('dragging');

        clearLongPressTimer();
        longPressTimer = setTimeout(() => {
            if (isPointerDown) {
                longPressTriggered = true;
            }
        }, LONG_PRESS_DELAY);

        try {
            lyricsContainer.setPointerCapture?.(e.pointerId);
        } catch (_) {}
    });

    lyricsContainer.addEventListener('pointermove', (e) => {
        if (!isPointerDown) return;

        if (e.pointerType !== 'mouse') {
            e.preventDefault();
        }

        const totalDx = e.clientX - startPointerX;
        const totalDy = e.clientY - startPointerY;
        const movedFar = Math.abs(totalDx) > DRAG_THRESHOLD || Math.abs(totalDy) > DRAG_THRESHOLD;

        if (!isDragging && movedFar) {
            isDragging = true;
            enterManualMode();
            clearLongPressTimer();
            lyricsContainer.classList.add('dragging');
            lyricsContainer.classList.add('show-guide');

            lastPointerY = e.clientY;
            lastMoveTime = performance.now();
            return;
        }

        if (!isDragging) return;

        const now = performance.now();
        const dy = e.clientY - lastPointerY;
        const dt = Math.max(1, now - lastMoveTime);

        currentOffset += dy;
        currentOffset = clampLyricsOffset(currentOffset);
        targetOffset = currentOffset;

        velocity = dy / dt * 16;
        velocity = clamp(velocity, -4.5, 4.5);

        lastPointerY = e.clientY;
        lastMoveTime = now;

        applyLyricsTransform(currentOffset);
        updateDragPreviewLine();
    });

    lyricsContainer.addEventListener('pointerup', (e) => {
        if (!isPointerDown) return;

        if (e.pointerType !== 'mouse') {
            e.preventDefault();
        }

        clearLongPressTimer();

        if (isDragging) {
            const previewIndex = getCenterLyricIndex();
            if (previewIndex !== -1) {
                const time = lyricsData[previewIndex]?.time;
                clearDragPreviewLine();
                lyricsContainer.classList.remove('show-guide');
                seekToLyricTime(time);
            } else {
                targetOffset = clampLyricsOffset(targetOffset + velocity * 14);
            }
        } else {
            if (pointerDownTargetLine) {
                const time = parseFloat(pointerDownTargetLine.dataset.time);
                seekToLyricTime(time);
            }
        }

        isPointerDown = false;
        pointerDownTargetLine = null;
        longPressTriggered = false;

        setTimeout(() => {
            isDragging = false;
            lyricsContainer.classList.remove('dragging');
            lyricsContainer.classList.remove('show-guide');
        }, 0);

        try {
            lyricsContainer.releasePointerCapture?.(e.pointerId);
        } catch (_) {}
    });

    lyricsContainer.addEventListener('pointercancel', (e) => {
        if (!isPointerDown) return;
        resetLyricsGestureState();
        try {
            lyricsContainer.releasePointerCapture?.(e.pointerId);
        } catch (_) {}
    });

    // ========== Touch 事件：移动端专用 ==========
    let touchActive = false;
    let touchMoved = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchLastY = 0;
    let touchLastTime = 0;
    let touchTargetLine = null;

    lyricsContainer.addEventListener('touchstart', (e) => {
        if (!lyricsData.length) return;
        if (!e.touches.length) return;

        const t = e.touches[0];

        touchActive = true;
        touchMoved = false;
        isDragging = false;
        touchTargetLine = e.target.closest('.lyric-line');

        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchLastY = t.clientY;
        touchLastTime = performance.now();

        velocity = 0;
        clearLongPressTimer();

        e.preventDefault();
    }, { passive: false });

    lyricsContainer.addEventListener('touchmove', (e) => {
        if (!touchActive || !e.touches.length) return;

        const t = e.touches[0];
        const totalDx = t.clientX - touchStartX;
        const totalDy = t.clientY - touchStartY;
        const movedFar = Math.abs(totalDx) > DRAG_THRESHOLD || Math.abs(totalDy) > DRAG_THRESHOLD;

        if (!isDragging && movedFar) {
            isDragging = true;
            touchMoved = true;
            enterManualMode();
            lyricsContainer.classList.add('dragging');
            lyricsContainer.classList.add('show-guide');

            touchLastY = t.clientY;
            touchLastTime = performance.now();
        }

        if (isDragging) {
            const now = performance.now();
            const dy = t.clientY - touchLastY;
            const dt = Math.max(1, now - touchLastTime);

            currentOffset += dy;
            currentOffset = clampLyricsOffset(currentOffset);
            targetOffset = currentOffset;

            velocity = dy / dt * 16;
            velocity = clamp(velocity, -4.5, 4.5);

            touchLastY = t.clientY;
            touchLastTime = now;

            applyLyricsTransform(currentOffset);
            updateDragPreviewLine();
        }

        e.preventDefault();
    }, { passive: false });

    lyricsContainer.addEventListener('touchend', (e) => {
        if (!touchActive) return;

        if (isDragging) {
            const previewIndex = getCenterLyricIndex();
            if (previewIndex !== -1) {
                const time = lyricsData[previewIndex]?.time;
                clearDragPreviewLine();
                lyricsContainer.classList.remove('show-guide');
                seekToLyricTime(time);
            } else {
                targetOffset = clampLyricsOffset(targetOffset + velocity * 14);
            }
        } else if (!touchMoved && touchTargetLine) {
            const time = parseFloat(touchTargetLine.dataset.time);
            seekToLyricTime(time);
        }

        touchActive = false;
        touchMoved = false;
        touchTargetLine = null;

        setTimeout(() => {
            isDragging = false;
            lyricsContainer.classList.remove('dragging');
            lyricsContainer.classList.remove('show-guide');
        }, 0);

        e.preventDefault();
    }, { passive: false });

    lyricsContainer.addEventListener('touchcancel', () => {
        touchActive = false;
        touchMoved = false;
        touchTargetLine = null;
        resetLyricsGestureState();
    }, { passive: false });
}

function clampLyricsOffset(offset) {
    const containerHeight = lyricsContainer?.clientHeight || 0;
    const trackHeight = lyricsTrack?.scrollHeight || 0;

    if (trackHeight <= containerHeight) return 0;

    const topPadding = containerHeight * 0.35;
    const bottomPadding = containerHeight * 0.35;

    const maxOffset = topPadding;
    const minOffset = containerHeight - trackHeight - bottomPadding;

    return clamp(offset, minOffset, maxOffset);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getCurrentLyricIndex() {
    const ct = audio.currentTime || 0;
    let activeIndex = -1;

    for (let i = 0; i < lyricsData.length; i++) {
        if (ct >= lyricsData[i].time) activeIndex = i;
        else break;
    }
    return activeIndex;
}

function updateActiveLyric(index) {
    if (index === currentActiveIndex) return;

    const prev = document.getElementById(`lrc-${currentActiveIndex}`);
    if (prev) prev.classList.remove('active');

    const current = document.getElementById(`lrc-${index}`);
    if (current) current.classList.add('active');

    currentActiveIndex = index;
    updatePosterContent();
}

function getTargetOffsetByIndex(index) {
    const activeLine = document.getElementById(`lrc-${index}`);
    if (!activeLine) return targetOffset;

    const containerCenter = lyricsContainer.clientHeight / 2;
    const lineCenter = activeLine.offsetTop + activeLine.clientHeight / 2;
    return clampLyricsOffset(containerCenter - lineCenter);
}

function updateLyricsByTime(forceScroll = false) {
    if (!lyricsData.length) return;

    const activeIndex = getCurrentLyricIndex();
    if (activeIndex === -1) return;

    updateActiveLyric(activeIndex);

    if (autoFollowLyrics || forceScroll) {
        targetOffset = getTargetOffsetByIndex(activeIndex);
    }
}

function getCenterLyricIndex() {
    if (!lyricsData.length) return -1;

    const containerCenter = lyricsContainer.clientHeight / 2;
    let bestIndex = -1;
    let minDist = Infinity;

    lyricsData.forEach((_, i) => {
        const el = document.getElementById(`lrc-${i}`);
        if (!el) return;
        const center = el.offsetTop + el.clientHeight / 2 + currentOffset;
        const dist = Math.abs(center - containerCenter);
        if (dist < minDist) {
            minDist = dist;
            bestIndex = i;
        }
    });

    return bestIndex;
}

function updateDragPreviewLine() {
    const previewIndex = getCenterLyricIndex();
    if (previewIndex === dragPreviewIndex) return;

    const prev = document.querySelector('.lyric-line.preview');
    if (prev) prev.classList.remove('preview');

    const current = document.getElementById(`lrc-${previewIndex}`);
    if (current) current.classList.add('preview');

    dragPreviewIndex = previewIndex;

    const previewTime = lyricsData[previewIndex]?.time;
    const previewLabel = document.getElementById('drag-time-label');
    if (previewLabel && Number.isFinite(previewTime)) {
        previewLabel.innerText = `${formatTime(previewTime)} 松手跳转`;
    }
}

function clearDragPreviewLine() {
    const prev = document.querySelector('.lyric-line.preview');
    if (prev) prev.classList.remove('preview');
    dragPreviewIndex = -1;

    const previewLabel = document.getElementById('drag-time-label');
    if (previewLabel) {
        previewLabel.innerText = '';
    }
}

function updatePseudoWordHighlight() {
    if (!lyricsData.length) return;

    for (let i = 0; i < lyricsData.length; i++) {
        const lineEl = document.getElementById(`lrc-${i}`);
        if (!lineEl) continue;

        const fill = lineEl.querySelector('.lyric-fill');
        if (!fill) continue;

        if (i !== currentActiveIndex) {
            fill.style.clipPath = 'inset(0 100% 0 0)';
            fill.style.webkitClipPath = 'inset(0 100% 0 0)';
            continue;
        }

        const current = lyricsData[i];
        const next = lyricsData[i + 1];
        const start = current.time;
        const end = next ? next.time : start + 4;
        const duration = Math.max(0.25, end - start);
        const progress = clamp((audio.currentTime - start) / duration, 0, 1);

        const rightInset = 100 - progress * 100;
        const clipValue = `inset(0 ${rightInset}% 0 0)`;

        fill.style.clipPath = clipValue;
        fill.style.webkitClipPath = clipValue;
    }
}

window.downloadSong = function(file, title) {
    const a = document.createElement('a');
    a.href = file;
    a.download = title + file.substring(file.lastIndexOf('.'));
    a.click();
};

function initControls() {
    const toggleFunc = (e) => {
        e.stopPropagation();
        togglePlay();
    };

    document.getElementById('btn-play-mini').onclick = toggleFunc;
    document.getElementById('btn-play-full').onclick = toggleFunc;

    const prevFunc = (e) => {
        if (e) e.stopPropagation();
        handleTrackChange('prev', false);
    };

    const nextFunc = (e) => {
        if (e) e.stopPropagation();
        handleTrackChange('next', false);
    };

    document.getElementById('btn-prev-mini').onclick = prevFunc;
    document.getElementById('btn-next-mini').onclick = nextFunc;
    document.getElementById('btn-prev-full').onclick = prevFunc;
    document.getElementById('btn-next-full').onclick = nextFunc;

    const rewindBtn = document.getElementById('btn-rewind-10');
    const forwardBtn = document.getElementById('btn-forward-10');
    if (rewindBtn) {
        rewindBtn.onclick = (e) => {
            e.stopPropagation();
            seekRelative(-10);
        };
    }
    if (forwardBtn) {
        forwardBtn.onclick = (e) => {
            e.stopPropagation();
            seekRelative(10);
        };
    }

    const speedBtn = document.getElementById('btn-speed');
    if (speedBtn) {
        speedBtn.onclick = (e) => {
            e.stopPropagation();
            cyclePlaybackSpeed();
        };
    }

    document.getElementById('full-progress-wrapper').onclick = (e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        audio.currentTime = Math.max(0, Math.min(audio.duration || 0, ratio * (audio.duration || 0)));

        autoFollowLyrics = true;
        velocity = 0;
        updateLyricsByTime(true);
    };

    document.getElementById('mini-player').onclick = () => {
    resetLyricsGestureState();
    velocity = 0;
    autoFollowLyrics = true;
    setOverlayOpenState(true);
    requestAnimationFrame(() => updateLyricsByTime(true));
    };

    document.getElementById('btn-close-lyrics').onclick = (e) => {
        e.stopPropagation();
        setOverlayOpenState(false);
    };

    const volumeBtn = document.getElementById('btn-volume');
    if (volumeBtn) {
        volumeBtn.onclick = (e) => {
            e.stopPropagation();
            audio.muted = !audio.muted;
            const icon = volumeBtn.querySelector('span');
            icon.innerText = audio.muted ? 'volume_off' : 'volume_up';
        };
    }

    audio.addEventListener('play', () => {
        isPlaying = true;
        updatePlayState();
    });

    audio.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayState();
    });

    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;

        const pct = (audio.currentTime / audio.duration) * 100;
        document.getElementById('mini-progress-fill').style.width = pct + '%';
        document.getElementById('full-progress-fill').style.width = pct + '%';
        document.getElementById('time-current').innerText = formatTime(audio.currentTime);

        updateLyricsByTime(false);
        updatePosterContent();
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

    if (modeBtn) modeBtn.onclick = openModal;

    const closeModal = () => modeModal.classList.remove('active');
    if (modeOverlay) modeOverlay.onclick = closeModal;
    if (modeClose) modeClose.onclick = closeModal;

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

function seekRelative(delta) {
    const duration = audio.duration || 0;
    audio.currentTime = clamp((audio.currentTime || 0) + delta, 0, duration || Infinity);
    autoFollowLyrics = true;
    velocity = 0;
    updateLyricsByTime(true);
}

function cyclePlaybackSpeed() {
    currentSpeedIndex = (currentSpeedIndex + 1) % SPEED_OPTIONS.length;
    setPlaybackRate(SPEED_OPTIONS[currentSpeedIndex]);
}

function setPlaybackRate(rate) {
    audio.playbackRate = rate;
    const idx = SPEED_OPTIONS.findIndex(v => v === rate);
    currentSpeedIndex = idx >= 0 ? idx : 1;

    const speedBtn = document.getElementById('btn-speed');
    if (speedBtn) {
        speedBtn.querySelector('.speed-text').innerText = `${rate}x`;
    }

    localStorage.setItem('music_playback_rate', String(rate));
}

function handleTrackChange(direction, isAuto = false) {
    let nextIndex = currentIndex;
    const len = currentPlaylist.length;
    if (len === 0) return;

    if (playMode === 'random_list') {
        if (len > 1) {
            do {
                nextIndex = Math.floor(Math.random() * len);
            } while (nextIndex === currentIndex);
        }
    } else if (playMode === 'random_all') {
        if (allSongs.length > 1) {
            const randomSong = allSongs[Math.floor(Math.random() * allSongs.length)];
            if (playlists[randomSong.playlistId]) {
                currentPlaylist = playlists[randomSong.playlistId];
                nextIndex = randomSong.songIndex;
            }
        }
    } else if (playMode === 'single') {
        if (!isAuto) {
            nextIndex = direction === 'next'
                ? (currentIndex + 1) % len
                : (currentIndex - 1 + len) % len;
        }
    } else {
        if (direction === 'next') {
            if (currentIndex < len - 1) {
                nextIndex = currentIndex + 1;
            } else if (!isAuto) {
                nextIndex = 0;
            } else {
                return;
            }
        } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : len - 1;
        }
    }

    playSong(nextIndex);
}

function updateModeIcon() {
    const iconMap = {
        sequence: 'repeat',
        single: 'repeat_one',
        random_list: 'shuffle',
        random_all: 'shuffle'
    };
    const btnSpan = document.querySelector('#btn-mode span');
    if (btnSpan) btnSpan.innerText = iconMap[playMode];
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
    const hour = new Date().getHours();
    let greeting = '早上好';
    if (hour >= 12 && hour < 18) greeting = '下午好';
    else if (hour >= 18) greeting = '晚上好';

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
                <div class="song-item" onclick="handleRecentClick(event, ${i})">
                    <img src="${song.cover}" class="song-cover-mini" onerror="this.src='https://via.placeholder.com/150'">
                    <div class="song-info"><b>${song.title}</b><small>${song.artist}</small></div>
                    <button class="download-btn" onclick="handleDownload(event, '${song.file}', '${song.title}')">
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

window.handleRecentClick = (event, index) => {
    if (event.target.closest('.download-btn')) return;
    event.stopPropagation();
    playFromRecent(index);
};

window.playFromRecent = (index) => {
    const song = recentlyPlayed[index];
    if (!song || !song.file) return;

    const foundSong = allSongs.find(s =>
        s.file === song.file ||
        s.file.endsWith(song.file) ||
        `${BASE_PATH}/${song.file}` === s.file
    );

    if (foundSong && foundSong.playlistId && playlists[foundSong.playlistId]) {
        currentPlaylist = playlists[foundSong.playlistId];
        playSong(foundSong.songIndex);
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

    if (playlists[hash]) {
        currentPlaylist = playlists[hash];
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.id === hash);
        });
        document.getElementById('playlist-title').innerText = hash;
        renderSongList(currentPlaylist);
    }
}

function initSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;

    input.oninput = (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (!q) {
            handleRoute();
            return;
        }

        const results = allSongs.filter(s =>
            s.title.toLowerCase().includes(q) ||
            s.artist.toLowerCase().includes(q)
        );
        renderSongList(results, true);
    };
}

function renderSongList(songs, isSearch = false) {
    const sorted = [...songs].sort((a, b) => a.title.localeCompare(b.title));
    document.getElementById('song-list').innerHTML = sorted.map(s => `
        <div class="song-item" onclick="handleSongClick(event, ${isSearch}, '${s.playlistId}', ${s.songIndex}, ${songs.indexOf(s)})">
            <img src="${s.cover}" class="song-cover-mini" onerror="this.src='https://via.placeholder.com/150'">
            <div class="song-info"><b>${s.title}</b><small>${s.artist}</small></div>
            <button class="download-btn" onclick="handleDownload(event, '${s.file}', '${s.title}')">
                <span class="material-icons">download</span>
            </button>
        </div>
    `).join('');
}

window.handleSongClick = (event, isSearch, playlistId, songIndex, listIndex) => {
    if (event.target.closest('.download-btn')) return;
    event.stopPropagation();

    if (isSearch) {
        playFromSearch(playlistId, songIndex);
    } else {
        playSong(listIndex);
    }
};

window.handleDownload = (event, file, title) => {
    event.stopPropagation();
    event.preventDefault();
    downloadSong(file, title);
};

window.playFromSearch = (pid, idx) => {
    window.location.hash = pid;
    currentPlaylist = playlists[pid];
    playSong(idx);
};

function formatTime(s) {
    s = Number.isFinite(s) ? s : 0;
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

async function loadImageForCanvas(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.referrerPolicy = 'no-referrer';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

async function createBlurredPosterBg(imageUrl, options = {}) {
    const {
        width = 1200,
        height = 1800,
        blur = 32,
        scale = 1.2,
        brightness = 0.55
    } = options;

    const sourceImg = await loadImageForCanvas(imageUrl);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const drawWidth = width * scale;
    const drawHeight = height * scale;
    const dx = (width - drawWidth) / 2;
    const dy = (height - drawHeight) / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.filter = `blur(${blur}px) brightness(${brightness})`;
    ctx.drawImage(sourceImg, dx, dy, drawWidth, drawHeight);
    ctx.filter = 'none';

    ctx.fillStyle = 'rgba(10, 10, 16, 0.22)';
    ctx.fillRect(0, 0, width, height);

    return canvas.toDataURL('image/jpeg', 0.92);
}

async function preparePosterBlurBackground() {
    const posterCard = document.getElementById('poster-card');
    const posterBg = document.getElementById('poster-bg');
    const song = currentPlaylist[currentIndex];

    if (!posterCard || !posterBg || !song?.cover) return null;

    const rect = posterCard.getBoundingClientRect();
    const exportWidth = Math.max(1200, Math.round(rect.width * 3));
    const exportHeight = Math.max(1800, Math.round(rect.height * 3));

    const prevState = {
        backgroundImage: posterBg.style.backgroundImage,
        filter: posterBg.style.filter,
        webkitFilter: posterBg.style.webkitFilter
    };

    const blurredUrl = await createBlurredPosterBg(song.cover, {
        width: exportWidth,
        height: exportHeight,
        blur: 36,
        scale: 1.22,
        brightness: 0.54
    });

    posterBg.style.backgroundImage = `url("${blurredUrl}")`;
    posterBg.style.filter = 'none';
    posterBg.style.webkitFilter = 'none';

    return prevState;
}

function restorePosterBlurBackground(prevState) {
    const posterBg = document.getElementById('poster-bg');
    if (!posterBg || !prevState) return;

    posterBg.style.backgroundImage = prevState.backgroundImage || '';
    posterBg.style.filter = prevState.filter || '';
    posterBg.style.webkitFilter = prevState.webkitFilter || '';
}

async function exportPoster() {
    const card = document.getElementById('poster-card');
    const song = currentPlaylist[currentIndex];
    if (!card) return;

    let prevState = null;

    try {
        prevState = await preparePosterBlurBackground();

        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => setTimeout(resolve, 40));

        const canvas = await html2canvas(card, {
            backgroundColor: null,
            scale: Math.min(window.devicePixelRatio || 2, 3),
            useCORS: true,
            allowTaint: false
        });

        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `${song?.title || 'poster'}-poster.png`;
        a.click();
    } catch (e) {
        console.error('海报导出失败', e);
        alert('海报导出失败，请确认封面图片允许跨域访问。');
    } finally {
        restorePosterBlurBackground(prevState);
    }
}

function initPosterFeature() {
    const posterBtn = document.getElementById('btn-poster');
    const posterClose = document.getElementById('poster-close');
    const posterDownload = document.getElementById('poster-download');
    const posterModal = document.getElementById('poster-modal');
    const posterOverlay = document.getElementById('poster-overlay');

    if (posterBtn) {
        posterBtn.onclick = (e) => {
            e.stopPropagation();
            updatePosterContent();
            posterModal.classList.add('active');
        };
    }

    if (posterClose) posterClose.onclick = () => posterModal.classList.remove('active');
    if (posterOverlay) posterOverlay.onclick = () => posterModal.classList.remove('active');

    if (posterDownload) {
        posterDownload.onclick = async () => {
            if (posterDownload.dataset.exporting === '1') return;

            posterDownload.dataset.exporting = '1';
            posterDownload.disabled = true;

            try {
                await exportPoster();
            } finally {
                posterDownload.dataset.exporting = '0';
                posterDownload.disabled = false;
            }
        };
    }
}

function updatePosterContent() {
    const song = currentPlaylist[currentIndex];
    if (!song) return;

    const activeLyric = lyricsData[currentActiveIndex]?.main || '正在聆听音乐';

    const cover = document.getElementById('poster-cover');
    const title = document.getElementById('poster-title');
    const artist = document.getElementById('poster-artist');
    const lyric = document.getElementById('poster-lyric');
    const time = document.getElementById('poster-time');
    const bg = document.getElementById('poster-bg');

    if (cover) cover.src = song.cover;
    if (title) title.innerText = song.title;
    if (artist) artist.innerText = song.artist;
    if (lyric) lyric.innerText = activeLyric;
    if (time) time.innerText = `${formatTime(audio.currentTime || 0)} / ${formatTime(audio.duration || 0)}`;
    if (bg) bg.style.backgroundImage = `url('${song.cover}')`;
}

function applyDynamicThemeFromImage(imageUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';

    img.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const size = 48;
            canvas.width = size;
            canvas.height = size;
            ctx.drawImage(img, 0, 0, size, size);

            const { data } = ctx.getImageData(0, 0, size, size);

            let r = 0, g = 0, b = 0, count = 0;

            for (let i = 0; i < data.length; i += 4) {
                const rr = data[i];
                const gg = data[i + 1];
                const bb = data[i + 2];
                const alpha = data[i + 3];

                if (alpha < 125) continue;

                const brightness = (rr * 299 + gg * 587 + bb * 114) / 1000;
                if (brightness < 28 || brightness > 235) continue;

                r += rr;
                g += gg;
                b += bb;
                count++;
            }

            if (!count) return;

            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);

            const enhanced = enhanceColor(r, g, b);

            document.documentElement.style.setProperty('--primary', `rgb(${enhanced.r}, ${enhanced.g}, ${enhanced.b})`);
            document.documentElement.style.setProperty('--primary-dark', `rgb(${Math.max(0, enhanced.r - 24)}, ${Math.max(0, enhanced.g - 24)}, ${Math.max(0, enhanced.b - 24)})`);
            document.documentElement.style.setProperty('--theme-r', enhanced.r);
            document.documentElement.style.setProperty('--theme-g', enhanced.g);
            document.documentElement.style.setProperty('--theme-b', enhanced.b);
        } catch (e) {
            console.warn('主题色提取失败', e);
        }
    };

    img.onerror = () => {
        console.warn('封面加载失败，无法提取主题色');
    };

    img.src = imageUrl;
}

function enhanceColor(r, g, b) {
    const avg = (r + g + b) / 3;
    const boost = avg < 110 ? 1.22 : 1.08;

    return {
        r: clamp(Math.round(r * boost), 0, 255),
        g: clamp(Math.round(g * boost), 0, 255),
        b: clamp(Math.round(b * boost), 0, 255)
    };
}

init();