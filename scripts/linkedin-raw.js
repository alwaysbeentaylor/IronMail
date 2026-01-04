/**
 * LinkedIn Raw Text Harvester
 * Just dumps ALL text from LinkedIn search pages
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
    console.log('\n📋 LinkedIn Raw Text Harvester\n');

    const pages = parseInt(process.argv[2]) || 5;
    console.log(`Pages: ${pages}\n`);

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

    const searchUrl = 'https://www.linkedin.com/search/results/people/?keywords=general%20manager%20hotel&origin=GLOBAL_SEARCH_HEADER';
    console.log(`🔍 Navigating...\n`);

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await randomDelay(5000, 8000);

    let allText = '';
    let currentPage = 1;

    while (currentPage <= pages) {
        console.log(`📄 Page ${currentPage}/${pages}...`);

        // SCROLL DOWN using mouse wheel (safer than clicking)
        console.log('   Scrolling...');
        for (let i = 0; i < 15; i++) {
            await page.mouse.wheel({ deltaY: 500 });
            await new Promise(r => setTimeout(r, 400));
        }
        await new Promise(r => setTimeout(r, 2000));

        // Get ALL text from page
        const pageText = await page.evaluate(() => document.body.innerText);

        allText += `\n\n========== PAGE ${currentPage} ==========\n\n`;
        allText += pageText;

        console.log(`   Captured ${pageText.length} characters`);

        // Next page
        if (currentPage < pages) {
            // Scroll to bottom first
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 1000));

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

    // Save raw text
    const outputPath = path.join(__dirname, '..', 'data', 'linkedin-raw.txt');
    fs.writeFileSync(outputPath, allText);

    console.log('\n' + '='.repeat(60));
    console.log('✅ DONE!');
    console.log('='.repeat(60));
    console.log(`Total characters: ${allText.length}`);
    console.log(`Pages scraped: ${currentPage}`);
    console.log(`\nSaved to: ${outputPath}`);
    console.log('='.repeat(60) + '\n');

    console.log('💡 TIP: Open the file and use Ctrl+F to search for names/companies\n');
}

harvest().catch(console.error);
