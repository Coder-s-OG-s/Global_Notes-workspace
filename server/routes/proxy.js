const express = require('express');
const router = express.Router();
const cheerio = require('cheerio');

let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  puppeteer = null;
}

// Helper to detect forbidden internal/loopback/metadata URLs (SSRF Protection)
function isForbiddenUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    const host = parsed.hostname.toLowerCase();
    
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;
    
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      !host.includes('.') || // Prevent single-label internal hosts like 'file', 'admin', 'internal'
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.startsWith('169.254.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      (host.startsWith('172.') && parseInt(host.split('.')[1], 10) >= 16 && parseInt(host.split('.')[1], 10) <= 31)
    ) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

// Route to fetch external URL, rewrite relative links, tag DOM elements with data-element-id, and inject inspector bridge
router.post('/fetch-url', async (req, res) => {
  try {
    let { url, rawHtml, usePuppeteer = true } = req.body;
    let htmlContent = '';
    let targetOrigin = '';

    if (rawHtml) {
      htmlContent = rawHtml;
    } else if (url) {
      // Validate non-HTTP/HTTPS schemes directly on raw input
      if (url.includes('://') && !url.startsWith('http://') && !url.startsWith('https://')) {
        return res.status(400).json({ error: 'Access to non-HTTP/HTTPS protocols is forbidden.' });
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      if (isForbiddenUrl(url)) {
        return res.status(400).json({ error: 'Access to internal or restricted network URLs is forbidden.' });
      }

      const parsedUrl = new URL(url);
      targetOrigin = parsedUrl.origin;

      let fetchedViaPuppeteer = false;

      // Lazy require puppeteer if not loaded initially
      if (!puppeteer) {
        try { puppeteer = require('puppeteer'); } catch (e) {}
      }

      if (usePuppeteer && puppeteer) {
        try {
          console.log(`[Proxy] Rendering URL with Headless Chrome (Puppeteer): ${url}`);
          const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
          });
          const page = await browser.newPage();
          await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          await page.setViewport({ width: 1440, height: 900 });

          // Navigate and wait for SPA hydration
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
          await new Promise(r => setTimeout(r, 1500));

          htmlContent = await page.content();
          await browser.close();
          fetchedViaPuppeteer = true;
          console.log(`[Proxy] Successfully rendered ${url} via Puppeteer (${htmlContent.length} bytes).`);
        } catch (puppeteerErr) {
          console.warn('[Proxy] Puppeteer render failed, falling back to standard fetch:', puppeteerErr.message);
        }
      }

      if (!fetchedViaPuppeteer) {
        console.log(`[Proxy] Fetching URL via standard fetch: ${url}`);
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
          }
        });

        if (!response.ok) {
          return res.status(response.status).json({
            error: `Failed to fetch URL (${response.status}: ${response.statusText})`
          });
        }

        htmlContent = await response.text();
      }
    } else {
      return res.status(400).json({ error: 'Please provide either a URL or rawHtml content.' });
    }

    // Parse HTML with cheerio
    const $ = cheerio.load(htmlContent);

    // 1. Ensure Head & Tailwind script injection
    if (!$('head').length) {
      $.root().prepend('<head></head>');
    }

    if (!$('head script[src*="tailwindcss"]').length) {
      $('head').append('<script src="https://cdn.tailwindcss.com"></script>');
    }

    if (targetOrigin) {
      if (!$('head base').length) {
        $('head').prepend(`<base href="${targetOrigin}/">`);
      }

      $('img, source').each((_, el) => {
        const src = $(el).attr('src');
        if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
          try {
            $(el).attr('src', new URL(src, targetOrigin).href);
          } catch (e) {}
        }
      });

      $('link[rel="stylesheet"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.startsWith('http://') && !href.startsWith('https://')) {
          try {
            $(el).attr('href', new URL(href, targetOrigin).href);
          } catch (e) {}
        }
      });
    }

    // 2. Tag body elements with recursive data-element-id
    let elementCounter = 1;
    $('body *').each((_, el) => {
      const tagName = el.tagName ? el.tagName.toLowerCase() : '';
      if (tagName && tagName !== 'script' && tagName !== 'style' && tagName !== 'svg' && tagName !== 'path') {
        $(el).attr('data-element-id', `node-${elementCounter++}`);
      }
    });

    // 3. Inject Inspector Bridge Script before closing body tag
    const inspectorBridgeScript = `<script src="/JS/inspector-bridge.js"></script>`;
    if ($('body').length) {
      $('body').append(inspectorBridgeScript);
    } else {
      $.root().append(inspectorBridgeScript);
    }

    return res.json({
      success: true,
      html: $.html(),
      elementCount: elementCounter - 1,
      targetUrl: url || 'Raw HTML'
    });

  } catch (err) {
    console.error('Error proxying URL fetch:', err);
    return res.status(500).json({
      error: `Proxy error: ${err.message}`
    });
  }
});

module.exports = router;
