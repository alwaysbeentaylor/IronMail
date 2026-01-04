/**
 * LinkedIn URL-based Harvester
 * Uses URL pagination instead of clicking Next button
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

function randomDelay(min = 8000, max = 15000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`⏳ ${(delay / 1000).toFixed(1)}s...`);
    return new Promise(resolve => setTimeout(resolve, delay));
}

async function harvest() {
    console.log('\n📋 LinkedIn URL-based Harvester\n');

    const totalPages = parseInt(process.argv[2]) || 10;
    console.log(`Pages to scrape: ${totalPages}\n`);

    const scraperProfileDir = path.join(__dirname, '..', '.chrome-scraper-profile');

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        userDataDir: scraperProfileDir,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    const browserPages = await browser.pages();
    const page = browserPages[0] || await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    let allText = '';

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        // LinkedIn uses &page=X for pagination
        const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=general%20manager%20hotel&origin=GLOBAL_SEARCH_HEADER&page=${pageNum}`;

        console.log(`📄 Page ${pageNum}/${totalPages}...`);
        console.log(`   URL: ...&page=${pageNum}`);

        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for content to load
        await new Promise(r => setTimeout(r, 3000));

        // Get ALL text from page
        const pageText = await page.evaluate(() => document.body.innerText);

        allText += `\n\n========== PAGE ${pageNum} ==========\n\n`;
        allText += pageText;

        console.log(`   Captured ${pageText.length} characters`);

        // Random delay between pages
        if (pageNum < totalPages) {
            await randomDelay(5000, 10000);
        }
    }

    await browser.close();

    // Save raw text
    const outputPath = path.join(__dirname, '..', 'data', 'linkedin-raw.txt');
    fs.writeFileSync(outputPath, allText);

    console.log('\n' + '='.repeat(60));
    console.log('✅ DONE!');
    console.log('='.repeat(60));
    console.log(`Total characters: ${allText.length}`);
    console.log(`Pages scraped: ${totalPages}`);
    console.log(`\nSaved to: ${outputPath}`);
    console.log('='.repeat(60) + '\n');
}

harvest().catch(console.error);
