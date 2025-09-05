# 🌟 Glassmorphism Todo App

Modern ve şık glassmorphism tasarımı ile yapılmış, tamamen Türkçe bir yapılacaklar listesi uygulaması.

## ✨ Özellikler

### 🎨 Tasarım
- **Glassmorphism Efekti**: Modern cam görünümü
- **Animasyonlu Arkaplan**: Yüzen bubbles animasyonları
- **Gradient Renkler**: Göz alıcı renk geçişleri
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu
- **Smooth Animasyonlar**: Yumuşak geçişler

### 📝 Todo Özellikleri
- **Görev Ekleme**: Hızlı ve kolay görev ekleme
- **Görev Düzenleme**: Mevcut görevleri düzenleme
- **Görev Silme**: Onay ile güvenli silme
- **Durum Değiştirme**: Tamamlandı/aktif durumu
- **Otomatik Kaydetme**: Local storage ile veri saklama

### 🔍 Filtreleme
- **Tümü**: Tüm görevleri görüntüle
- **Aktif**: Sadece tamamlanmamış görevler
- **Tamamlanan**: Sadece tamamlanmış görevler
- **Toplu Temizleme**: Tamamlanan görevleri temizle

### 🎯 İnteraktif Özellikler
- **Bildirimler**: Başarılı işlemler için toast bildirimleri
- **İstatistikler**: Toplam ve tamamlanan görev sayısı
- **Klavye Kısayolları**: Hızlı erişim için kısayollar
- **Form Validasyonu**: Giriş kontrolü

## 🚀 Kurulum

1. **Projeyi İndir**
   ```bash
   git clone https://github.com/tugaypurmus/ToDo-Glassroom.git
   cd ToDo-Glassroom
   ```

2. **Tarayıcıda Aç**
   - `index.html` dosyasını herhangi bir tarayıcıda açın
   - Veya bir local server kullanın:
     ```bash
     # Python 3
     python -m http.server 8000
     
     # Node.js (http-server ile)
     npx http-server
     
     # PHP
     php -S localhost:8000
     ```

3. **Kullanmaya Başla!**
   - Üst kısımdan yeni görevler ekleyin
   - Filtreleri kullanarak görevlerinizi organize edin
   - Verileriniz otomatik olarak kaydedilir

## 📱 Kullanım

### Görev Ekleme
1. Üst kısımdaki input alanına görevinizi yazın
2. "Ekle" butonuna tıklayın veya Enter'a basın
3. Göreviniz listeye eklenir ve otomatik kaydedilir

### Görev Yönetimi
- **Tamamlama**: Görev yanındaki daireye tıklayın
- **Düzenleme**: Kalem ikonuna tıklayın
- **Silme**: Çöp kutusu ikonuna tıklayın

### Filtreleme
- **Tümü**: Tüm görevleri gösterir
- **Aktif**: Sadece tamamlanmamış görevler
- **Tamamlanan**: Sadece tamamlanmış görevler

### Klavye Kısayolları
- `Ctrl/Cmd + Enter`: Yeni görev ekleme moduna geç
- `Enter`: Görev ekle (input aktifken)
- `Escape`: Input'u temizle

## 🛠️ Teknik Detaylar

### Dosya Yapısı
```
ToDo-Glassroom/
│
├── index.html          # Ana HTML dosyası
├── style.css           # Glassmorphism CSS stilleri
├── script.js           # JavaScript işlevleri
└── README.md           # Proje dokümantasyonu
```

### Teknolojiler
- **HTML5**: Semantik yapı
- **CSS3**: Glassmorphism efektleri, animasyonlar
- **Vanilla JavaScript**: Modern ES6+ özellikler
- **Local Storage**: Veri saklama
- **Font Awesome**: İkonlar

### Browser Desteği
- Chrome 88+
- Firefox 94+
- Safari 15+
- Edge 88+

## 🎨 Glassmorphism Özellikler

### CSS Efektleri
```css
/* Ana glassmorphism kartı */
.glass-card {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
}

/* Animasyonlu arkaplan */
.bubble {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    animation: float 20s infinite linear;
}
```

### Renk Paleti
- **Primary**: Linear gradient (135deg, #667eea 0%, #764ba2 100%)
- **Success**: Linear gradient (45deg, #4caf50, #8bc34a)
- **Error**: Linear gradient (45deg, #e53e3e, #fc8181)
- **Warning**: Linear gradient (45deg, #ffa726, #ffcc02)

## 📊 Performans

### Optimizasyonlar
- **Minimal DOM manipülasyonu**
- **Efficient event delegation**
- **Debounced input handling**
- **Lazy loading animations**
- **Memory leak prevention**

### Boyut
- **HTML**: ~3KB
- **CSS**: ~8KB
- **JavaScript**: ~12KB
- **Toplam**: ~23KB (gzipped: ~8KB)

## 🔄 Gelecek Özellikler

- [ ] **PWA Desteği**: Offline çalışma
- [ ] **Tema Değiştirici**: Dark/Light mode
- [ ] **Drag & Drop**: Görev sıralama
- [ ] **Kategoriler**: Görev gruplandırma
- [ ] **Due Date**: Tarih ekleme
- [ ] **Export/Import**: JSON backup
- [ ] **Ses Efektleri**: İnteraksiyon sesleri

## 🤝 Katkıda Bulunma

1. Bu repository'yi fork edin
2. Feature branch'i oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📝 Lisans

Bu proje MIT lisansı ile lisanslanmıştır. Detaylar için `LICENSE` dosyasını inceleyiniz.

## 👨‍💻 Geliştirici

**Tugay Purmuş**
- GitHub: [@tugaypurmus](https://github.com/tugaypurmus)
- Email: [tugay@example.com](mailto:tugay@example.com)

## 🙏 Teşekkürler

Bu proje modern web teknolojileri ve glassmorphism tasarım trendi kullanılarak geliştirilmiştir. İlham veren tüm tasarımcı ve geliştiricilere teşekkürler!

---

⭐ **Projeyi beğendiyseniz yıldız vermeyi unutmayın!**