/**
 * LinkedIn Hotel GM Harvester V2
 * Uses your existing Chrome profile (no cookies needed!)
 * 
 * BELANGRIJK: Sluit ALLE Chrome vensters voordat je dit runt!
 * 
 * Usage: node scripts/linkedin-harvester-v2.js --search="general manager hotel" --pages=10
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
    pageLoadDelay: 5000,
};

function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        search: 'general manager hotel',
        pages: 10,
        city: '',
    };

    args.forEach(arg => {
        if (arg.startsWith('--search=')) {
            config.search = arg.split('=')[1].replace(/"/g, '');
        } else if (arg.startsWith('--pages=')) {
            config.pages = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--city=')) {
            config.city = arg.split('=')[1].replace(/"/g, '');
        }
    });

    if (config.city) {
        config.search = `${config.search} ${config.city}`;
    }

    return config;
}

function randomDelay(min = CONFIG.minDelay, max = CONFIG.maxDelay) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`⏳ Waiting ${(delay / 1000).toFixed(1)} seconds...`);
    return new Promise(resolve => setTimeout(resolve, delay));
}

async function extractLeadsFromPage(page) {
    return await page.evaluate(() => {
        const leads = [];

        // LinkedIn now uses dynamic class names, so we search by href pattern
        const profileLinks = document.querySelectorAll('a[href*="/in/"]');

        const processedUrls = new Set();

        profileLinks.forEach(link => {
            const profileUrl = link.href.split('?')[0];

            // Skip if we already processed this profile
            if (processedUrls.has(profileUrl)) return;
            processedUrls.add(profileUrl);

            // Get name from link text
            const name = link.textContent.trim();

            // Skip if name is too short or too long (likely not a name)
            if (!name || name.length < 3 || name.length > 100) return;

            // Find the parent container (usually a few levels up)
            let container = link.closest('li') || link.closest('[class*="result"]') || link.parentElement?.parentElement?.parentElement;

            if (!container) return;

            // Try to find headline and location within the container
            let headline = null;
            let location = null;
            let currentCompany = null;

            // Look for text that looks like a job title (usually after the name)
            const allText = container.textContent;
            const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            // Name is usually first, headline second, location third
            const nameIndex = lines.findIndex(l => l.includes(name));
            if (nameIndex >= 0 && nameIndex < lines.length - 1) {
                headline = lines[nameIndex + 1];
                if (nameIndex < lines.length - 2) {
                    location = lines[nameIndex + 2];
                }
            }

            // Look for "Huidig:" or "Current:" pattern
            const currentMatch = allText.match(/(?:Huidig|Current):\s*(.+?)(?:\s+bij\s+|\s+at\s+)(.+?)(?:\n|$)/i);
            if (currentMatch) {
                currentCompany = currentMatch[2].trim();
            }

            // Only add if we have at least a name and headline
            if (name && headline && headline !== name) {
                leads.push({
                    name,
                    headline,
                    location: location || null,
                    currentCompany,
                    profileUrl,
                    extractedAt: new Date().toISOString()
                });
            }
        });

        return leads;
    });
}

function filterHotelLeads(leads) {
    const hotelKeywords = [
        'hotel', 'resort', 'inn', 'suites', 'lodge', 'palace', 'plaza',
        'marriott', 'hilton', 'hyatt', 'accor', 'ihg', 'radisson', 'sheraton',
        'novotel', 'ibis', 'mercure', 'sofitel', 'kempinski', 'ritz', 'four seasons',
        'waldorf', 'intercontinental', 'crowne plaza', 'holiday inn', 'hampton',
        'hospitality', 'boutique hotel', 'luxury hotel'
    ];

    const excludeKeywords = [
        'logistics', 'software', 'tech', 'medical', 'healthcare', 'bank',
        'insurance', 'consulting', 'retail', 'manufacturing', 'automotive'
    ];

    return leads.filter(lead => {
        const text = `${lead.headline} ${lead.currentCompany || ''}`.toLowerCase();
        const isHotel = hotelKeywords.some(keyword => text.includes(keyword));
        const isExcluded = excludeKeywords.some(keyword => text.includes(keyword));
        return isHotel && !isExcluded;
    });
}

async function harvest(config) {
    console.log('\n🚀 LinkedIn Hotel GM Harvester V2\n');
    console.log(`Search: "${config.search}"`);
    console.log(`Pages: ${config.pages}\n`);

    console.log('⚠️  BELANGRIJK: Sluit ALLE Chrome vensters nu!\n');
    console.log('Druk op ENTER als je klaar bent...');

    // Wait for user to press enter
    await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
    });

    console.log('\n🌐 Launching Chrome with LinkedIn scraper profile...\n');

    // Use a separate profile for scraping (won't conflict with your main Chrome)
    const scraperProfileDir = path.join(__dirname, '..', '.chrome-scraper-profile');

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        userDataDir: scraperProfileDir,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080'
        ]
    });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });

    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(config.search)}&origin=GLOBAL_SEARCH_HEADER`;
    console.log(`🔍 Navigating to: ${searchUrl}\n`);

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await randomDelay(CONFIG.pageLoadDelay, CONFIG.pageLoadDelay + 3000);

    // Check login - if we see search results, we're logged in
    const isLoggedIn = await page.evaluate(() => {
        // Check for search result cards (means we're logged in and on results page)
        const hasResults = document.querySelectorAll('.reusable-search__result-container').length > 0;

        // Check for login form (means we're NOT logged in)
        const hasLoginForm = document.querySelector('input[name="session_key"]') !== null ||
            document.querySelector('.login-form') !== null;

        return hasResults || !hasLoginForm;
    });

    if (!isLoggedIn) {
        console.log('❌ Niet ingelogd!');
        console.log('\n📝 Stappen:');
        console.log('1. Log in op LinkedIn in het Chrome venster dat nu open is');
        console.log('2. Sluit dit script (Ctrl+C)');
        console.log('3. Run het opnieuw\n');

        // Keep browser open
        await new Promise(() => { });
    }

    console.log('✅ Ingelogd!\n');

    let allLeads = [];
    let currentPage = 1;

    while (currentPage <= config.pages) {
        console.log(`📄 Page ${currentPage}/${config.pages}...`);

        const leadsFromPage = await extractLeadsFromPage(page);
        console.log(`   Found ${leadsFromPage.length} people`);

        allLeads = [...allLeads, ...leadsFromPage];

        if (currentPage < config.pages) {
            const hasNextPage = await page.evaluate(() => {
                const nextButton = document.querySelector('button[aria-label="Volgende"], button[aria-label="Next"]');
                return nextButton && !nextButton.disabled;
            });

            if (!hasNextPage) {
                console.log('\n⚠️ No more pages\n');
                break;
            }

            await page.evaluate(() => {
                const nextButton = document.querySelector('button[aria-label="Volgende"], button[aria-label="Next"]');
                if (nextButton) nextButton.click();
            });

            await randomDelay();
            currentPage++;
        } else {
            break;
        }
    }

    await browser.close();

    console.log('\n🏨 Filtering hotels...');
    const hotelLeads = filterHotelLeads(allLeads);

    const uniqueLeads = hotelLeads.filter((lead, index, self) =>
        index === self.findIndex(l => l.profileUrl === lead.profileUrl)
    );

    console.log('💾 Saving...');

    let existingLeads = [];
    if (fs.existsSync(CONFIG.outputPath)) {
        try {
            existingLeads = JSON.parse(fs.readFileSync(CONFIG.outputPath, 'utf8'));
        } catch (e) {
            existingLeads = [];
        }
    }

    const mergedLeads = [...existingLeads];
    uniqueLeads.forEach(lead => {
        if (!mergedLeads.some(l => l.profileUrl === lead.profileUrl)) {
            mergedLeads.push(lead);
        }
    });

    fs.writeFileSync(CONFIG.outputPath, JSON.stringify(mergedLeads, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('📊 KLAAR!');
    console.log('='.repeat(60));
    console.log(`Total found: ${allLeads.length}`);
    console.log(`Hotel GMs: ${uniqueLeads.length}`);
    console.log(`New leads: ${mergedLeads.length - existingLeads.length}`);
    console.log(`Total in DB: ${mergedLeads.length}`);
    console.log(`\nSaved to: ${CONFIG.outputPath}`);
    console.log('='.repeat(60) + '\n');

    if (uniqueLeads.length > 0) {
        console.log('📋 Sample:\n');
        uniqueLeads.slice(0, 5).forEach((lead, i) => {
            console.log(`${i + 1}. ${lead.name}`);
            console.log(`   ${lead.headline}`);
            console.log(`   📍 ${lead.location}`);
            console.log(`   🏨 ${lead.currentCompany || 'N/A'}\n`);
        });
    }
}

const config = parseArgs();
harvest(config).catch(console.error);
