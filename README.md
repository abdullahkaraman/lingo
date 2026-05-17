# LİNGO

Türkçe kelime tahmin oyunu. Her turda rastgele bir Türkçe kelime seçilir ve oyuncu sınırlı süre içinde kelimeyi tahmin etmeye çalışır.

**[Canlı oyun →](https://lingo-eight-chi.vercel.app)**

---

## Nasıl Oynanır?

1. Başlamadan önce kelime uzunluğunu (4–7 harf) ve satır başına düşen süreyi (10–20 sn) seçin.
2. Her satırda bir kelime tahmin edin. İlk harf kilitlidir ve doğru verilir.
3. Her tahminin ardından harfler renkle işaretlenir:
   - 🟩 **Yeşil** — doğru harf, doğru konum
   - 🟨 **Sarı** — doğru harf, yanlış konum
   - ⬛ **Gri** — kelimede bu harf yok
4. 5 tahmin hakkınız var. Süre biterse o satır geçilir.

---

## Özellikler

- **Kelime uzunluğu seçimi** — 4, 5, 6 veya 7 harfli kelimeler
- **Süre seçimi** — satır başına 10–20 saniye arası ayarlanabilir
- **Mobil klavye** — telefonda cihazın kendi klavyesi açılır
- **Ses girişi** — Web Speech API ile Türkçe sözlü tahmin (tarayıcı destekliyorsa)
- **Çevrimdışı çalışır** — sözlük doğrulaması yerel; internet gerekmez
- **Tekrar yok** — daha önce çıkmış kelimeler bir daha gösterilmez (`localStorage`)
- **Skor sistemi** — kaçıncı tahminde bildiğinize göre 400–2000 puan

---

## Teknik Yığın

| Katman | Teknoloji |
|---|---|
| UI | React 18 + TypeScript |
| Stil | Tailwind CSS |
| Durum yönetimi | Zustand |
| Build aracı | Vite |
| Deployment | Vercel |

---

## Yerel Kurulum

```bash
git clone https://github.com/abdullahkaraman/lingo.git
cd lingo
npm install
npm run dev
```

Uygulama `http://localhost:5173` adresinde açılır.

---

## Kelime Listesini Güncelleme

Oyun iki ayrı kelime listesi kullanır:

| Dosya | Amaç |
|---|---|
| `src/data/tdk-words.json` | Hedef kelime havuzu (sık kullanılan kelimeler, frekans ≥ 30) |
| `src/data/tdk-valid.json` | Tahmin doğrulama sözlüğü (tüm TDK kelimeleri) |

Her iki dosyayı aynı anda oluşturmak için:

```bash
npm run fetch-words
```

Bu komut TDK kelime listesini ve OpenSubtitles Türkçe frekans korpusunu çekerek her iki JSON dosyasını yeniden oluşturur.

---

## Sürüm Geçmişi

Tüm değişiklikler sürüm sürüm [CHANGELOG.md](./CHANGELOG.md) dosyasında belgelenmiştir.

---

## Lisans

MIT
