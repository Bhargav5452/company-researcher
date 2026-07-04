import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_TIMEOUT = 10000;
const MAX_PAGES = 8;
const MAX_CONTENT_LENGTH = 8000;

const IMPORTANT_PATTERNS = [
  /\/(about|company|who-we-are|our-story)/i,
  /\/(products?|services?|solutions?|offerings?|features?|platform)/i,
  /\/(contact|get-in-touch|reach-us)/i,
  /\/(pricing|plans?|packages)/i,
  /\/(team|leadership|management)/i,
  /\/(careers?|jobs?)/i,
];

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

async function fetchPage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) throw new Error('Not HTML');
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function extractContent(html, url) {
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe, svg, canvas, video, audio').remove();
  $('nav, header, footer, aside').remove();
  $('.nav, .navbar, .header, .footer, .sidebar, .menu, .cookie, .popup, .modal, .banner, .ad, .ads, .advertisement').remove();
  $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();
  const title = $('title').text().trim() || $('h1').first().text().trim() || '';
  const metaDescription = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
  let content = '';
  const mainSelectors = ['main', 'article', '[role="main"]', '.main-content', '.content', '.page-content', '#content', '#main'];
  for (const selector of mainSelectors) {
    const el = $(selector);
    if (el.length && el.text().trim().length > 100) {
      content = el.text().trim();
      break;
    }
  }
  if (!content || content.length < 100) content = $('body').text().trim();
  content = content.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n').trim().substring(0, MAX_CONTENT_LENGTH);
  const baseUrl = new URL(url);
  const links = [];
  $('a[href]').each((_, el) => {
    try {
      const href = $(el).attr('href');
      if (!href) return;
      const absoluteUrl = new URL(href, url).href;
      const linkUrl = new URL(absoluteUrl);
      if (linkUrl.hostname === baseUrl.hostname) {
        links.push(absoluteUrl.split('#')[0].split('?')[0]);
      }
    } catch {}
  });
  return { title, metaDescription, content, links: [...new Set(links)] };
}

function extractContactInfo(allContent) {
  const combined = allContent.join(' ');
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
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = combined.match(emailPattern) || [];
  const contactEmail = emails.find(e => /contact|info|hello|support|sales|general/i.test(e)) || emails[0] || null;
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

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    let path = u.pathname.replace(/\/+$/, '') || '/';
    return `${u.protocol}//${u.hostname}${path}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function scoreUrl(url) {
  const path = new URL(url).pathname.toLowerCase();
  if (path === '/' || path === '') return 100;
  for (const pattern of IMPORTANT_PATTERNS) {
    if (pattern.test(path)) return 80;
  }
  const depth = path.split('/').filter(Boolean).length;
  if (depth === 1) return 60;
  if (depth === 2) return 40;
  return 20;
}

function shouldIgnore(url) {
  const path = new URL(url).pathname;
  return IGNORE_PATTERNS.some(pattern => pattern.test(path));
}

export async function crawlWebsite(startUrl, onProgress) {
  const results = { pages: [], contactInfo: {}, allContent: [] };
  let baseUrl;
  try {
    baseUrl = new URL(startUrl.startsWith('http') ? startUrl : `https://${startUrl}`);
  } catch {
    throw new Error(`Invalid URL: ${startUrl}`);
  }
  const homepageUrl = `${baseUrl.protocol}//${baseUrl.hostname}`;
  const visited = new Set();
  const toVisit = [homepageUrl];
  if (onProgress) onProgress(`Crawling homepage: ${baseUrl.hostname}`);
  try {
    const html = await fetchPage(homepageUrl);
    const pageData = extractContent(html, homepageUrl);
    visited.add(normalizeUrl(homepageUrl));
    results.pages.push({ url: homepageUrl, title: pageData.title, content: pageData.content });
    results.allContent.push(pageData.content);
    for (const link of pageData.links) {
      const normalized = normalizeUrl(link);
      if (!visited.has(normalized) && !shouldIgnore(link)) {
        toVisit.push(link);
      }
    }
  } catch (err) {
    if (onProgress) onProgress(`Failed to crawl homepage: ${err.message}`);
  }
  const scoredUrls = toVisit
    .filter(url => !visited.has(normalizeUrl(url)))
    .map(url => ({ url, score: scoreUrl(url) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PAGES - 1);
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
    } catch {}
  }
  results.contactInfo = extractContactInfo(results.allContent);
  return results;
}
