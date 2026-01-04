/**
 * LinkedIn Debug Script
 * Helps find the correct CSS selectors
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

async function debug() {
    console.log('\n🔍 LinkedIn Debug Mode\n');

    const scraperProfileDir = path.join(__dirname, '..', '.chrome-scraper-profile');

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        userDataDir: scraperProfileDir,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080'
        ]
    });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });

    const searchUrl = 'https://www.linkedin.com/search/results/people/?keywords=general%20manager%20hotel&origin=GLOBAL_SEARCH_HEADER';
    console.log(`Navigating to: ${searchUrl}\n`);

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('📸 Taking screenshot...\n');
    await page.screenshot({ path: 'linkedin-debug.png', fullPage: true });

    console.log('🔍 Analyzing page structure...\n');

    const analysis = await page.evaluate(() => {
        const results = {
            possibleContainers: [],
            possibleNames: [],
            possibleHeadlines: [],
            allClasses: new Set()
        };

        // Find all elements with class names
        document.querySelectorAll('[class]').forEach(el => {
            el.classList.forEach(cls => results.allClasses.add(cls));
        });

        // Look for result-like containers
        ['result', 'card', 'item', 'entity', 'search'].forEach(keyword => {
            document.querySelectorAll(`[class*="${keyword}"]`).forEach(el => {
                if (el.textContent.trim().length > 20 && el.textContent.trim().length < 500) {
                    results.possibleContainers.push({
                        selector: el.className,
                        sample: el.textContent.substring(0, 100)
                    });
                }
            });
        });

        // Look for name-like elements
        document.querySelectorAll('a[href*="/in/"]').forEach(el => {
            const text = el.textContent.trim();
            if (text.length > 2 && text.length < 50 && !text.includes('\n')) {
                results.possibleNames.push({
                    text,
                    href: el.href,
                    classes: el.className
                });
            }
        });

        return {
            ...results,
            allClasses: Array.from(results.allClasses).filter(c =>
                c.includes('result') || c.includes('entity') || c.includes('search')
            )
        };
    });

    console.log('📊 Analysis Results:\n');
    console.log('Possible result containers:');
    analysis.possibleContainers.slice(0, 3).forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.selector}`);
        console.log(`     Sample: ${c.sample}...\n`);
    });

    console.log('\nPossible name elements:');
    analysis.possibleNames.slice(0, 5).forEach((n, i) => {
        console.log(`  ${i + 1}. "${n.text}"`);
        console.log(`     Classes: ${n.classes}`);
        console.log(`     URL: ${n.href}\n`);
    });

    console.log('\nRelevant classes found:');
    analysis.allClasses.slice(0, 20).forEach(c => console.log(`  - ${c}`));

    console.log('\n✅ Debug complete!');
    console.log('Screenshot saved to: linkedin-debug.png');
    console.log('\nPress Ctrl+C to close browser');

    await new Promise(() => { });
}

debug().catch(console.error);
