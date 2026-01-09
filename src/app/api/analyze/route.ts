import { NextResponse } from 'next/server';
import { load, CheerioAPI } from 'cheerio';
import fetch from 'node-fetch';
import { interpretSeoMetrics, SeoReport } from '@/lib/seo-interpreter';

interface SeoAnalysisResponse {
    url: string;
    status: 'ok' | 'error';
    error?: string;
    onpage?: any;
    technical?: any;
    trust?: any; // Added trust section
    warnings: string[];
    report?: SeoReport;
}

const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
    'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
    'will', 'with', 'i', 'you', 'your', 'we', 'they', 'this', 'or', 'but', 'not'
]);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json({ status: 'error', error: 'URL is required' }, { status: 400 });
        }

        let targetUrl = url;
        if (!targetUrl.startsWith('http')) {
            targetUrl = `https://${targetUrl}`;
        }

        let html = '';
        let fetchResponse;
        try {
            fetchResponse = await fetch(targetUrl, {
                headers: { 'User-Agent': 'SEOduel-Bot/1.0' }
            });
            if (!fetchResponse.ok) {
                throw new Error(`Failed to fetch URL: ${fetchResponse.status}`);
            }
            html = await fetchResponse.text();
        } catch (err: any) {
            return NextResponse.json({ status: 'error', error: err.message || 'Failed to fetch URL' }, { status: 500 });
        }

        const $ = load(html);

        // 1. On-Page Analysis
        const onpage = analyzeOnPage($, html, targetUrl);

        // 2. Technical Analysis
        const technical = await analyzeTechnical(targetUrl, $, fetchResponse, html);

        // 3. Trust Analysis
        const trust = analyzeTrust($, targetUrl);

        // Generate Human Report
        const report = interpretSeoMetrics({
            onpage,
            technical,
            trust
        });

        const result: SeoAnalysisResponse = {
            url: targetUrl,
            status: 'ok',
            onpage,
            technical,
            trust,
            warnings: [],
            report
        };

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Analysis failed:', error);
        return NextResponse.json({ status: 'error', error: 'Internal server error' }, { status: 500 });
    }
}

function analyzeOnPage($: CheerioAPI, html: string, url: string) {
    const titleText = $('title').first().text().trim() || '';
    const metaDesc = $('meta[name="description" i]').attr('content')?.trim() ||
        $('meta[property="og:description" i]').attr('content')?.trim() || '';

    const h1s = $('h1').map((i, el) => $(el).text().trim()).get();
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;

    // OG Tags
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const hasOg = !!(ogTitle || ogImage);

    // Images
    const imgs = $('img');
    const totalImgs = imgs.length;
    const missingAlt = imgs.filter((i, el) => !$(el).attr('alt')).length;

    // Text & Words
    const $clone = load(html);
    $clone('script, style, noscript, iframe').remove();
    const cleanText = $clone('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = cleanText.split(' ').filter(w => w.length > 0).length;

    return {
        title: { text: titleText, length: titleText.length, exists: !!titleText },
        meta: { text: metaDesc, length: metaDesc.length, exists: !!metaDesc },
        headings: {
            h1Count: h1s.length,
            h2Count,
            h3Count,
            h1Exists: h1s.length > 0,
            h1Unique: h1s.length === 1
        },
        og: { hasOg, ogTitle, ogImage },
        images: {
            altStats: { total: totalImgs, missing: missingAlt }
        },
        content: { wordCount }
    };
}

async function analyzeTechnical(url: string, $: CheerioAPI, response: any, html: string) {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const hasViewport = !!$('meta[name="viewport"]').attr('content');
    const robotsMeta = $('meta[name="robots" i]').attr('content')?.toLowerCase() || '';
    const isNoIndex = robotsMeta.includes('noindex');

    // Sitemap check (quick)
    let hasSitemap = false;
    try {
        const sitemapUrl = `${urlObj.origin}/sitemap.xml`;
        const sRes = await fetch(sitemapUrl, { method: 'HEAD' }).catch(() => null);
        hasSitemap = sRes ? sRes.status === 200 : false;
    } catch { }

    return {
        https: isHttps,
        mobileFriendly: hasViewport,
        noindex: isNoIndex,
        sitemap: hasSitemap,
        doctype: html.toLowerCase().startsWith('<!doctype html>'),
        charset: $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type"]').attr('content')
    };
}

function analyzeTrust($: CheerioAPI, url: string) {
    const origin = new URL(url).origin;
    const links = $('a');
    let internal = 0;
    links.each((i, el) => {
        const href = $(el).attr('href');
        if (href && (href.startsWith('/') || href.includes(origin))) {
            internal++;
        }
    });

    const hasSchema = $('script[type="application/ld+json"]').length > 0;

    return {
        internalLinks: internal,
        hasSchema
    };
}

function extractKeywords(text: string) {
    // Basic extraction
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
    const freq: any = {};
    words.forEach(w => freq[w] = (freq[w] || 0) + 1);
    return Object.entries(freq).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(e => ({ word: e[0], count: e[1] }));
}
