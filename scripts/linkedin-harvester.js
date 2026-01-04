/**
 * LinkedIn Hotel GM Harvester
 * 
 * Usage: node scripts/linkedin-harvester.js --search="general manager hotel" --pages=10
 * 
 * Output: data/linkedin-leads.json
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Configuration
const CONFIG = {
    cookiesPath: path.join(__dirname, '..', 'linkedin-cookies.json'),
    outputPath: path.join(__dirname, '..', 'data', 'linkedin-leads.json'),
    minDelay: 8000,  // Minimum delay between actions (8 seconds)
    maxDelay: 15000, // Maximum delay between actions (15 seconds)
    pageLoadDelay: 5000, // Wait for page to load
};

// Parse command line arguments
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

// Random delay to mimic human behavior
function randomDelay(min = CONFIG.minDelay, max = CONFIG.maxDelay) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`⏳ Waiting ${(delay / 1000).toFixed(1)} seconds...`);
    return new Promise(resolve => setTimeout(resolve, delay));
}

// Load cookies from file
function loadCookies() {
    try {
        const cookiesJson = fs.readFileSync(CONFIG.cookiesPath, 'utf8');
        return JSON.parse(cookiesJson);
    } catch (error) {
        console.error('❌ Error loading cookies:', error.message);
        console.log('Make sure linkedin-cookies.json exists in the project root.');
        process.exit(1);
    }
}

// Extract leads from search results page
async function extractLeadsFromPage(page) {
    return await page.evaluate(() => {
        const leads = [];

        // Find all search result cards
        const resultCards = document.querySelectorAll('.reusable-search__result-container');

        resultCards.forEach(card => {
            try {
                // Get name
                const nameElement = card.querySelector('.entity-result__title-text a span[aria-hidden="true"]');
                const name = nameElement ? nameElement.textContent.trim() : null;

                // Get profile URL
                const profileLink = card.querySelector('.entity-result__title-text a');
                const profileUrl = profileLink ? profileLink.href.split('?')[0] : null;

                // Get headline (job title)
                const headlineElement = card.querySelector('.entity-result__primary-subtitle');
                const headline = headlineElement ? headlineElement.textContent.trim() : null;

                // Get location
                const locationElement = card.querySelector('.entity-result__secondary-subtitle');
                const location = locationElement ? locationElement.textContent.trim() : null;

                // Get current company from "Huidig:" or "Current:"
                const currentElement = card.querySelector('.entity-result__summary');
                let currentCompany = null;
                if (currentElement) {
                    const text = currentElement.textContent;
                    const match = text.match(/(?:Huidig|Current):\s*(.+?)(?:\s+bij\s+|\s+at\s+)(.+)/i);
                    if (match) {
                        currentCompany = match[2].trim();
                    }
                }

                // Only add if we have valid data
                if (name && headline) {
                    leads.push({
                        name,
                        headline,
                        location,
                        currentCompany,
                        profileUrl,
                        extractedAt: new Date().toISOString()
                    });
                }
            } catch (e) {
                // Skip this card if extraction fails
            }
        });

        return leads;
    });
}

// Filter to only include hotel-related leads
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

        // Check if it contains hotel keywords
        const isHotel = hotelKeywords.some(keyword => text.includes(keyword));

        // Check if it contains exclude keywords
        const isExcluded = excludeKeywords.some(keyword => text.includes(keyword));

        return isHotel && !isExcluded;
    });
}

// Main harvester function
async function harvest(config) {
    console.log('\n🚀 LinkedIn Hotel GM Harvester Starting...\n');
    console.log(`Search: "${config.search}"`);
    console.log(`Pages to scrape: ${config.pages}`);
    console.log('');

    const browser = await puppeteer.launch({
        headless: false, // Set to true for background running
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080'
        ]
    });

    const page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Load cookies
    console.log('🍪 Loading cookies...');
    const cookies = loadCookies();
    await page.setCookie(...cookies);

    // Navigate to LinkedIn search
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(config.search)}&origin=GLOBAL_SEARCH_HEADER`;
    console.log(`\n🔍 Navigating to search: ${searchUrl}\n`);

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await randomDelay(CONFIG.pageLoadDelay, CONFIG.pageLoadDelay + 3000);

    // Check if we're logged in
    const isLoggedIn = await page.evaluate(() => {
        return document.querySelector('.global-nav__me') !== null ||
            document.querySelector('.feed-identity-module') !== null ||
            document.querySelector('.search-results-container') !== null;
    });

    if (!isLoggedIn) {
        console.log('❌ Not logged in! Cookies may have expired.');
        console.log('Please export fresh cookies from your LinkedIn session.');
        await browser.close();
        process.exit(1);
    }

    console.log('✅ Successfully logged in!\n');

    let allLeads = [];
    let currentPage = 1;

    while (currentPage <= config.pages) {
        console.log(`\n📄 Scraping page ${currentPage}/${config.pages}...`);

        // Extract leads from current page
        const leadsFromPage = await extractLeadsFromPage(page);
        console.log(`   Found ${leadsFromPage.length} people on this page`);

        allLeads = [...allLeads, ...leadsFromPage];

        // Check if there's a next page
        if (currentPage < config.pages) {
            const hasNextPage = await page.evaluate(() => {
                const nextButton = document.querySelector('button[aria-label="Volgende"], button[aria-label="Next"]');
                return nextButton && !nextButton.disabled;
            });

            if (!hasNextPage) {
                console.log('\n⚠️ No more pages available.');
                break;
            }

            // Click next page
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

    // Filter for hotel leads only
    console.log('\n🏨 Filtering for hotel-related leads...');
    const hotelLeads = filterHotelLeads(allLeads);

    // Remove duplicates based on profile URL
    const uniqueLeads = hotelLeads.filter((lead, index, self) =>
        index === self.findIndex(l => l.profileUrl === lead.profileUrl)
    );

    // Save results
    console.log('\n💾 Saving results...');

    // Load existing leads if any
    let existingLeads = [];
    if (fs.existsSync(CONFIG.outputPath)) {
        try {
            existingLeads = JSON.parse(fs.readFileSync(CONFIG.outputPath, 'utf8'));
        } catch (e) {
            existingLeads = [];
        }
    }

    // Merge with existing, avoiding duplicates
    const mergedLeads = [...existingLeads];
    uniqueLeads.forEach(lead => {
        if (!mergedLeads.some(l => l.profileUrl === lead.profileUrl)) {
            mergedLeads.push(lead);
        }
    });

    fs.writeFileSync(CONFIG.outputPath, JSON.stringify(mergedLeads, null, 2));

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 HARVEST COMPLETE!');
    console.log('='.repeat(60));
    console.log(`Total people found: ${allLeads.length}`);
    console.log(`Hotel GMs filtered: ${uniqueLeads.length}`);
    console.log(`New leads added: ${mergedLeads.length - existingLeads.length}`);
    console.log(`Total leads in database: ${mergedLeads.length}`);
    console.log(`\nOutput saved to: ${CONFIG.outputPath}`);
    console.log('='.repeat(60) + '\n');

    // Print sample of new leads
    if (uniqueLeads.length > 0) {
        console.log('📋 Sample of new leads:\n');
        uniqueLeads.slice(0, 5).forEach((lead, i) => {
            console.log(`${i + 1}. ${lead.name}`);
            console.log(`   ${lead.headline}`);
            console.log(`   📍 ${lead.location}`);
            console.log(`   🏨 ${lead.currentCompany || 'N/A'}`);
            console.log('');
        });
    }
}

// Run the harvester
const config = parseArgs();
harvest(config).catch(console.error);
