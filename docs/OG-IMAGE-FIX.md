# Perbaikan OpenGraph Image Preview

## Masalah yang Diperbaiki

Preview gambar artikel tidak muncul saat di-share ke sosial media (WhatsApp, Facebook, Twitter) karena:

1. **Data URI** - Beberapa artikel masih menggunakan data URI dari import WordPress yang tidak bisa di-render oleh scraper sosial media
2. **Gambar tidak optimal** - Gambar tidak ditransformasi ke ukuran standar OG (1200x630)
3. **Format file** - WebP tidak didukung oleh beberapa platform, perlu JPEG
4. **Ukuran file besar** - WhatsApp menolak gambar >300KB

## Solusi yang Diterapkan

### 1. Fungsi `transformOgImage()` - Optimasi Cloudinary

```typescript
export function transformOgImage(url: string): string {
    if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) return url;
    // Hapus transformasi existing sebelum menambahkan yang baru
    const cleanUrl = url.replace(/\/upload\/[^\/]+\//, "/image/upload/");
    return cleanUrl.replace("/image/upload/", "/image/upload/w_1200,h_630,c_fill,q_auto,f_jpg/");
}
```

**Perubahan:**
- Menghapus transformasi existing dulu sebelum apply transformasi baru
- Memastikan format JPEG (`f_jpg`) untuk kompatibilitas maksimal
- Ukuran tepat 1200x630 (standar OG)

### 2. Fungsi `resolveSeoImage()` - Resolusi Image URL

```typescript
export function resolveSeoImage(
    imageUrl?: string | null | { secure_url?: string },
    fallback = "/og-default.jpg"
): string {
    let url: string | undefined;
    
    if (typeof imageUrl === "string") {
        // Tolak data URI langsung
        if (imageUrl.startsWith("data:")) {
            return absoluteUrl(fallback);
        }
        url = imageUrl.startsWith("http") ? imageUrl : absoluteUrl(imageUrl);
    } else if (imageUrl && typeof imageUrl === "object" && "secure_url" in imageUrl) {
        url = typeof imageUrl.secure_url === "string" ? imageUrl.secure_url : undefined;
    }
    
    // Tolak URL non-http
    if (!url || !isValidHttpUrl(url)) {
        return absoluteUrl(fallback);
    }
    
    return transformOgImage(url);
}
```

**Perubahan:**
- Deteksi dan reject data URI lebih awal
- Fallback ke `og-default.jpg` (1200x630, <100KB)
- Gunakan `absoluteUrl()` untuk semua URL relatif

### 3. Update `generateMetadata()` di Artikel

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const article = await resolveArticle(slug);
    if (!article) return { title: "Artikel tidak ditemukan" };
    
    // Resolusi gambar OG dengan penanganan data URI dan fallback
    const imageRaw = articleImage(article);
    let imageUrl: string;
    
    if (imageRaw.startsWith("data:")) {
        // Featured media berupa data URI → ambil gambar valid dari konten
        const contentImage = extractFirstImageFromHtml(article.content);
        imageUrl = contentImage ? resolveSeoImage(contentImage) : resolveSeoImage(null);
    } else {
        imageUrl = resolveSeoImage(imageRaw);
    }

    // ... rest of metadata
}
```

**Perubahan:**
- Check explicit untuk data URI
- Fallback ke gambar dalam konten artikel jika featured image invalid
- Double fallback ke `og-default.jpg` jika semua gagal

## Testing

### 1. Test Script

```bash
node scripts/test-og-images.mjs
```

Script ini akan:
- Check 20 artikel terbaru
- Verifikasi URL gambar valid
- Detect data URI dan missing images
- Show transformasi Cloudinary

### 2. OG Audit Script

```bash
# Generate sitemap URLs
node scripts/generate-sitemap-urls.js > %TEMP%\swapnews-sitemap-urls.txt

# Run audit
node scripts/og-audit.cjs

# Check results
type %TEMP%\swapnews-og-audit.txt
```

### 3. Manual Testing

Test di berbagai platform:

**Facebook Debugger:**
```
https://developers.facebook.com/tools/debug/
```

**Twitter Card Validator:**
```
https://cards-dev.twitter.com/validator
```

**LinkedIn Post Inspector:**
```
https://www.linkedin.com/post-inspector/
```

**WhatsApp:**
- Share link ke WhatsApp Web
- Check preview muncul dengan benar

## Checklist Verifikasi

- [ ] Semua artikel memiliki OG image URL yang valid (HTTPS)
- [ ] Tidak ada data URI dalam OG tags
- [ ] Gambar Cloudinary menggunakan transformasi 1200x630
- [ ] Format gambar adalah JPEG (`f_jpg`)
- [ ] Fallback image (`og-default.jpg`) tersedia dan <100KB
- [ ] Preview muncul di Facebook
- [ ] Preview muncul di Twitter
- [ ] Preview muncul di WhatsApp
- [ ] Preview muncul di LinkedIn

## File yang Dimodifikasi

1. `src/lib/seo/metadata.ts` - Core metadata functions
2. `src/app/[slug]/page.tsx` - Artikel page metadata
3. `scripts/test-og-images.mjs` - Testing script (NEW)

## Hasil yang Diharapkan

Setelah perbaikan ini:

✅ **Semua artikel** akan memiliki preview image saat di-share
✅ **Format optimal** (1200x630 JPEG) untuk semua platform
✅ **Load cepat** karena sudah di-optimasi Cloudinary
✅ **Fallback reliable** jika image rusak/hilang

## Maintenance

### Update Featured Image untuk Data URI

Jika masih ada artikel dengan data URI, run migration:

```sql
-- Find articles with data URI
SELECT id, slug, title 
FROM articles 
WHERE featured_media_id IN (
    SELECT id FROM media_assets 
    WHERE secure_url LIKE 'data:%'
);

-- Update to use first image in content or fallback
-- (Manual process or create migration script)
```

### Monitor OG Performance

Schedule regular audit:

```bash
# Cron job setiap minggu
0 0 * * 0 node scripts/og-audit.cjs
```

## Troubleshooting

### Preview masih tidak muncul?

1. **Clear cache platform sosial media**
   - Facebook: gunakan Sharing Debugger dan klik "Scrape Again"
   - Twitter: tunggu 24 jam atau gunakan Card Validator
   - WhatsApp: tidak ada cara clear cache, tunggu beberapa jam

2. **Check image accessibility**
   - Pastikan image URL bisa diakses publik
   - Test: `curl -I <image-url>`
   - Response harus 200 OK

3. **Verify metadata di browser**
   - View page source
   - Search `og:image`
   - Pastikan URL valid dan absolute

4. **Check Cloudinary quota**
   - Login ke Cloudinary dashboard
   - Check transformasi tidak exceeded quota
