export interface MetricResult {
    metric?: string; // Internal name if needed
    title: string;
    status: "good" | "warning" | "critical" | "unknown";
    plainExplanation: string;
    whyItMatters: string;
    action: string;
}

export interface SeoSection {
    name: string;
    metrics: MetricResult[];
}

export interface SeoBreakdownCategory {
    score: number;
    label: string;
    description: string;
    passed: number;
    total: number;
    priority: "good" | "warning" | "critical";
}

export interface SeoBreakdown {
    onPage: SeoBreakdownCategory;
    technical: SeoBreakdownCategory;
    authority: SeoBreakdownCategory;
    summary: {
        weakestArea: string;
        strongestArea: string;
        recommendedFocus: string;
    };
}

export interface SeoReport {
    sections: SeoSection[];
    summary: {
        actions: string[];
    };
    score: number;
    seoBreakdown: SeoBreakdown;
}

export function interpretSeoMetrics(data: any): SeoReport {
    const sections: SeoSection[] = [];

    // Helper to safely get nested values
    const get = (obj: any, path: string, defaultValue: any = null) => {
        return path.split('.').reduce((o, key) => (o && o[key] !== undefined ? o[key] : defaultValue), obj);
    };

    // 1. Search Visibility
    const searchVisibility: MetricResult[] = [];

    // Title Length
    const titleLen = get(data, 'onpage.title.length', 0);
    const titleExists = get(data, 'onpage.title.exists', false);
    if (!titleExists) {
        searchVisibility.push({
            title: "Page Title",
            status: "critical",
            plainExplanation: "Your page doesn't have a title defined in the code.",
            whyItMatters: "Google uses this title to show your page in search results. Without it, you look invisible or broken.",
            action: "Add a clear, short title between 30 and 60 characters."
        });
    } else if (titleLen > 60) {
        searchVisibility.push({
            title: "Title Length",
            status: "critical",
            plainExplanation: `Your title is too long (${titleLen} characters).`,
            whyItMatters: "Google will cut off the end of long titles, making your link look messy and unprofessional to searchers.",
            action: "Shorten the title to under 60 characters."
        });
    } else if (titleLen < 30) {
        searchVisibility.push({
            title: "Title Length",
            status: "warning",
            plainExplanation: "Your title is a bit too short.",
            whyItMatters: "Short titles don't give Google enough context to rank you for different search terms.",
            action: "Add a few more descriptive words or your brand name to the title."
        });
    } else {
        searchVisibility.push({
            title: "Title Length",
            status: "good",
            plainExplanation: "Your title length is perfect.",
            whyItMatters: "It will display fully on most screens, ensuring people see your full message.",
            action: "Keep it as is."
        });
    }

    // Meta Description
    const metaExists = get(data, 'onpage.meta.exists', false);
    const metaLen = get(data, 'onpage.meta.length', 0);
    if (!metaExists) {
        searchVisibility.push({
            title: "Search Snippet (Meta)",
            status: "critical",
            plainExplanation: "There is no description for this page in the search results.",
            whyItMatters: "Google has to guess what your page is about, which often leads to less clicks from potential visitors.",
            action: "Add a compelling description of 120-160 characters."
        });
    } else if (metaLen < 100 || metaLen > 160) {
        searchVisibility.push({
            title: "Search Snippet (Meta)",
            status: "warning",
            plainExplanation: "The description of your page is either too short or too long.",
            whyItMatters: "If it's too long, it gets cut off. If it's too short, it's not convincing enough for users to click.",
            action: "Aim for a length between 120 and 160 characters."
        });
    } else {
        searchVisibility.push({
            title: "Search Snippet (Meta)",
            status: "good",
            plainExplanation: "Your search result description is well-balanced.",
            whyItMatters: "It helps you stand out and encourages more people to click on your link.",
            action: "No changes needed."
        });
    }

    // OG Title & Image (Simplified)
    const hasOg = get(data, 'onpage.og.hasOg', false);
    searchVisibility.push({
        title: "Social Media Preview",
        status: hasOg ? "good" : "warning",
        plainExplanation: hasOg ? "Social media preview signals are present." : "Missing specific signals for social media sharing.",
        whyItMatters: "When people share your link on Facebook or Twitter, these signals ensure it looks beautiful with an image and title.",
        action: hasOg ? "Check if the images look good." : "Add 'Open Graph' tags to control how your site looks on social media."
    });

    sections.push({ name: "Search visibility", metrics: searchVisibility });

    // 2. Content Strength
    const contentStrength: MetricResult[] = [];

    // H1
    const h1Count = get(data, 'onpage.headings.h1Count', 0);
    if (h1Count === 0) {
        contentStrength.push({
            title: "Main Headline (H1)",
            status: "critical",
            plainExplanation: "Google can't quickly understand what this specific page is about because the main headline is missing.",
            whyItMatters: "The H1 is the primary signal to Google and visitors about the page's topic. Without it, your message is lost.",
            action: "Add one clear main headline (H1 tag) to the top of the page."
        });
    } else if (h1Count > 1) {
        contentStrength.push({
            title: "Main Headlines (H1)",
            status: "warning",
            plainExplanation: "You have multiple main headlines on this page.",
            whyItMatters: "It's like reading a book with two different titles on the same cover; it confuses Google about your main focus.",
            action: "Keep only one main headline and turn the others into sub-headlines."
        });
    } else {
        contentStrength.push({
            title: "Main Headline (H1)",
            status: "good",
            plainExplanation: "You have a clear, single main headline.",
            whyItMatters: "Google knows exactly what the topic of this page is.",
            action: "Good job, no action needed."
        });
    }

    // Word Count
    const wc = get(data, 'onpage.content.wordCount', 0);
    if (wc < 300) {
        contentStrength.push({
            title: "Content Depth",
            status: "critical",
            plainExplanation: `This page is very 'thin' with only ${wc} words.`,
            whyItMatters: "Google prefers pages that provide thorough answers. Short pages rarely rank on the first page.",
            action: "Expand your content with more helpful details, examples, or data."
        });
    } else if (wc < 600) {
        contentStrength.push({
            title: "Content Depth",
            status: "warning",
            plainExplanation: "The content is okay, but it might not be enough to beat competitors.",
            whyItMatters: "The top results in Google usually have between 1000 and 2000 words.",
            action: "Consider adding more value or answering common questions people have about this topic."
        });
    } else {
        contentStrength.push({
            title: "Content Depth",
            status: "good",
            plainExplanation: "You have a solid amount of content on this page.",
            whyItMatters: "This shows Google you are covering the topic seriously.",
            action: "Ensure the content stays updated and relevant."
        });
    }

    // Image Alt Tags
    const altStats = get(data, 'onpage.images.altStats', { total: 0, missing: 0 });
    if (altStats.total > 0 && altStats.missing > 0) {
        contentStrength.push({
            title: "Image accessibility",
            status: "warning",
            plainExplanation: `${altStats.missing} images on your site have no text descriptions.`,
            whyItMatters: "Google cannot 'see' images. It uses these descriptions to understand what's in the picture and rank you in Image Search.",
            action: "Add descriptive 'alt text' to every image on your page."
        });
    } else if (altStats.total > 0) {
        contentStrength.push({
            title: "Image accessibility",
            status: "good",
            plainExplanation: "All your images have text descriptions.",
            whyItMatters: "This helps blind users and gives Google more keywords to rank you for.",
            action: "Perfect. No action needed."
        });
    }

    sections.push({ name: "Content strength", metrics: contentStrength });

    // 3. Technical Health
    const technicalHealth: MetricResult[] = [];

    // HTTPS
    const isHttps = get(data, 'technical.https', false);
    technicalHealth.push({
        title: "Connection Security",
        status: isHttps ? "good" : "critical",
        plainExplanation: isHttps ? "Your connection is secure." : "Your website is flagged as 'Not Secure' by Google.",
        whyItMatters: "Google downranks non-secure websites and browsers show a scary warning to your visitors.",
        action: isHttps ? "No action needed." : "Enable HTTPS (SSL certificate) immediately."
    });

    // Mobile
    const isMobile = get(data, 'technical.mobileFriendly', false);
    technicalHealth.push({
        title: "Mobile Friendliness",
        status: isMobile ? "good" : "critical",
        plainExplanation: isMobile ? "Your site is built for mobile users." : "Your site might be hard to use on a phone.",
        whyItMatters: "Over 60% of searches happen on mobile. Google uses the mobile version of your site to rank you.",
        action: isMobile ? "No action needed." : "Check your 'viewport' settings and ensure text isn't too small."
    });

    // Indexing
    const noIndex = get(data, 'technical.noindex', false);
    technicalHealth.push({
        title: "Search Visibility Lock",
        status: noIndex ? "critical" : "good",
        plainExplanation: noIndex ? "Your site is currently hidden from Google." : "Google is allowed to show your site in results.",
        whyItMatters: "If this is 'on', you will NEVER rank in Google, no matter how good your content is.",
        action: noIndex ? "Remove the 'noindex' tag from your code." : "Keep it as is."
    });

    // Sitemap/Robots
    const hasSitemap = get(data, 'technical.sitemap', false);
    technicalHealth.push({
        title: "Google's Map (Sitemap)",
        status: hasSitemap ? "good" : "warning",
        plainExplanation: hasSitemap ? "You have a map for Google to follow." : "Google doesn't have an easy sitemap to find all your pages.",
        whyItMatters: "A sitemap helps Google find and crawl and index all your important pages faster.",
        action: hasSitemap ? "No action needed." : "Create a sitemap.xml file and submit it to Google."
    });

    sections.push({ name: "Technical health", metrics: technicalHealth });

    // 4. Trust & Credibility
    const trustCredibility: MetricResult[] = [];

    // Internal Links
    const internalCount = get(data, 'trust.internalLinks', 0);
    trustCredibility.push({
        title: "Topic Connection",
        status: internalCount > 5 ? "good" : "warning",
        plainExplanation: internalCount > 0 ? `You have ${internalCount} internal links.` : "No links to other pages on your site found.",
        whyItMatters: "Linking to your other pages helps Google understand your expertise and spreads 'ranking power' throughout your site.",
        action: internalCount > 5 ? "Keep linking to relevant pages." : "Add links to 5-10 other relevant pages on your website."
    });

    // Schema
    const hasSchema = get(data, 'trust.hasSchema', false);
    trustCredibility.push({
        title: "Rich Search Results",
        status: hasSchema ? "good" : "warning",
        plainExplanation: hasSchema ? "You are using special code to speak to Google." : "You aren't using 'Schema' code on this page.",
        whyItMatters: "This code helps you get 'rich results' like star ratings, prices, or FAQ snippets that stand out.",
        action: hasSchema ? "Ensure the data is accurate." : "Add 'LD+JSON' schema markup for your business or product."
    });

    sections.push({ name: "Trust & credibility", metrics: trustCredibility });

    // 5. Growth Signals
    const growthSignals: MetricResult[] = [];

    // Referring Domains (Simulated/Unknown for now as per rules)
    growthSignals.push({
        title: "Other Sites Recommending You",
        status: "unknown",
        plainExplanation: "We couldn't determine the number of websites linking to you.",
        whyItMatters: "Getting links from other sites is the #1 way to build authority and outrank big competitors.",
        action: "Register for a free service like Google Search Console to see your backlinks."
    });

    growthSignals.push({
        title: "Domain Authority",
        status: "unknown",
        plainExplanation: "Domain age and history could not be verified.",
        whyItMatters: "Older, well-established sites often have an easier time ranking than brand new ones.",
        action: "Focus on creating high-quality, unique content to build your site's reputation over time."
    });

    sections.push({ name: "Growth signals", metrics: growthSignals });

    // Summary logic
    const criticalMetris: MetricResult[] = [];
    sections.forEach(s => s.metrics.forEach(m => {
        if (m.status === 'critical') criticalMetris.push(m);
    }));

    const actions = criticalMetris.slice(0, 4).map(m => m.action);
    if (actions.length === 0) actions.push("Focus on getting more high-quality links from other websites.");

    // SEO Breakdown logic
    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
    const getPriority = (score: number): "good" | "warning" | "critical" => {
        if (score < 30) return "critical";
        if (score < 70) return "warning";
        return "good";
    };

    const calculateCat = (metrics: MetricResult[], label: string, description: string): SeoBreakdownCategory => {
        const total = metrics.length;
        const passed = metrics.filter(m => m.status === 'good').length;
        const score = total > 0 ? clamp(Math.round((passed / total) * 100), 15, 95) : 15;
        return {
            score,
            label,
            description,
            passed,
            total,
            priority: getPriority(score)
        };
    };

    const seoBreakdown: SeoBreakdown = {
        onPage: calculateCat([...searchVisibility, ...contentStrength], "On-page SEO", "Content and keyword optimization"),
        technical: calculateCat(technicalHealth, "Technical SEO", "Speed, crawlability, and indexability"),
        authority: calculateCat([...trustCredibility, ...growthSignals], "Authority", "Links, trust, and domain strength"),
        summary: {
            weakestArea: "",
            strongestArea: "",
            recommendedFocus: ""
        }
    };

    // Determine weakest/strongest
    const categories: { key: string; score: number }[] = [
        { key: "onPage", score: seoBreakdown.onPage.score },
        { key: "technical", score: seoBreakdown.technical.score },
        { key: "authority", score: seoBreakdown.authority.score }
    ];

    categories.sort((a, b) => a.score - b.score);
    seoBreakdown.summary.weakestArea = categories[0].key;
    seoBreakdown.summary.strongestArea = categories[2].key;
    seoBreakdown.summary.recommendedFocus = categories[0].key;

    return {
        sections,
        summary: {
            actions
        },
        score: calculateAggregatedScore(sections),
        seoBreakdown
    };
}

function calculateAggregatedScore(sections: SeoSection[]): number {
    let total = 0;
    let count = 0;
    sections.forEach(s => s.metrics.forEach(m => {
        if (m.status === 'good') total += 100;
        else if (m.status === 'warning') total += 50;
        else if (m.status === 'critical') total += 0;
        else total += 70; // unknown
        count++;
    }));
    return Math.round(total / count);
}
