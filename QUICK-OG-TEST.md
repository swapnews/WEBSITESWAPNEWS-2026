# Quick Test: OG Image Preview

## 🎯 Testing Preview Share ke Sosial Media

### 1. Test di Facebook

1. Buka [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
2. Paste URL artikel, contoh: `https://swapnews.co.id/artikel-slug`
3. Klik **Debug**
4. Cek hasil:
   - ✅ og:image harus muncul dengan URL valid (HTTPS)
   - ✅ Ukuran image harus 1200x630
   - ✅ Preview image harus ter-render
5. Jika perlu refresh: klik **Scrape Again**

### 2. Test di Twitter/X

1. Buka [Twitter Card Validator](https://cards-dev.twitter.com/validator)
2. Paste URL artikel
3. Klik **Preview card**
4. Cek hasil:
   - ✅ Card type: summary_large_image
   - ✅ Image ter-render dengan baik
   - ✅ Title dan description muncul

### 3. Test di WhatsApp

1. Buka WhatsApp Web atau Mobile
2. Paste link artikel ke chat (bisa ke diri sendiri)
3. Tunggu beberapa detik
4. Cek hasil:
   - ✅ Thumbnail image muncul
   - ✅ Title dan excerpt visible
   - ✅ Domain name (swapnews.co.id) muncul

**Note:** WhatsApp cache sangat aggressive, bisa butuh beberapa jam untuk update.

### 4. Test di LinkedIn

1. Buka [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
2. Paste URL artikel
3. Klik **Inspect**
4. Cek hasil:
   - ✅ Preview image muncul
   - ✅ Metadata lengkap

## 🔍 Quick Check dengan cURL

```bash
# Check metadata di HTML
curl -s https://swapnews.co.id/artikel-slug | grep -i "og:image"

# Should output:
# <meta property="og:image" content="https://res.cloudinary.com/.../w_1200,h_630,c_fill,q_auto,f_jpg/..." />
```

## 🧪 Test Script

```bash
# Test 20 artikel terbaru
node scripts/test-og-images.mjs

# Output akan show:
# - Artikel mana yang punya valid OG image
# - Artikel mana yang pakai data URI (akan fallback)
# - Stats summary
```

## ✅ Checklist Preview OK

Artikel **ready for share** jika:

- [ ] og:image URL adalah HTTPS (bukan data URI)
- [ ] Image size 1200x630 (check di Facebook Debugger)
- [ ] Format JPEG untuk Cloudinary images
- [ ] Filesize <300KB (WhatsApp requirement)
- [ ] Preview muncul di Facebook Debugger
- [ ] Preview muncul di Twitter Card Validator
- [ ] Preview muncul di WhatsApp (butuh waktu)

## 🐛 Troubleshooting

### Preview tidak muncul?

1. **Clear Platform Cache**
   ```
   Facebook: Scrape Again
   Twitter: Tunggu 24 jam atau ganti query string (?v=2)
   WhatsApp: Tidak bisa clear, tunggu natural cache expire
   ```

2. **Check Image URL Accessibility**
   ```bash
   curl -I <image-url>
   # Harus return: HTTP/2 200
   ```

3. **Verify di Browser Source**
   - View Page Source (Ctrl+U)
   - Search: `og:image`
   - Pastikan URL absolute dan HTTPS

### Artikel lama masih pakai Data URI?

Update featured media atau akan otomatis fallback ke:
1. Image pertama di konten artikel, ATAU
2. `/og-default.jpg` (fallback universal)

## 📊 Monitoring

Run audit berkala untuk detect issues:

```bash
# Full audit semua artikel
node scripts/og-audit.cjs

# Check hasil
type %TEMP%\swapnews-og-audit.txt
```

Stats yang ideal:
- `OK`: >95% artikel
- `NO_OG` / `DATAURI` / `INVALID`: <5%

---

**Last Updated:** ${new Date().toISOString().split('T')[0]}
