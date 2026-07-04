import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_TIMEOUT = 10000;
const MAX_PAGES = 8;
const MAX_CONTENT_LENGTH = 8000;

// Patterns for important pages to crawl
const IMPORTANT_PATTERNS = [
  /\/(about|company|who-we-are|our-story)/i,
  /\/(products?|services?|solutions?|offerings?|features?|platform)/i,
  /\/(contact|get-in-touch|reach-us)/i,
  /\/(pricing|plans?|packages)/i,
  /\/(team|leadership|management)/i,
  /\/(careers?|jobs?)/i,
];

// Patterns to ignore
const IGNORE_PATTERNS = [
  /\/(login|signin|sign-in|signup|sign-up|register|auth|oauth)/i,
  /\/(cart|checkout|payment|billing)/i,
  /\/(blog|news|press|article|post)\//i,
  /\/(privacy|terms|legal|cookie|gdpr|tos|dmca)/i,
  /\/(help|support|faq|docs|documentation|api|developer)/i,
  /\.(pdf|jpg|jpeg|png|gif|svg|mp4|mp3|zip|csv|xml)$/i,
  /\/#/,
  /\/\?/,
  /mailto:/i,
  /tel:/i,
  /javascript:/i,
];

/**
 * Fetch a page with timeout and error handling
 */
async function fetchPage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error('Not HTML content');
    }

    const html = await response.text();
    return html;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extract meaningful content from HTML
 */
function extractContent(html, url) {
  const $ = cheerio.load(html);

  // Remove unwanted elements
  $('script, style, noscript, iframe, svg, canvas, video, audio').remove();
  $('nav, header, footer, aside').remove();
  $('.nav, .navbar, .header, .footer, .sidebar, .menu, .cookie, .popup, .modal, .banner, .ad, .ads, .advertisement').remove();
  $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();

  // Extract title
  const title = $('title').text().trim() || $('h1').first().text().trim() || '';

  // Extract meta description
  const metaDescription = $('meta[name="description"]').attr('content') || 
                          $('meta[property="og:description"]').attr('content') || '';

  // Extract main content (try specific selectors first)
  let content = '';
  const mainSelectors = ['main', 'article', '[role="main"]', '.main-content', '.content', '.page-content', '#content', '#main'];
  
  for (const selector of mainSelectors) {
    const el = $(selector);
    if (el.length && el.text().trim().length > 100) {
      content = el.text().trim();
      break;
    }
  }

  // Fallback to body
  if (!content || content.length < 100) {
    content = $('body').text().trim();
  }

  // Clean up whitespace
  content = content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()
    .substring(0, MAX_CONTENT_LENGTH);

  // Extract all internal links
  const baseUrl = new URL(url);
  const links = [];
  $('a[href]').each((_, el) => {
    try {
      const href = $(el).attr('href');
      if (!href) return;
      const absoluteUrl = new URL(href, url).href;
      const linkUrl = new URL(absoluteUrl);
      if (linkUrl.hostname === baseUrl.hostname) {
        links.push(absoluteUrl.split('#')[0].split('?')[0]); // strip hash and query
      }
    } catch (e) {
      // Invalid URL, skip
    }
  });

  return { title, metaDescription, content, links: [...new Set(links)] };
}

/**
 * Extract contact information using regex patterns
 */
function extractContactInfo(allContent) {
  const combined = allContent.join(' ');

  // Phone numbers
  const phonePatterns = [
    /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    /\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4}/g,
  ];
  let phone = null;
  for (const pattern of phonePatterns) {
    const matches = combined.match(pattern);
    if (matches && matches.length > 0) {
      phone = matches[0].trim();
      break;
    }
  }

  // Email addresses
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = combined.match(emailPattern) || [];
  const contactEmail = emails.find(e => 
    /contact|info|hello|support|sales|general/i.test(e)
  ) || emails[0] || null;

  // Address patterns (simplified)
  const addressPatterns = [
    /\d{1,5}\s+[\w\s]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl)[\s,]+[\w\s]+,?\s*[A-Z]{2}\s*\d{5}/gi,
    /[\w\s]+,\s*[\w\s]+,\s*[A-Z]{2}\s+\d{5}/g,
  ];
  let address = null;
  for (const pattern of addressPatterns) {
    const matches = combined.match(pattern);
    if (matches && matches.length > 0) {
      address = matches[0].trim();
      break;
    }
  }

  return { phone, email: contactEmail, address };
}

/**
 * Normalize a URL for deduplication
 */
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    let path = u.pathname.replace(/\/+$/, '') || '/';
    return `${u.protocol}//${u.hostname}${path}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Score a URL based on how important the page likely is
 */
function scoreUrl(url) {
  const path = new URL(url).pathname.toLowerCase();
  
  // Homepage gets highest priority
  if (path === '/' || path === '') return 100;
  
  // Check important patterns
  for (const pattern of IMPORTANT_PATTERNS) {
    if (pattern.test(path)) return 80;
  }
  
  // Short paths are likely more important
  const depth = path.split('/').filter(Boolean).length;
  if (depth === 1) return 60;
  if (depth === 2) return 40;
  
  return 20;
}

/**
 * Check if a URL should be ignored
 */
function shouldIgnore(url) {
  const path = new URL(url).pathname;
  return IGNORE_PATTERNS.some(pattern => pattern.test(path));
}

/**
 * Main crawl function - crawls a website and extracts content
 * @param {string} startUrl - The website URL to crawl
 * @param {function} onProgress - Optional callback for progress updates
 * @returns {object} Crawled data
 */
export async function crawlWebsite(startUrl, onProgress) {
  const results = {
    pages: [],
    contactInfo: {},
    allContent: [],
  };

  // Normalize the start URL
  let baseUrl;
  try {
    baseUrl = new URL(startUrl.startsWith('http') ? startUrl : `https://${startUrl}`);
  } catch {
    throw new Error(`Invalid URL: ${startUrl}`);
  }

  const homepageUrl = `${baseUrl.protocol}//${baseUrl.hostname}`;
  const visited = new Set();
  const toVisit = [homepageUrl];

  // Step 1: Crawl the homepage first to discover links
  if (onProgress) onProgress(`Crawling homepage: ${baseUrl.hostname}`);

  try {
    const html = await fetchPage(homepageUrl);
    const pageData = extractContent(html, homepageUrl);
    visited.add(normalizeUrl(homepageUrl));
    results.pages.push({ url: homepageUrl, title: pageData.title, content: pageData.content });
    results.allContent.push(pageData.content);

    // Add discovered links to the visit queue
    for (const link of pageData.links) {
      const normalized = normalizeUrl(link);
      if (!visited.has(normalized) && !shouldIgnore(link)) {
        toVisit.push(link);
      }
    }
  } catch (err) {
    if (onProgress) onProgress(`Failed to crawl homepage: ${err.message}`);
  }

  // Step 2: Sort remaining URLs by importance and crawl top ones
  const scoredUrls = toVisit
    .filter(url => !visited.has(normalizeUrl(url)))
    .map(url => ({ url, score: scoreUrl(url) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PAGES - 1); // -1 because we already crawled homepage

  for (const { url } of scoredUrls) {
    const normalized = normalizeUrl(url);
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    try {
      if (onProgress) onProgress(`Crawling: ${new URL(url).pathname}`);
      const html = await fetchPage(url);
      const pageData = extractContent(html, url);
      results.pages.push({ url, title: pageData.title, content: pageData.content });
      results.allContent.push(pageData.content);
    } catch (err) {
      // Skip failed pages silently
    }
  }

  // Step 3: Extract contact info from all crawled content
  results.contactInfo = extractContactInfo(results.allContent);

  return results;
}
