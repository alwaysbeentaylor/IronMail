/**
 * LinkedIn Harvester V3 - Console Log Debug
 * Prints everything to console so we can see what's happening
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

async function harvest() {
    console.log('\n🚀 LinkedIn Harvester V3 - Debug Mode\n');

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
    console.log(`🔍 Navigating to search...\n`);

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 8000));

    console.log('📊 Extracting data...\n');

    const leads = await page.evaluate(() => {
        const results = [];

        // Find ALL links to profiles
        const profileLinks = Array.from(document.querySelectorAll('a[href*="/in/"]'));

        console.log(`Found ${profileLinks.length} profile links`);

        // Group by unique profile URL
        const uniqueProfiles = new Map();

        profileLinks.forEach(link => {
            const url = link.href.split('?')[0];
            if (!uniqueProfiles.has(url)) {
                uniqueProfiles.set(url, {
                    url,
                    name: link.textContent.trim(),
                    element: link
                });
            }
        });

        console.log(`Found ${uniqueProfiles.size} unique profiles`);

        // For each profile, try to extract data
        uniqueProfiles.forEach((profile, url) => {
            // Find parent container (li element)
            let container = profile.element.closest('li');

            if (!container) return;

            // Get ALL text from container
            const fullText = container.innerText;

            // Split into lines
            const lines = fullText.split('\n').map(l => l.trim()).filter(l => l);

            if (lines.length >= 2) {
                results.push({
                    name: profile.name,
                    headline: lines[1] || '',
                    location: lines[2] || '',
                    allLines: lines,
                    profileUrl: url
                });
            }
        });

        return results;
    });

    console.log(`\n✅ Extracted ${leads.length} leads\n`);

    // Print first 5
    leads.slice(0, 5).forEach((lead, i) => {
        console.log(`${i + 1}. ${lead.name}`);
        console.log(`   Headline: ${lead.headline}`);
        console.log(`   Location: ${lead.location}`);
        console.log(`   All lines: ${JSON.stringify(lead.allLines)}`);
        console.log('');
    });

    // Filter for hotels
    const hotelKeywords = ['hotel', 'resort', 'inn', 'hospitality', 'marriott', 'hilton', 'hyatt', 'accor'];
    const hotelLeads = leads.filter(lead => {
        const text = `${lead.headline} ${lead.location}`.toLowerCase();
        return hotelKeywords.some(kw => text.includes(kw));
    });

    console.log(`\n🏨 Found ${hotelLeads.length} hotel-related leads\n`);

    // Save
    const outputPath = path.join(__dirname, '..', 'data', 'linkedin-leads.json');

    const cleanLeads = hotelLeads.map(l => ({
        name: l.name,
        headline: l.headline,
        location: l.location,
        profileUrl: l.profileUrl,
        extractedAt: new Date().toISOString()
    }));

    let existing = [];
    if (fs.existsSync(outputPath)) {
        try {
            existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        } catch (e) { }
    }

    const merged = [...existing];
    cleanLeads.forEach(lead => {
        if (!merged.some(l => l.profileUrl === lead.profileUrl)) {
            merged.push(lead);
        }
    });

    fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2));

    console.log('='.repeat(60));
    console.log(`New leads: ${merged.length - existing.length}`);
    console.log(`Total in DB: ${merged.length}`);
    console.log(`Saved to: ${outputPath}`);
    console.log('='.repeat(60));

    await browser.close();
}

harvest().catch(console.error);
