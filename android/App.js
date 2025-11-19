import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import axios from 'axios';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import RNFS from 'react-native-fs';

// Backend API URL - Değiştirmeniz gerekebilir
// Web uygulamasının çalıştığı IP adresini buraya girin
const API_URL = 'http://192.168.1.100:5000'; // Kendi IP adresinizi girin

const App = () => {
  const [activeTab, setActiveTab] = useState('link');
  const [videoUrl, setVideoUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloads, setDownloads] = useState([]);
  const downloadIntervals = useRef({});

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      // Android 10+ için farklı izin
      if (Platform.Version >= 29) {
        // Android 10+ için WRITE_EXTERNAL_STORAGE gerekmez
        return true;
      }
      const result = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
      return result === RESULTS.GRANTED;
    }
    return true;
  };

  const getVideoInfo = async () => {
    if (!videoUrl.trim()) {
      Alert.alert('Hata', 'Lütfen bir YouTube URL\'si girin');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/info`, {
        url: videoUrl,
      });

      if (response.data.error) {
        Alert.alert('Hata', response.data.error);
      } else {
        setVideoInfo(response.data);
      }
    } catch (error) {
      Alert.alert('Hata', 'Video bilgileri alınamadı: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadVideo = async (format) => {
    const url = videoUrl.trim();
    if (!url) {
      Alert.alert('Hata', 'Lütfen bir YouTube URL\'si girin');
      return;
    }

    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      Alert.alert('İzin Gerekli', 'Dosya indirmek için depolama izni gereklidir');
      return;
    }

    try {
      // Format ve kalite seçeneklerini al
      const fileFormat = format === 'audio' ? 'mp3' : 'mp4';
      const quality = 'best';

      const response = await axios.post(`${API_URL}/api/download`, {
        url: url,
        format: format,
        file_format: fileFormat,
        quality: quality,
      });

      if (response.data.success) {
        const downloadId = response.data.download_id;
        const title = videoInfo?.title || 'Bilinmeyen';
        const formatText = format === 'audio' ? 'Ses' : 'Video';

        // İndirmeyi kuyruğa ekle
        const newDownload = {
          id: downloadId,
          title: title,
          format: formatText,
          status: 'queued',
          percent: 0,
          speed: 0,
        };

        setDownloads((prev) => [...prev, newDownload]);

        // Progress takibini başlat
        trackDownloadProgress(downloadId);
      } else {
        Alert.alert('Hata', response.data.error || 'İndirme başarısız');
      }
    } catch (error) {
      Alert.alert('Hata', 'İndirme sırasında bir hata oluştu: ' + error.message);
    }
  };

  const trackDownloadProgress = (downloadId) => {
    const checkStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/download/status/${downloadId}`);
        const status = response.data;

        setDownloads((prev) =>
          prev.map((dl) =>
            dl.id === downloadId
              ? {
                  ...dl,
                  status: status.status,
                  percent: status.percent || 0,
                  speed: status.speed || 0,
                  eta: status.eta || 0,
                  filename: status.filename,
                  filepath: status.filepath,
                  error: status.error,
                }
              : dl
          )
        );

        if (status.status === 'downloading' || status.status === 'processing') {
          // Devam et
          downloadIntervals.current[downloadId] = setTimeout(checkStatus, 500);
        } else if (status.status === 'completed') {
          // Dosyayı indir
          await downloadFileFromServer(downloadId, status.filename);
          // Kuyruktan kaldır
          setTimeout(() => {
            setDownloads((prev) => prev.filter((dl) => dl.id !== downloadId));
            if (downloadIntervals.current[downloadId]) {
              clearTimeout(downloadIntervals.current[downloadId]);
              delete downloadIntervals.current[downloadId];
            }
          }, 2000);
        } else if (status.status === 'error') {
          // Hata durumunda interval'i temizle
          if (downloadIntervals.current[downloadId]) {
            clearTimeout(downloadIntervals.current[downloadId]);
            delete downloadIntervals.current[downloadId];
          }
        }
      } catch (error) {
        console.error('Progress check error:', error);
        downloadIntervals.current[downloadId] = setTimeout(checkStatus, 1000);
      }
    };

    checkStatus();
  };

  const downloadFileFromServer = async (downloadId, filename) => {
    try {
      // Android için Downloads klasörüne indir
      const downloadPath = `${RNFS.DownloadDirectoryPath}/${filename}`;

      const downloadResult = await RNFS.downloadFile({
        fromUrl: `${API_URL}/api/download/file/${downloadId}`,
        toFile: downloadPath,
      }).promise;

      if (downloadResult.statusCode === 200) {
        Alert.alert('Başarılı', `Dosya indirildi: ${filename}`);
      } else {
        Alert.alert('Hata', 'Dosya indirme başarısız oldu');
      }
    } catch (error) {
      Alert.alert('Hata', 'Dosya indirme hatası: ' + error.message);
    }
  };

  useEffect(() => {
    // Component unmount olduğunda interval'leri temizle
    return () => {
      Object.values(downloadIntervals.current).forEach((interval) => {
        clearTimeout(interval);
      });
    };
  }, []);

  const searchVideos = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Hata', 'Lütfen bir arama terimi girin');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/search`, {
        query: searchQuery,
        max_results: 20,
      });

      if (response.data.error) {
        Alert.alert('Hata', response.data.error);
      } else {
        setSearchResults(response.data.results || []);
      }
    } catch (error) {
      Alert.alert('Hata', 'Arama yapılamadı: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectVideo = (result) => {
    setVideoUrl(result.url);
    setActiveTab('link');
    getVideoInfo();
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Bilinmiyor';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond) return '';
    return formatBytes(bytesPerSecond) + '/s';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎬 YouTube İndirici</Text>
        <Text style={styles.headerSubtitle}>Video ve ses dosyalarınızı indirin</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'link' && styles.tabButtonActive]}
          onPress={() => setActiveTab('link')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'link' && styles.tabButtonTextActive]}>
            🔗 Link
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'search' && styles.tabButtonActive]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'search' && styles.tabButtonTextActive]}>
            🔍 Arama
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'link' && (
          <View style={styles.tabContent}>
            <Text style={styles.label}>YouTube Video URL'si</Text>
            <TextInput
              style={styles.input}
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChangeText={setVideoUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={getVideoInfo}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Video Bilgilerini Getir</Text>
              )}
            </TouchableOpacity>

            {videoInfo && !videoInfo.error && (
              <View style={styles.videoInfo}>
                {videoInfo.thumbnail && (
                  <Image source={{ uri: videoInfo.thumbnail }} style={styles.thumbnail} />
                )}
                <Text style={styles.videoTitle}>{videoInfo.title}</Text>
                <Text style={styles.videoDetail}>Kanal: {videoInfo.uploader}</Text>
                <Text style={styles.videoDetail}>Süre: {formatDuration(videoInfo.duration)}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => downloadVideo('video')}
            >
              <Text style={styles.buttonText}>📹 Video İndir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => downloadVideo('audio')}
            >
              <Text style={styles.buttonText}>🎵 Ses İndir (MP3)</Text>
            </TouchableOpacity>

            {/* İndirme Kuyruğu */}
            {downloads.length > 0 && (
              <View style={styles.downloadQueue}>
                <Text style={styles.queueTitle}>İndirme Kuyruğu</Text>
                {downloads.map((download) => (
                  <View key={download.id} style={styles.downloadItem}>
                    <View style={styles.downloadItemHeader}>
                      <Text style={styles.downloadItemTitle} numberOfLines={1}>
                        {download.title}
                      </Text>
                      <Text style={styles.downloadItemStatus}>
                        {download.status === 'queued'
                          ? 'Kuyrukta'
                          : download.status === 'downloading'
                          ? 'İndiriliyor'
                          : download.status === 'processing'
                          ? 'İşleniyor'
                          : download.status === 'completed'
                          ? 'Tamamlandı'
                          : download.status === 'error'
                          ? 'Hata'
                          : ''}
                      </Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          { width: `${download.percent}%` },
                          download.status === 'error' && styles.progressBarError,
                        ]}
                      />
                    </View>
                    <View style={styles.progressInfo}>
                      <Text style={styles.progressPercent}>{download.percent.toFixed(1)}%</Text>
                      {download.speed > 0 && (
                        <Text style={styles.progressSpeed}>{formatSpeed(download.speed)}</Text>
                      )}
                    </View>
                    {download.error && (
                      <Text style={styles.errorText}>Hata: {download.error}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'search' && (
          <View style={styles.tabContent}>
            <Text style={styles.label}>Arama Terimi</Text>
            <TextInput
              style={styles.input}
              placeholder="Aramak istediğiniz video..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchVideos}
            />

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={searchVideos}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>🔍 Ara</Text>
              )}
            </TouchableOpacity>

            {searchResults.map((result, index) => (
              <TouchableOpacity
                key={index}
                style={styles.resultCard}
                onPress={() => selectVideo(result)}
              >
                <Image source={{ uri: result.thumbnail }} style={styles.resultThumbnail} />
                <View style={styles.resultContent}>
                  <Text style={styles.resultTitle} numberOfLines={2}>
                    {result.title}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#fff',
  },
  tabButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#667eea',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  tabContent: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonPrimary: {
    backgroundColor: '#667eea',
  },
  buttonSecondary: {
    backgroundColor: '#764ba2',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  videoInfo: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  videoDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  resultThumbnail: {
    width: 120,
    height: 90,
    borderRadius: 8,
    marginRight: 10,
  },
  resultContent: {
    flex: 1,
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  downloadQueue: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  queueTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  downloadItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  downloadItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  downloadItemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  downloadItemStatus: {
    fontSize: 12,
    color: '#666',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 4,
  },
  progressBarError: {
    backgroundColor: '#f44336',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  progressSpeed: {
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
  },
});

export default App;
