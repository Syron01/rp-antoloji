# RPAntoloji

Rol yapma (RP) botlarının kategorilere göre keşfedilebildiği, aranabilir, mobil öncelikli bağımsız web kütüphanesi. Ryuko AI'dan bağımsız bir statik sitedir — GitHub Pages üzerinde çalışır, sunucu gerekmez.

## Özellikler

- **Sekmeli arayüz:** Keşfet / Kategoriler / Favoriler / Bilgi
- **Kategori + arama filtresi** (isim, etiket, açıklama, sahne metni)
- **Görüntülenme sayacı:** bot detayına her girişte artar ([counterapi.dev](https://counterapi.dev) + localStorage yedeği)
- **Her alan kopyalanabilir:** açıklama, karşılama, kişilik, senaryo, öz — tek tek veya tümü
- **JSON indirme:** tek bot veya tüm katalog
- **Favoriler:** localStorage'da, hesap gerekmez
- Google Material Symbols ikonları, emoji yok; Manrope tipografi; her ekran boyutuna uyumlu

## Veri

`data/bots.json` — 421 özgün Türkçe RP botu (isim, kategori, etiketler, açıklama, karşılama sahnesi, kişilik, senaryo ilerleyişi, öz).

## Yerel çalıştırma

Statik dosyalar — herhangi bir sunucu yeterli:

```bash
python -m http.server 8080
# http://localhost:8080
```

## Dağıtım

GitHub Pages: `main` dalından otomatik yayınlanır.
