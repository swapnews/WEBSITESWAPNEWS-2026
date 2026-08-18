#!/usr/bin/env node
/**
 * Script untuk test OG image generation
 * Usage: node scripts/test-og-images.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function isValidHttpUrl(value) {
    return value.startsWith('http://') || value.startsWith('https://');
}

function transformOgImage(url) {
    if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url;
    // Hapus transformasi existing sebelum menambahkan yang baru
    const cleanUrl = url.replace(/\/upload\/[^\/]+\//, '/image/upload/');
    return cleanUrl.replace('/image/upload/', '/image/upload/w_1200,h_630,c_fill,q_auto,f_jpg/');
}

function resolveSeoImage(imageUrl, fallback = 'https://swapnews.co.id/og-default.jpg') {
    let url;
    
    if (typeof imageUrl === 'string') {
        // Tolak data URI langsung
        if (imageUrl.startsWith('data:')) {
            return fallback;
        }
        url = imageUrl.startsWith('http') 
            ? imageUrl 
            : `https://swapnews.co.id${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
    } else if (imageUrl && typeof imageUrl === 'object' && 'secure_url' in imageUrl) {
        url = typeof imageUrl.secure_url === 'string' ? imageUrl.secure_url : undefined;
    }
    
    // Tolak URL non-http
    if (!url || !isValidHttpUrl(url)) {
        return fallback;
    }
    
    return transformOgImage(url);
}

async function testArticleImages() {
    console.log('🔍 Testing artikel OG images...\n');
    
    const { data: articles, error } = await supabase
        .from('articles')
        .select('id, slug, title, featured_media:media_assets(secure_url, alt_text)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(20);
    
    if (error) {
        console.error('❌ Error fetching articles:', error);
        return;
    }
    
    const stats = {
        total: articles.length,
        valid: 0,
        dataUri: 0,
        missing: 0,
        cloudinary: 0,
    };
    
    articles.forEach((article, index) => {
        const media = Array.isArray(article.featured_media) 
            ? article.featured_media[0] 
            : article.featured_media;
        
        const imageRaw = media?.secure_url || '';
        
        if (!imageRaw) {
            console.log(`${index + 1}. ⚠️  ${article.slug}`);
            console.log(`   No image - will use fallback`);
            console.log(`   Result: https://swapnews.co.id/og-default.jpg\n`);
            stats.missing++;
        } else if (imageRaw.startsWith('data:')) {
            console.log(`${index + 1}. ⚠️  ${article.slug}`);
            console.log(`   Data URI detected - will use fallback`);
            console.log(`   Result: https://swapnews.co.id/og-default.jpg\n`);
            stats.dataUri++;
        } else {
            const resolved = resolveSeoImage(imageRaw);
            const isCloudinary = resolved.includes('res.cloudinary.com');
            const isOptimized = resolved.includes('w_1200,h_630');
            
            console.log(`${index + 1}. ✅ ${article.slug}`);
            console.log(`   Source: ${imageRaw.substring(0, 80)}...`);
            console.log(`   Result: ${resolved}`);
            console.log(`   Cloudinary: ${isCloudinary ? '✓' : '✗'} | Optimized: ${isOptimized ? '✓' : '✗'}\n`);
            
            stats.valid++;
            if (isCloudinary) stats.cloudinary++;
        }
    });
    
    console.log('\n📊 Summary:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   ✅ Valid: ${stats.valid} (${Math.round(stats.valid/stats.total*100)}%)`);
    console.log(`   ☁️  Cloudinary: ${stats.cloudinary} (${Math.round(stats.cloudinary/stats.valid*100)}% of valid)`);
    console.log(`   ⚠️  Data URI: ${stats.dataUri}`);
    console.log(`   ⚠️  Missing: ${stats.missing}`);
}

testArticleImages().catch(console.error);
