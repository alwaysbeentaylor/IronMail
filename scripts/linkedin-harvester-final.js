/**
 * LinkedIn Harvester FINAL - Works with ANY LinkedIn layout
 * Uses simple text parsing instead of CSS selectors
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

const CONFIG = {
    outputPath: path.join(__dirname, '..', 'data', 'linkedin-leads.json'),
    minDelay: 8000,
    maxDelay: 15000,
};

function randomDelay(min = CONFIG.minDelay, max = CONFIG.maxDelay) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`⏳ Waiting ${(delay / 1000).toFixed(1)} seconds...`);
    return new Promise(resolve => setTimeout(resolve, delay));
}

async function harvest() {
    console.log('\n🚀 LinkedIn Harvester FINAL\n');
    console.log('Pages to scrape: 3\n');

    const scraperProfileDir = path.join(__dirname, '..', '.chrome-scraper-profile');

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        userDataDir: scraperProfileDir,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const searchUrl = 'https://www.linkedin.com/search/results/people/?keywords=general%20manager%20hotel&origin=GLOBAL_SEARCH_HEADER';
    console.log(`🔍 Navigating...\n`);

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await randomDelay(5000, 8000);

    let allLeads = [];
    let currentPage = 1;
    const maxPages = 3;

    while (currentPage <= maxPages) {
        console.log(`📄 Page ${currentPage}/${maxPages}...`);

        // Get the ENTIRE page text
        const pageText = await page.evaluate(() => document.body.innerText);

        // Also get all profile URLs
        const profileUrls = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href*="/in/"]'))
                .map(a => a.href.split('?')[0])
                .filter((url, index, self) => self.indexOf(url) === index);
        });

        console.log(`   Found ${profileUrls.length} profile URLs`);

        // Parse the text
        const lines = pageText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Find patterns: Name (2-4 words, capitalized) followed by job title
        for (let i = 0; i < lines.length - 2; i++) {
            const line = lines[i];

            // Skip UI elements
            if (line.includes('Connectie maken') ||
                line.includes('Bericht') ||
                line.includes('gemeenschappelijke') ||
                line.includes('Volgende') ||
                line.includes('Vorige') ||
                line.length < 5 ||
                line.length > 60) {
                continue;
            }

            // Check if looks like a name
            const words = line.split(' ');
            const isName = words.length >= 2 &&
                words.length <= 5 &&
                words.every(w => w[0] && w[0] === w[0].toUpperCase());

            if (isName) {
                const name = line;
                const headline = lines[i + 1] || '';
                const location = lines[i + 2] || '';

                // Check if headline contains job-related keywords
                const jobWords = ['manager', 'director', 'owner', 'ceo', 'gm', 'general', 'hotel', 'resort', 'hospitality'];
                const hasJobWord = jobWords.some(kw => headline.toLowerCase().includes(kw));

                if (hasJobWord && headline !== name && headline.length > 5) {
                    // Try to find matching profile URL
                    const matchingUrl = profileUrls.find(url =>
                        url.toLowerCase().includes(name.toLowerCase().replace(/\s+/g, '-').substring(0, 20))
                    );

                    allLeads.push({
                        name,
                        headline,
                        location: location.includes(',') || location.includes('België') || location.includes('Nederland') ? location : null,
                        profileUrl: matchingUrl || null,
                        extractedAt: new Date().toISOString()
                    });
                }
            }
        }

        console.log(`   Extracted ${allLeads.length} total leads so far`);

        // Try to go to next page
        if (currentPage < maxPages) {
            const hasNext = await page.evaluate(() => {
                const nextBtn = document.querySelector('button[aria-label="Volgende"], button[aria-label="Next"]');
                return nextBtn && !nextBtn.disabled;
            });

            if (!hasNext) {
                console.log('\n⚠️ No more pages\n');
                break;
            }

            await page.evaluate(() => {
                const nextBtn = document.querySelector('button[aria-label="Volgende"], button[aria-label="Next"]');
                if (nextBtn) nextBtn.click();
            });

            await randomDelay();
            currentPage++;
        } else {
            break;
        }
    }

    await browser.close();

    // Filter for hotels
    const hotelKeywords = ['hotel', 'resort', 'inn', 'suites', 'hospitality', 'marriott', 'hilton', 'hyatt', 'accor', 'ihg', 'radisson'];
    const hotelLeads = allLeads.filter(lead => {
        const text = `${lead.headline} ${lead.location || ''}`.toLowerCase();
        return hotelKeywords.some(kw => text.includes(kw));
    });

    // Remove duplicates
    const unique = hotelLeads.filter((lead, index, self) =>
        index === self.findIndex(l => l.name === lead.name)
    );

    // Save
    let existing = [];
    if (fs.existsSync(CONFIG.outputPath)) {
        try {
            existing = JSON.parse(fs.readFileSync(CONFIG.outputPath, 'utf8'));
        } catch (e) { }
    }

    const merged = [...existing];
    unique.forEach(lead => {
        if (!merged.some(l => l.name === lead.name)) {
            merged.push(lead);
        }
    });

    fs.writeFileSync(CONFIG.outputPath, JSON.stringify(merged, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('📊 KLAAR!');
    console.log('='.repeat(60));
    console.log(`Total found: ${allLeads.length}`);
    console.log(`Hotel GMs: ${unique.length}`);
    console.log(`New leads: ${merged.length - existing.length}`);
    console.log(`Total in DB: ${merged.length}`);
    console.log(`\nSaved to: ${CONFIG.outputPath}`);
    console.log('='.repeat(60) + '\n');

    if (unique.length > 0) {
        console.log('📋 Sample:\n');
        unique.slice(0, 10).forEach((lead, i) => {
            console.log(`${i + 1}. ${lead.name}`);
            console.log(`   ${lead.headline}`);
            console.log(`   📍 ${lead.location || 'N/A'}\n`);
        });
    }
}

harvest().catch(console.error);
