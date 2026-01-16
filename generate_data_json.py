import os
import json
import sys

# --- 配置 ---
MUSIC_DIR = 'music'
OUTPUT_FILE = 'data.json'
VALID_AUDIO_EXTS = ('.mp3', '.flac', '.ogg', '.wav')
VALID_IMG_EXTS = ('.jpg', '.jpeg', '.png', '.webp')

# 检查依赖
try:
    import mutagen
    from mutagen.mp3 import MP3
    from mutagen.flac import FLAC
    from mutagen.id3 import ID3, APIC
    from mutagen.easyid3 import EasyID3
    HAS_MUTAGEN = True
    print("✅ Mutagen 库已加载，支持提取内嵌封面！")
except ImportError:
    HAS_MUTAGEN = False
    print("⚠️ 警告：未安装 mutagen 库。无法提取内嵌封面，也无法读取歌手信息。")
    print("👉 请运行: pip install mutagen")

def extract_cover(audio_path):
    """
    尝试从音频文件中提取封面图片，保存到同目录下。
    返回提取出的图片文件名 (例如: song_cover.jpg)，如果失败返回 None。
    """
    if not HAS_MUTAGEN:
        return None

    dir_path = os.path.dirname(audio_path)
    filename = os.path.basename(audio_path)
    base_name = os.path.splitext(filename)[0]
    # 生成的目标封面文件名
    save_name = f"{base_name}_cover.jpg"
    save_path = os.path.join(dir_path, save_name)

    # 如果已经提取过，直接返回，避免重复工作
    if os.path.exists(save_path):
        return save_name

    try:
        art_data = None
        
        # 1. 处理 MP3 (ID3 APIC)
        if filename.lower().endswith('.mp3'):
            audio = MP3(audio_path, ID3=ID3)
            if audio.tags:
                for tag in audio.tags.values():
                    if isinstance(tag, APIC):
                        art_data = tag.data
                        break
        
        # 2. 处理 FLAC (Picture)
        elif filename.lower().endswith('.flac'):
            audio = FLAC(audio_path)
            if audio.pictures:
                art_data = audio.pictures[0].data

        # 如果提取到了数据，写入文件
        if art_data:
            with open(save_path, 'wb') as img_f:
                img_f.write(art_data)
            print(f"      📸 已提取内嵌封面: {save_name}")
            return save_name

    except Exception as e:
        # print(f"提取失败: {e}") 
        pass

    return None

def get_metadata(file_path):
    """读取歌手和歌名"""
    filename = os.path.basename(file_path)
    title = os.path.splitext(filename)[0]
    artist = "Unknown Artist"
    
    if not HAS_MUTAGEN:
        return title, artist

    try:
        if file_path.lower().endswith('.flac'):
            audio = FLAC(file_path)
            if 'title' in audio: title = audio['title'][0]
            if 'artist' in audio: artist = audio['artist'][0]
        elif file_path.lower().endswith('.mp3'):
            # 优先尝试 EasyID3
            try:
                audio = EasyID3(file_path)
                if 'title' in audio: title = audio['title'][0]
                if 'artist' in audio: artist = audio['artist'][0]
            except:
                pass
    except:
        pass
    return title, artist

def get_song_cover(folder_path, audio_filename, folder_cover_url):
    """
    决定一首歌用什么封面。
    策略：
    1. 同名图片 (song.jpg)
    2. 已提取的图片 (song_cover.jpg)
    3. 尝试提取内嵌图片 -> 生成 song_cover.jpg
    4. 都没有 -> 用歌单通用封面
    """
    base_name = os.path.splitext(audio_filename)[0]
    
    # 1. 检查是否存在同名图片 (song.jpg / song.png)
    for ext in VALID_IMG_EXTS:
        img_name = base_name + ext
        if os.path.exists(os.path.join(folder_path, img_name)):
            return '/' + os.path.join(folder_path, img_name).replace(os.sep, '/')

    # 2. 检查或提取内嵌封面
    # 这步会生成 song_cover.jpg
    full_audio_path = os.path.join(folder_path, audio_filename)
    extracted_name = extract_cover(full_audio_path)
    
    if extracted_name:
         return '/' + os.path.join(folder_path, extracted_name).replace(os.sep, '/')
    
    # 3. 如果都没有，返回歌单默认封面
    return folder_cover_url

def generate():
    if not os.path.exists(MUSIC_DIR):
        print(f"❌ 错误：找不到 '{MUSIC_DIR}' 文件夹。")
        return

    playlists = {}
    print(f"📂 正在扫描 '{MUSIC_DIR}' 目录...")
    
    for folder_name in sorted(os.listdir(MUSIC_DIR)):
        folder_path = os.path.join(MUSIC_DIR, folder_name)
        if not os.path.isdir(folder_path):
            continue
            
        # 确定歌单默认封面（作为保底）
        folder_cover_url = f"https://via.placeholder.com/300/6750a4/ffffff?text={folder_name[0:2].upper()}"
        all_files = os.listdir(folder_path)
        
        # 找 cover.jpg
        folder_img = next((f for f in all_files if f.lower().startswith('cover') and f.lower().endswith(VALID_IMG_EXTS)), None)
        # 没 cover 找任意图
        if not folder_img:
            folder_img = next((f for f in all_files if f.lower().endswith(VALID_IMG_EXTS) and '_cover' not in f), None)
            
        if folder_img:
            folder_cover_url = '/' + os.path.join(folder_path, folder_img).replace(os.sep, '/')

        songs = []
        print(f"   📂 处理歌单: {folder_name}")

        for filename in sorted(os.listdir(folder_path)):
            if filename.lower().endswith(VALID_AUDIO_EXTS):
                full_path = os.path.join(folder_path, filename)
                web_path = '/' + full_path.replace(os.sep, '/')
                
                title, artist = get_metadata(full_path)
                
                # --- 核心修改：每首歌单独计算封面 ---
                final_cover = get_song_cover(folder_path, filename, folder_cover_url)
                # ----------------------------------

                songs.append({
                    "title": title,
                    "artist": artist,
                    "file": web_path,
                    "cover": final_cover
                })
        
        if songs:
            playlists[folder_name] = songs

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(playlists, f, ensure_ascii=False, indent=2)
    print(f"\n🎉 data.json 生成完毕！内嵌封面已提取。")

if __name__ == '__main__':
    generate()