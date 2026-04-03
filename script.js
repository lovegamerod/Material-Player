:root {
    --primary: #1976d2;
    --primary-dark: #1565c0;
    --surface: #ffffff;
    --background: #fafafa;
    --text-primary: #212121;
    --text-secondary: #757575;
    --divider: #e0e0e0;
}

* { box-sizing: border-box; margin: 0; padding: 0; outline: none; -webkit-tap-highlight-color: transparent; }
body { font-family: 'Roboto', -apple-system, sans-serif; background: var(--background); color: var(--text-primary); height: 100vh; overflow: hidden; }

.app-bg {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    z-index: -1; background-size: cover; background-position: center;
    filter: blur(80px) brightness(0.9); opacity: 0; 
    transition: opacity 1s ease;
}

.app-container { display: flex; height: 100vh; width: 100%; }

.navigation-rail {
    width: 240px; background: var(--surface); 
    box-shadow: 2px 0 8px rgba(0,0,0,0.1);
    display: flex; flex-direction: column; padding: 24px 8px; flex-shrink: 0;
}
.nav-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding: 8px 12px; color: var(--primary); font-weight: 500; font-size: 1.1rem; }
.nav-items { overflow-y: auto; flex: 1; }
.nav-item {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px;
    border-radius: 24px; cursor: pointer; color: var(--text-primary);
    transition: background 0.2s, transform 0.1s; font-weight: 400;
    position: relative; overflow: hidden;
}
.nav-item::before {
    content: ''; position: absolute; inset: 0; background: var(--primary);
    opacity: 0; transition: opacity 0.3s;
}
.nav-item:hover::before { opacity: 0.08; }
.nav-item:active { transform: scale(0.96); }
.nav-item.active { background: rgba(25, 118, 210, 0.12); color: var(--primary); font-weight: 500; }

.main-content { flex: 1; padding: 0 32px; overflow-y: auto; }

.top-bar {
    display: flex; justify-content: space-between; align-items: center;
    position: sticky; top: 0; z-index: 10; padding: 24px 0 16px 0;
    background: var(--background);
}

.title-area { display: flex; align-items: center; gap: 6px; }
.title-area h1 { font-size: 28px; font-weight: 400; }
.expand-icon { display: none; color: var(--primary); font-size: 28px; }

.search-box {
    display: flex; align-items: center; background: var(--surface);
    padding: 8px 16px; border-radius: 24px; width: 240px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}
.search-box:focus-within { width: 300px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
.search-box input { border: none; background: transparent; margin-left: 8px; width: 100%; font-size: 15px; }

.song-list-container { display: grid; gap: 4px; }
.song-item {
    display: flex; align-items: center; padding: 12px 16px; border-radius: 8px;
    cursor: pointer; transition: all 0.2s; background: var(--surface);
    animation: fadeInUp 0.3s ease backwards; position: relative;
}
.song-item:nth-child(n) { animation-delay: calc(0.03s * (var(--i, 0))); }
.song-item:hover { background: #f5f5f5; transform: translateX(4px); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.song-cover-mini { width: 48px; height: 48px; border-radius: 4px; margin-right: 16px; object-fit: cover; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.song-info { flex: 1; }
.song-info b { font-size: 15px; color: var(--text-primary); display: block; margin-bottom: 4px; font-weight: 500; }
.song-info small { color: var(--text-secondary); font-size: 13px; }

.download-btn {
    background: none; border: none; color: var(--text-secondary);
    cursor: pointer; padding: 8px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s; opacity: 0;
}
.song-item:hover .download-btn { opacity: 1; }
.download-btn:hover { background: rgba(0,0,0,0.08); color: var(--primary); }
.download-btn span { font-size: 20px; }

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.player-bar {
    position: fixed; bottom: 0; left: 0; width: 100%; height: 80px;
    background: var(--surface); box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
    display: flex; align-items: center; padding: 0 24px; z-index: 100; cursor: pointer;
}
.mini-progress-wrapper { position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: var(--divider); }
.mini-progress-fill { height: 100%; background: var(--primary); width: 0%; transition: width 0.1s linear; }

.track-info-mini { display: flex; align-items: center; flex: 1; overflow: hidden; }
.track-info-mini img { width: 48px; height: 48px; border-radius: 4px; margin-right: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.track-info-mini.hidden { opacity: 0; }
#mini-title { font-weight: 500; font-size: 14px; margin-bottom: 4px; }
#mini-artist { font-size: 12px; color: var(--text-secondary); }

.controls-mini { display: flex; align-items: center; gap: 8px; }
.icon-btn { background: none; border: none; color: var(--text-primary); cursor: pointer; padding: 8px; border-radius: 50%; display: flex; transition: background 0.2s; }
.icon-btn:hover { background: rgba(0,0,0,0.08); }
.icon-btn-filled { background: var(--primary); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.2s; }
.icon-btn-filled:hover { background: var(--primary-dark); box-shadow: 0 4px 8px rgba(0,0,0,0.3); }
.icon-btn-filled:active { transform: scale(0.95); }

.lyrics-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(250,250,250,0.95); backdrop-filter: blur(40px);
    z-index: 200; display: flex; flex-direction: column;
    transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0; pointer-events: none;
}
.lyrics-overlay.open { transform: translateY(0); opacity: 1; pointer-events: auto; }

.close-btn { position: absolute; top: 24px; right: 24px; z-index: 10; background: rgba(0,0,0,0.05); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
.close-btn:hover { background: rgba(0,0,0,0.1); }

.lyrics-layout {
    flex: 1; display: grid; grid-template-columns: 40% 60%;
    padding: 80px 40px 20px 40px; height: calc(100% - 140px); overflow: hidden;
}

.left-side { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 40px; }
.cover-container img { width: 280px; height: 280px; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); object-fit: cover; animation: scaleIn 0.5s ease; }
@keyframes scaleIn {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}
.info-container { margin-top: 32px; color: var(--text-primary); }
.info-container h2 { font-size: 28px; margin-bottom: 8px; font-weight: 400; }
.info-container h3 { font-size: 18px; color: var(--text-secondary); font-weight: 400; }
.tag { font-size: 12px; background: rgba(0,0,0,0.08); padding: 4px 12px; border-radius: 12px; margin-top: 16px; display: inline-block; color: var(--text-secondary); }

#lyrics-container {
    height: 100%; overflow: hidden; position: relative;
    mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
}
.lyrics-track { width: 100%; transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.lyric-line {
    padding: 16px 0; font-size: 24px; font-weight: 400;
    color: rgba(0,0,0,0.3); text-align: left; margin-left: 40px;
    cursor: pointer; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); line-height: 1.4;
}
.lyric-line.active { color: var(--primary); font-weight: 500; transform: scale(1.05); transform-origin: left center; }
.lyric-sub { display: block; font-size: 16px; font-weight: 400; opacity: 0.7; margin-top: 6px; }

.sync-lyrics-btn {
    position: absolute; bottom: 24px; right: 24px;
    background: var(--surface); border: none; color: var(--primary);
    width: 48px; height: 48px; border-radius: 50%; display: none;
    align-items: center; justify-content: center; cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.2s;
}
.sync-lyrics-btn:hover { box-shadow: 0 6px 16px rgba(0,0,0,0.2); }

.bottom-controls { height: 140px; padding: 0 60px; display: flex; flex-direction: column; justify-content: center; }
.progress-section { display: flex; align-items: center; gap: 16px; color: var(--text-secondary); font-size: 13px; margin-bottom: 24px; }
.progress-bar-wrapper { flex: 1; height: 24px; display: flex; align-items: center; cursor: pointer; }
.progress-bar-bg { width: 100%; height: 4px; background: var(--divider); border-radius: 2px; position: relative; }

.progress-bar-fill { 
    height: 100%; background: var(--primary); width: 0%; border-radius: 2px;
    position: relative; transition: width 0.1s linear;
}

.progress-handle { 
    position: absolute; right: -6px; top: 50%; transform: translateY(-50%);
    width: 12px; height: 12px; background: var(--primary