# 🎬 YouTube İndirici - Web ve Android

YouTube'dan video ve ses dosyalarını indirmek için modern web ve Android uygulaması. Link yapıştırma veya uygulama içi arama ile kolayca video ve ses dosyalarınızı indirin.

## 📁 Proje Yapısı

```
youtubeDawnloader/
├── web/                           # Web uygulaması (Flask)
│   ├── app.py                    # Flask backend API
│   ├── requirements.txt          # Python bağımlılıkları
│   ├── templates/                # HTML şablonları
│   │   └── index.html           # Ana arayüz (tema desteği ile)
│   └── README.md                 # Web uygulaması dokümantasyonu
├── android/                      # Android uygulaması (React Native)
│   ├── App.js                   # Ana uygulama bileşeni
│   ├── package.json             # Node.js bağımlılıkları
│   ├── app/                     # Android native dosyalar
│   │   └── src/
│   │       └── main/
│   │           └── AndroidManifest.xml
│   └── README.md                # Android uygulaması dokümantasyonu
└── README.md                    # Bu dosya (ana dokümantasyon)
```

## ✨ Özellikler

### 🌐 Web Uygulaması
- 🔗 **Link ile İndirme**: YouTube URL'sini yapıştırarak hızlıca indirme
- 🔍 **Arama Özelliği**: Uygulama içinden YouTube'da arama yapma
- 📹 **Video İndirme**: Yüksek kaliteli video indirme
- 🎵 **Ses İndirme**: MP3 formatında ses dosyası indirme
- 🌓 **Tema Desteği**: Açık ve koyu tema arasında geçiş yapabilme
- 📱 **Mobil Uyumlu**: Tüm cihazlarda mükemmel çalışır
- 💾 **Akıllı İndirme**: Dosyalar tarayıcının varsayılan indirme klasörüne kaydedilir

### 📱 Android Uygulaması
- 🔗 **Link ile İndirme**: YouTube URL'sini yapıştırarak hızlıca indirme
- 🔍 **Arama Özelliği**: Uygulama içinden YouTube'da arama yapma
- 📹 **Video İndirme**: Yüksek kaliteli video indirme
- 🎵 **Ses İndirme**: MP3 formatında ses dosyası indirme
- 📱 **Native Android**: React Native ile geliştirilmiş

## 🚀 Kurulum ve Çalıştırma

### 📋 Gereksinimler

#### Web Uygulaması için:
- Python 3.8 veya üzeri
- FFmpeg (ses dönüştürme için)
- pip (Python paket yöneticisi)

#### Android Uygulaması için:
- Node.js 16 veya üzeri
- React Native CLI
- Android Studio
- Java JDK 11 veya üzeri
- Backend API çalışıyor olmalı (web uygulaması)

---

## 🌐 Web Uygulamasını Çalıştırma

### Adım 1: FFmpeg Kurulumu

Ses dosyalarını MP3 formatına dönüştürmek için FFmpeg gereklidir.

**Windows:**
1. [FFmpeg indir](https://ffmpeg.org/download.html)
2. ZIP dosyasını çıkarın
3. `bin` klasörünü sistem PATH'ine ekleyin
4. Yeni bir terminal açın ve `ffmpeg -version` komutu ile kontrol edin

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

### Adım 2: Python Bağımlılıklarını Yükleme

1. Terminal/Command Prompt'u açın
2. Proje klasörüne gidin:
```bash
cd youtubeForAndroid/web
```

3. Python bağımlılıklarını yükleyin:
```bash
pip install -r requirements.txt
```

**Not:** Eğer `pip` komutu çalışmıyorsa, `pip3` kullanmayı deneyin.

### Adım 3: Uygulamayı Başlatma

1. Aynı terminalde şu komutu çalıştırın:
```bash
python app.py
```

**Not:** Windows'ta `python` çalışmıyorsa `py` veya `python3` kullanmayı deneyin.

2. Terminalde şu mesajı göreceksiniz:
```
 * Running on http://0.0.0.0:5000
```

3. Tarayıcınızı açın ve şu adrese gidin:
```
http://localhost:5000
```

### Adım 4: Kullanım

1. **Link ile İndirme:**
   - "Link ile İndir" sekmesine gidin
   - YouTube video URL'sini yapıştırın (örn: `https://www.youtube.com/watch?v=...`)
   - "Video Bilgilerini Getir" butonuna tıklayın
   - "Video İndir" veya "Ses İndir (MP3)" butonuna tıklayın
   - Dosya tarayıcınızın varsayılan indirme klasörüne kaydedilir

2. **Arama ile İndirme:**
   - "Arama Yap" sekmesine gidin
   - Arama terimini girin
   - "Ara" butonuna tıklayın
   - Sonuçlardan bir videoya tıklayın
   - Otomatik olarak link sekmesine geçer ve video bilgileri yüklenir
   - İndirme butonlarına tıklayın

3. **Tema Değiştirme:**
   - Sağ üst köşedeki 🌙/☀️ butonuna tıklayarak açık/koyu tema arasında geçiş yapabilirsiniz
   - Tema tercihiniz tarayıcınızda saklanır

---

## 📱 Android Uygulamasını Çalıştırma

### Adım 1: Backend'i Çalıştırma

Android uygulaması, web uygulamasına (backend) bağlanır. Önce web uygulamasını çalıştırmanız gerekir.

1. Bir terminal açın ve web uygulamasını başlatın:
```bash
cd youtubeForAndroid/web
python app.py
```

### Adım 2: IP Adresinizi Bulma

Android uygulamasının backend'e bağlanabilmesi için bilgisayarınızın IP adresini bulmanız gerekir.

**Windows:**
1. Command Prompt'u açın
2. Şu komutu çalıştırın:
```bash
ipconfig
```
3. "IPv4 Address" veya "IPv4 Adresi" satırındaki IP adresini not edin (örn: `192.168.1.100`)

**Linux/macOS:**
1. Terminal'i açın
2. Şu komutlardan birini çalıştırın:
```bash
ifconfig
# veya
ip addr
```
3. `inet` veya `inet addr` satırındaki IP adresini not edin

**Önemli:** Telefon ve bilgisayar aynı Wi-Fi ağında olmalıdır!

### Adım 3: Android Uygulamasını Yapılandırma

1. `youtubeForAndroid/android/App.js` dosyasını bir metin editörü ile açın
2. Şu satırı bulun:
```javascript
const API_URL = 'http://192.168.1.100:5000';
```
3. `192.168.1.100` kısmını kendi IP adresinizle değiştirin:
```javascript
const API_URL = 'http://KENDI_IP_ADRESINIZ:5000';
```

### Adım 4: Node.js Bağımlılıklarını Yükleme

1. Yeni bir terminal açın
2. Android klasörüne gidin:
```bash
cd youtubeForAndroid/android
```

3. Bağımlılıkları yükleyin:
```bash
npm install
```

Bu işlem birkaç dakika sürebilir. İlk kez çalıştırıyorsanız daha uzun sürebilir.

### Adım 5: Android Studio Kurulumu

1. [Android Studio'yu indirin](https://developer.android.com/studio) ve kurun
2. Android Studio'yu açın
3. "More Actions" > "SDK Manager" menüsüne gidin
4. Gerekli SDK'ları yükleyin (Android 11 veya üzeri önerilir)

### Adım 6: Android Cihazını Hazırlama

**Fiziksel Cihaz:**
1. Telefonunuzda "Geliştirici Seçenekleri"ni etkinleştirin
2. "USB Hata Ayıklama"nın açık olduğundan emin olun
3. Telefonu USB ile bilgisayara bağlayın

**Emülatör:**
1. Android Studio'da "Device Manager"ı açın
2. Yeni bir emülatör oluşturun veya mevcut birini başlatın

### Adım 7: Android Uygulamasını Çalıştırma

1. Terminal'de Android klasöründe olduğunuzdan emin olun:
```bash
cd youtubeForAndroid/android
```

2. Metro bundler'ı başlatın (yeni bir terminal):
```bash
npm start
```

3. Başka bir terminalde Android uygulamasını çalıştırın:
```bash
npm run android
```

**Not:** İlk çalıştırmada build işlemi uzun sürebilir (10-15 dakika).

### Adım 8: Kullanım

1. Uygulama açıldığında "Link" veya "Arama" sekmesini seçin
2. Link ile indirme için YouTube URL'sini yapıştırın
3. Arama ile indirme için arama terimini girin
4. İndirme butonlarına tıklayın
5. Dosyalar telefonunuzun "İndirilenler" klasörüne kaydedilir

---

## ⚙️ Yapılandırma

### Backend API URL (Android için)

Android uygulaması, web uygulamasına bağlanır. `android/App.js` dosyasındaki `API_URL` değişkenini kendi IP adresinizle değiştirin:

```javascript
const API_URL = 'http://192.168.1.100:5000'; // Kendi IP adresinizi girin
```

**Önemli:** 
- Telefon ve bilgisayar aynı ağda olmalıdır
- Firewall'ın 5000 portunu engellemediğinden emin olun
- Backend çalışıyor olmalıdır

### YouTube API Key (Opsiyonel)

Arama özelliği için YouTube Data API v3 kullanmak isterseniz (daha hızlı ve güvenilir sonuçlar için):

1. [Google Cloud Console](https://console.cloud.google.com/) hesabı oluşturun
2. Yeni bir proje oluşturun
3. "APIs & Services" > "Library" menüsüne gidin
4. "YouTube Data API v3"ü arayın ve etkinleştirin
5. "Credentials" > "Create Credentials" > "API Key" ile bir API key oluşturun
6. `youtubeForAndroid/web/` klasöründe `.env` dosyası oluşturun:
```env
YOUTUBE_API_KEY=your-api-key-here
```

**Not:** API key olmadan da arama çalışır (yt-dlp kullanır), ancak API key ile daha hızlı ve güvenilir sonuçlar alırsınız.

---

## 🐛 Sorun Giderme

### Web Uygulaması

**FFmpeg Hatası:**
- FFmpeg'in PATH'te olduğundan emin olun
- Yeni bir terminal açın ve `ffmpeg -version` komutu ile kontrol edin
- FFmpeg kurulumunu tekrar yapın

**İndirme Hatası:**
- Video URL'sinin doğru olduğundan emin olun
- İnternet bağlantınızı kontrol edin
- Video erişilebilir olduğundan emin olun (kısıtlı videolar indirilemez)

**Port Zaten Kullanılıyor:**
- Başka bir uygulama 5000 portunu kullanıyor olabilir
- `app.py` dosyasındaki port numarasını değiştirin (örn: `port=5001`)

### Android Uygulaması

**Backend'e Bağlanamıyor:**
- Backend'in çalıştığından emin olun (`python app.py`)
- IP adresinin doğru olduğundan emin olun
- Telefon ve bilgisayarın aynı Wi-Fi ağında olduğundan emin olun
- Firewall'ın 5000 portunu engellemediğinden emin olun
- Windows Firewall'da Python'a izin verin

**Build Hatası:**
- `npm install` komutunu tekrar çalıştırın
- `cd android && ./gradlew clean` komutunu çalıştırın
- Node.js ve React Native versiyonlarını kontrol edin
- Android Studio'nun güncel olduğundan emin olun

**İndirme Çalışmıyor:**
- Depolama izninin verildiğinden emin olun
- Yeterli depolama alanı olduğundan emin olun
- İnternet bağlantınızı kontrol edin

**Metro Bundler Başlamıyor:**
- Port 8081'in kullanılabilir olduğundan emin olun
- `npm start -- --reset-cache` komutu ile cache'i temizleyin

---

## 📝 Notlar

- İndirilen dosyalar web uygulamasında tarayıcının varsayılan indirme klasörüne kaydedilir
- Android'de dosyalar "İndirilenler" klasörüne kaydedilir
- Tema tercihi web uygulamasında tarayıcıda saklanır (localStorage)
- Backend API çalışmıyorsa Android uygulaması çalışmaz

---

## 📖 Detaylı Dokümantasyon

- **Web Uygulaması**: [web/README.md](web/README.md)
- **Android Uygulaması**: [android/README.md](android/README.md)

---

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

---

## 💡 İpuçları

- Web uygulamasını test etmek için önce basit bir YouTube video URL'si deneyin
- Android uygulamasını test ederken önce web uygulamasının çalıştığından emin olun
- Tema değiştirme özelliği sadece web uygulamasında mevcuttur
- İndirme işlemi sırasında internet bağlantınızın stabil olduğundan emin olun
