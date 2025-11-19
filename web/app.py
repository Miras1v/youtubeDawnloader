from flask import Flask, render_template, request, jsonify, send_file, Response, stream_with_context
from flask_cors import CORS
import yt_dlp
import os
import re
import requests
from pathlib import Path
import tempfile
import json
import threading
import uuid
import time
from urllib.parse import urlparse, parse_qs
from collections import defaultdict

app = Flask(__name__)
CORS(app)

# İndirme durumları ve kuyruğu
download_queue = {}
download_status = {}
download_lock = threading.Lock()

# YouTube Data API v3 için (opsiyonel - arama için)
YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY', '')


def clean_youtube_url(url):
    """YouTube URL'sini temizler - & işaretinden sonrasını ve playlist parametrelerini kaldırır"""
    if not url:
        return url
    
    # URL'yi parse et
    parsed = urlparse(url)
    
    # Video ID'yi al
    if 'youtube.com/watch' in url or 'youtu.be' in url:
        # Video ID'yi çıkar
        video_id = None
        if 'youtu.be' in url:
            # youtu.be/VIDEO_ID formatı
            video_id = parsed.path.lstrip('/').split('?')[0].split('&')[0]
        elif 'watch' in parsed.path or 'v=' in parsed.query:
            # youtube.com/watch?v=VIDEO_ID formatı
            query_params = parse_qs(parsed.query)
            if 'v' in query_params:
                video_id = query_params['v'][0].split('&')[0]
        
        if video_id:
            # Temiz URL oluştur
            return f"https://www.youtube.com/watch?v={video_id}"
    
    # Eğer playlist URL'si ise, sadece video ID'yi al
    if 'list=' in url:
        # Playlist URL'sinden video ID'yi çıkar
        match = re.search(r'[?&]v=([^&]+)', url)
        if match:
            video_id = match.group(1)
            return f"https://www.youtube.com/watch?v={video_id}"
    
    # Diğer durumlar için orijinal URL'yi döndür
    return url.split('&')[0] if '&' in url else url


def extract_video_id(url):
    """YouTube URL'den video ID çıkarır"""
    url = clean_youtube_url(url)
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/watch\?.*v=([^&\n?#]+)'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def get_video_info(url):
    """Video bilgilerini alır ve maksimum kaliteyi tespit eder"""
    url = clean_youtube_url(url)
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Playlist kontrolü
            if 'entries' in info and info.get('_type') == 'playlist':
                # Playlist ise ilk videoyu al
                entries = [e for e in info.get('entries', []) if e]
                if entries:
                    info = entries[0]
                else:
                    return {'error': 'Playlist boş veya erişilemiyor'}
            
            # Mevcut formatları analiz et ve maksimum kaliteyi bul
            max_height = 0
            available_qualities = set()
            
            if 'formats' in info:
                for fmt in info['formats']:
                    height = fmt.get('height')
                    if height:
                        available_qualities.add(height)
                        if height > max_height:
                            max_height = height
            
            # Maksimum kaliteyi belirle
            max_quality = 'best'
            quality_order = [2160, 1440, 1080, 720, 480, 360, 240, 144]
            
            for q in quality_order:
                if q <= max_height:
                    max_quality = f'{q}p'
                    break
            
            # Eğer hiç kalite bulunamazsa varsayılan olarak 'best'
            if max_height == 0:
                max_quality = 'best'
            
            return {
                'title': info.get('title', 'Bilinmeyen'),
                'thumbnail': info.get('thumbnail', ''),
                'duration': info.get('duration', 0),
                'uploader': info.get('uploader', ''),
                'view_count': info.get('view_count', 0),
                'max_quality': max_quality,
                'max_height': max_height,
                'available_qualities': sorted(list(available_qualities), reverse=True) if available_qualities else []
            }
    except Exception as e:
        return {'error': str(e)}


def download_video_with_progress(download_id, url, format_type='video', file_format='mp4', quality='best'):
    """Video veya ses indirir ve progress takibi yapar"""
    url = clean_youtube_url(url)
    
    # Geçici dosya oluştur
    temp_dir = tempfile.gettempdir()
    temp_file = os.path.join(temp_dir, f"{download_id}.tmp")
    
    def progress_hook(d):
        try:
            status = d.get('status')
            if status == 'downloading':
                total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                downloaded = d.get('downloaded_bytes', 0)
                if total and total > 0:
                    percent = min((downloaded / total) * 100, 99.9)  # Max 99.9% until finished
                else:
                    percent = 0
                
                progress_data = {
                    'status': 'downloading',
                    'percent': round(percent, 2),
                    'downloaded': downloaded,
                    'total': total,
                    'speed': d.get('speed', 0),
                    'eta': d.get('eta', 0)
                }
                
                with download_lock:
                    download_status[download_id] = progress_data
                    
                # Debug: Progress güncellemesi
                print(f"Progress update for {download_id}: {percent:.2f}%")
                
            elif status == 'finished':
                with download_lock:
                    download_status[download_id] = {
                        'status': 'processing',
                        'percent': 95
                    }
                print(f"Download finished for {download_id}, processing...")
        except Exception as e:
            # Progress hook hatası indirmeyi durdurmamalı
            print(f"Progress hook error for {download_id}: {e}")
    
    try:
        if format_type == 'audio':
            # Ses formatı ve kalite ayarları
            audio_codec = file_format.lower()
            quality_map = {
                '128': '128',
                '192': '192',
                '256': '256',
                '320': '320',
                'best': '192'
            }
            audio_quality = quality_map.get(quality, '192')
            
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': temp_file.replace('.tmp', '.%(ext)s'),
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': audio_codec,
                    'preferredquality': audio_quality,
                }],
                'progress_hooks': [progress_hook],
                'noprogress': False,
                'quiet': True,
                'no_warnings': True,
            }
        else:
            # Video formatı ve kalite ayarları
            video_format = file_format.lower()
            
            # Kalite format string'leri - yt-dlp format seçimi
            if quality == 'best':
                format_string = 'bestvideo+bestaudio/best'
            else:
                # Kalite değerini sayıya çevir (örn: '1080p' -> 1080)
                height = int(quality.replace('p', ''))
                
                if video_format == 'mp4':
                    # MP4 için: belirtilen kalitede video + en iyi ses
                    format_string = f'bestvideo[height<={height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<={height}]+bestaudio/best[height<={height}][ext=mp4]/best[ext=mp4]/best'
                elif video_format == 'mkv':
                    # MKV için: belirtilen kalitede video + en iyi ses
                    format_string = f'bestvideo[height<={height}]+bestaudio/best[height<={height}]/best'
                else:
                    format_string = f'bestvideo[height<={height}]+bestaudio/best'
            
            ydl_opts = {
                'format': format_string,
                'outtmpl': temp_file.replace('.tmp', '.%(ext)s'),
                'merge_output_format': video_format,
                'progress_hooks': [progress_hook],
                'noprogress': False,
                'quiet': True,
                'no_warnings': True,
            }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            
            # Format'a göre doğru uzantıyı ekle
            if format_type == 'audio':
                if file_format.lower() == 'wav':
                    filename = filename.rsplit('.', 1)[0] + '.wav'
                else:
                    filename = filename.rsplit('.', 1)[0] + '.mp3'
            else:
                # Video formatına göre uzantıyı ayarla
                video_ext = file_format.lower()
                if not filename.endswith(f'.{video_ext}'):
                    filename = filename.rsplit('.', 1)[0] + f'.{video_ext}'
            
            with download_lock:
                download_status[download_id] = {
                    'status': 'completed',
                    'percent': 100,
                    'filename': os.path.basename(filename),
                    'filepath': filename,
                    'title': info.get('title', 'Bilinmeyen')
                }
    except Exception as e:
        with download_lock:
            download_status[download_id] = {
                'status': 'error',
                'error': str(e)
            }


def search_youtube(query, max_results=10):
    """YouTube'da arama yapar"""
    if not YOUTUBE_API_KEY:
        # API key yoksa yt-dlp ile arama yap
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': True,
            }
            search_url = f'ytsearch{max_results}:{query}'
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                results = []
                info = ydl.extract_info(search_url, download=False)
                if 'entries' in info:
                    for entry in info['entries']:
                        if entry:
                            results.append({
                                'video_id': entry.get('id', ''),
                                'title': entry.get('title', 'Bilinmeyen'),
                                'url': f"https://www.youtube.com/watch?v={entry.get('id', '')}",
                                'duration': entry.get('duration', 0),
                                'thumbnail': f"https://img.youtube.com/vi/{entry.get('id', '')}/default.jpg"
                            })
                return results
        except Exception as e:
            return {'error': str(e)}
    else:
        # YouTube Data API v3 kullan
        try:
            search_url = 'https://www.googleapis.com/youtube/v3/search'
            params = {
                'part': 'snippet',
                'q': query,
                'type': 'video',
                'maxResults': max_results,
                'key': YOUTUBE_API_KEY
            }
            response = requests.get(search_url, params=params)
            data = response.json()
            
            results = []
            for item in data.get('items', []):
                video_id = item['id']['videoId']
                results.append({
                    'video_id': video_id,
                    'title': item['snippet']['title'],
                    'url': f"https://www.youtube.com/watch?v={video_id}",
                    'thumbnail': item['snippet']['thumbnails']['default']['url'],
                    'channel': item['snippet']['channelTitle'],
                    'description': item['snippet']['description']
                })
            return results
        except Exception as e:
            return {'error': str(e)}


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/info', methods=['POST'])
def get_info():
    """Video bilgilerini döndürür"""
    data = request.json
    url = data.get('url', '')
    
    if not url:
        return jsonify({'error': 'URL gerekli'}), 400
    
    info = get_video_info(url)
    return jsonify(info)


@app.route('/api/download', methods=['POST'])
def download():
    """Video veya ses indirmeyi kuyruğa ekler"""
    data = request.json
    url = data.get('url', '')
    format_type = data.get('format', 'video')
    file_format = data.get('file_format', 'mp4')
    quality = data.get('quality', 'best')
    
    if not url:
        return jsonify({'error': 'URL gerekli'}), 400
    
    # Benzersiz indirme ID'si oluştur
    download_id = str(uuid.uuid4())
    
    # İndirmeyi kuyruğa ekle
    with download_lock:
        download_status[download_id] = {
            'status': 'queued',
            'percent': 0
        }
    
    # Arka planda indirmeyi başlat
    thread = threading.Thread(
        target=download_video_with_progress,
        args=(download_id, url, format_type, file_format, quality),
        daemon=True
    )
    thread.start()
    
    return jsonify({
        'success': True,
        'download_id': download_id
    })


@app.route('/api/download/status/<download_id>')
def download_status_endpoint(download_id):
    """İndirme durumunu döndürür"""
    with download_lock:
        status = download_status.get(download_id, {'status': 'not_found'})
        return jsonify(status)


@app.route('/api/download/file/<download_id>')
def download_file(download_id):
    """İndirilen dosyayı stream eder ve tarayıcıya gönderir"""
    with download_lock:
        status = download_status.get(download_id)
        if not status or status.get('status') != 'completed':
            return jsonify({'error': 'İndirme tamamlanmadı'}), 404
        
        filepath = status.get('filepath')
        filename = status.get('filename')
    
    if not filepath or not os.path.exists(filepath):
        return jsonify({'error': 'Dosya bulunamadı'}), 404
    
    def generate():
        file_handle = None
        try:
            file_handle = open(filepath, 'rb')
            while True:
                chunk = file_handle.read(8192)
                if not chunk:
                    break
                yield chunk
        finally:
            if file_handle:
                file_handle.close()
            
            # Dosyayı stream tamamlandıktan sonra sil (kısa bir gecikme ile)
            def delete_file_after_delay():
                import time
                time.sleep(2)  # İndirme tamamlanması için bekle
                try:
                    if os.path.exists(filepath):
                        os.remove(filepath)
                    with download_lock:
                        if download_id in download_status:
                            del download_status[download_id]
                except Exception as e:
                    print(f"Error deleting file: {e}")
            
            # Arka planda sil
            threading.Thread(target=delete_file_after_delay, daemon=True).start()
    
    response = Response(
        stream_with_context(generate()),
        mimetype='application/octet-stream',
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Content-Type': 'application/octet-stream',
            'Content-Length': str(os.path.getsize(filepath))
        }
    )
    return response


@app.route('/api/search', methods=['POST'])
def search():
    """YouTube'da arama yapar"""
    data = request.json
    query = data.get('query', '')
    max_results = data.get('max_results', 10)
    
    if not query:
        return jsonify({'error': 'Arama terimi gerekli'}), 400
    
    results = search_youtube(query, max_results)
    
    if isinstance(results, dict) and 'error' in results:
        return jsonify(results), 500
    
    return jsonify({'results': results})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
