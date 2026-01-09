import { NextResponse } from 'next/server';
import { load, CheerioAPI } from 'cheerio';
import fetch from 'node-fetch';

// Types for the response
interface SeoAnalysisResponse {
    url: string;
    status: 'ok' | 'error';
    error?: string;
    onpage?: {
        title: {
            text: string;
            length: number;
            exists: boolean;
        };
        meta: {
            text: string;
            length: number;
            exists: boolean;
        };
        headings: {
            h1Count: number;
            h2Count: number;
            h3Count: number;
            h1Exists: boolean;
            h1Unique: boolean;
        };
        content: {
            wordCount: number;
        };
        keywords: Array<{ word: string; count: number; density: string }>;
    };
    technical?: {
        https: boolean;
        canonical: boolean;
        noindex: boolean;
        robotsTxt: boolean;
        sitemap: boolean;
    };
    warnings: string[];
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
            return NextResponse.json(
                { status: 'error', error: 'URL is required' },
                { status: 400 }
            );
        }

        // Ensure URL has protocol
        let targetUrl = url;
        if (!targetUrl.startsWith('http')) {
            targetUrl = `https://${targetUrl}`;
        }

        // 1. Fetch Main HTML
        let html = '';
        let response;
        try {
            response = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'SEOduel-Bot/1.0',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
            }
            html = await response.text();
        } catch (err: any) {
            return NextResponse.json(
                { status: 'error', error: err.message || 'Failed to fetch URL' },
                { status: 500 }
            );
        }

        const $ = load(html);
        const warnings: string[] = [];

        // 2. On-Page Analysis
        const onpage = analyzeOnPage($, html);

        // 3. Technical Analysis
        const technical = await analyzeTechnical(targetUrl, $, response);

        // Add generated warnings
        if (!onpage.title.exists) warnings.push('Missing Title tag');
        if (onpage.title.exists && (onpage.title.length < 30 || onpage.title.length > 60)) warnings.push('Title length should be between 30-60 characters');
        if (!onpage.meta.exists) warnings.push('Missing Meta Description');
        if (!onpage.headings.h1Exists) warnings.push('Missing H1 tag');
        if (!onpage.headings.h1Unique) warnings.push('Multiple H1 tags found');
        if (onpage.content.wordCount < 300) warnings.push('Low word count (less than 300 words)');
        if (!technical.https) warnings.push('Site is not using HTTPS');
        if (technical.noindex) warnings.push('Page is blocked from indexing (noindex)');

        const result: SeoAnalysisResponse = {
            url: targetUrl,
            status: 'ok',
            onpage,
            technical,
            warnings,
        };

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Analysis failed:', error);
        return NextResponse.json(
            { status: 'error', error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// --- Helper Functions ---

function analyzeOnPage($: CheerioAPI, html: string) {
    // Title
    const titleText = $('title').first().text().trim() || '';

    // Meta Description
    const metaDesc = $('meta[name="description" i]').attr('content')?.trim() ||
        $('meta[property="og:description" i]').attr('content')?.trim() || '';

    // Headings
    const h1Count = $('h1').length;
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;

    // Content & Keywords
    // Remove scripts, styles, etc. to get clean text
    $('script').remove();
    $('style').remove();
    $('noscript').remove();
    $('iframe').remove();

    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(' ').filter(w => w.length > 0).length;

    const keywords = extractKeywords(bodyText);

    return {
        title: {
            text: titleText,
            length: titleText.length,
            exists: titleText.length > 0,
        },
        meta: {
            text: metaDesc,
            length: metaDesc.length,
            exists: metaDesc.length > 0,
        },
        headings: {
            h1Count,
            h2Count,
            h3Count,
            h1Exists: h1Count > 0,
            h1Unique: h1Count === 1,
        },
        content: {
            wordCount,
        },
        keywords,
    };
}

async function analyzeTechnical(url: string, $: CheerioAPI, response: any) {
    const urlObj = new URL(url);

    // HTTPS
    const isHttps = urlObj.protocol === 'https:';

    // Canonical
    const canonicalLink = $('link[rel="canonical"]').attr('href');
    const hasCanonical = !!canonicalLink;

    // Meta Noindex
    const robotsMeta = $('meta[name="robots" i]').attr('content')?.toLowerCase() || '';
    const isNoIndex = robotsMeta.includes('noindex');

    // Robots.txt & Sitemap (Parallel Fetch)
    let hasRobotsTxt = false;
    let hasSitemap = false;

    try {
        const robotsUrl = `${urlObj.origin}/robots.txt`;
        const sitemapUrl = `${urlObj.origin}/sitemap.xml`;

        const [robotsRes, sitemapRes] = await Promise.all([
            fetch(robotsUrl, { method: 'HEAD', headers: { 'User-Agent': 'SEOduel-Bot/1.0' } }).catch(() => null),
            fetch(sitemapUrl, { method: 'HEAD', headers: { 'User-Agent': 'SEOduel-Bot/1.0' } }).catch(() => null),
        ]);

        hasRobotsTxt = robotsRes ? robotsRes.status === 200 : false;
        hasSitemap = sitemapRes ? sitemapRes.status === 200 : false;
    } catch (e) {
        // Ignore errors for aux checks
        console.warn('Auxiliary check failed', e);
    }

    return {
        https: isHttps,
        canonical: hasCanonical,
        noindex: isNoIndex,
        robotsTxt: hasRobotsTxt,
        sitemap: hasSitemap,
    };
}

function extractKeywords(text: string) {
    const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));

    const freqMap: Record<string, number> = {};
    words.forEach(w => {
        freqMap[w] = (freqMap[w] || 0) + 1;
    });

    const totalWords = words.length; // Total meaningful words for density calc

    return Object.entries(freqMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([word, count]) => ({
            word,
            count,
            density: ((count / totalWords) * 100).toFixed(2) + '%'
        }));
}
