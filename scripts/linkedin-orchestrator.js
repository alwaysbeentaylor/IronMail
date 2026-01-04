/**
 * LinkedIn Resumable Multi-Search Orchestrator
 * - Tracks progress in data/harvester-progress.json
 * - Supports multiple instances via --id=X
 * - Supports Proxy via --proxy="..."
 * - Optimized for 5k+ lead generation
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

// --- SEARCH CONFIGURATION ---
const SEARCH_QUERIES = [
    "general manager hotel",
    "hotel director",
    "hotel owner",
    "operations manager hotel",
    "hospitality manager",
    "hotel manager",
    "boutique hotel owner",
    "resort manager"
];

const CITIES = [
    "Amsterdam", "Rotterdam", "Brussels", "Antwerp", "Gent", "Brugge", "Paris", "Lyon", "Marseille",
    "Berlin", "Munich", "Hamburg", "Frankfurt", "London", "Manchester", "Birmingham", "Dublin",
    "Madrid", "Barcelona", "Valencia", "Seville", "Lisbon", "Porto", "Rome", "Milan", "Venice",
    "Florence", "Naples", "Vienna", "Zurich", "Geneva", "Copenhagen", "Stockholm", "Oslo",
    "Helsinki", "Prague", "Warsaw", "Budapest", "Bucharest", "Athens", "Luxembourg", "Strasbourg",
    "Utrecht", "Eindhoven", "Groningen", "Maastricht", "Knokke", "Namur", "Liege"
];

// --- ARGS PARSING ---
const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, val] = arg.replace('--', '').split('=');
    acc[key] = val || true;
    return acc;
}, {});

const INSTANCE_ID = args.id || "1";
const PROGRESS_PATH = path.join(__dirname, '..', 'data', 'harvester-progress.json');
const RAW_PATH = path.join(__dirname, '..', 'data', 'linkedin-raw.txt');
const PROFILE_DIR = path.join(__dirname, '..', `.chrome-scraper-profile-${INSTANCE_ID}`);

// Ensure data dir exists
if (!fs.existsSync(path.join(__dirname, '..', 'data'))) {
    fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
}

// Initialize or load progress
let progress = { completed: [] };
if (fs.existsSync(PROGRESS_PATH)) {
    try {
        progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    } catch (e) {
        console.log("Progress file corrupted, starting fresh.");
    }
}

function saveProgress(key) {
    if (!progress.completed.includes(key)) {
        progress.completed.push(key);
        fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
    }
}

async function logBlock(msg) {
    console.log('\n\n' + '!'.repeat(60));
    console.log('\x1b[41m\x1b[37m%s\x1b[0m', ` 🛑 !!! LINKEDIN BLOKKADE GEDETECTEERD (INSTANCE ${INSTANCE_ID}) !!! 🛑 `);
    console.log('\x1b[31m%s\x1b[0m', `REDEN: ${msg}`);
    console.log('!'.repeat(60) + '\n\n');
}

async function main() {
    console.log('\n' + '='.repeat(40));
    console.log(`🚀 Harvester Instance ${INSTANCE_ID} - OVERNIGHT MODE`);
    console.log(`🌍 Target: 50+ Europese steden`);
    console.log(`📂 Profile: .chrome-scraper-profile-${INSTANCE_ID}`);
    console.log(`📈 Reeds voltooid: ${progress.completed.length} pagina's`);
    console.log('='.repeat(40) + '\n');

    const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,720'];
    let proxyUrl = args.proxy;
    let proxyAuth = null;

    if (proxyUrl && typeof proxyUrl === 'string') {
        if (proxyUrl.includes('@')) {
            const parts = proxyUrl.split('//');
            const scheme = parts[0];
            const authAndHost = parts[1].split('@');
            proxyAuth = authAndHost[0];
            const host = authAndHost[1];
            launchArgs.push(`--proxy-server=${scheme}//${host}`);
            console.log(`🌐 Using Proxy: ${scheme}//${host}`);
        } else {
            launchArgs.push(`--proxy-server=${proxyUrl}`);
            console.log(`🌐 Using Proxy: ${proxyUrl}`);
        }
    }

    const browser = await puppeteer.launch({
        headless: args.headless === 'true' || args.headless === true,
        executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        userDataDir: PROFILE_DIR,
        args: launchArgs
    });

    const page = (await browser.pages())[0];

    if (proxyAuth) {
        const [username, password] = proxyAuth.split(':');
        await page.authenticate({ username, password });
        console.log(`🔑 Proxy Auth set for: ${username}`);
    }

    // Main loop
    for (const city of CITIES) {
        for (const query of SEARCH_QUERIES) {
            const searchTerm = `${query} ${city}`;

            for (let pageNum = 1; pageNum <= 10; pageNum++) {
                const progressKey = `${searchTerm}-p${pageNum}`;

                if (progress.completed.includes(progressKey)) continue;

                console.log(`🔍 [${INSTANCE_ID}] "${searchTerm}" | Page ${pageNum}`);
                const url = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchTerm)}&origin=GLOBAL_SEARCH_HEADER&page=${pageNum}`;

                try {
                    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
                    await new Promise(r => setTimeout(r, 4000));

                    const bodyText = await page.evaluate(() => document.body.innerText);

                    // Block detection
                    const isBlocked = bodyText.includes("beveiligingscontrole") ||
                        bodyText.includes("Security Check") ||
                        bodyText.includes("aanmelden") ||
                        bodyText.includes("Log in") ||
                        bodyText.includes("authwall");

                    if (isBlocked) {
                        await logBlock("LinkedIn block or login required.");
                        await browser.close();
                        process.exit(1);
                    }

                    if (bodyText.includes("geen resultaten") || bodyText.includes("No results found")) {
                        console.log(`   ⚠️ No more results.`);
                        saveProgress(progressKey);
                        break;
                    }

                    // Save raw data
                    const timestamp = new Date().toISOString();
                    const entry = `\n\n========== ${timestamp} | INSTANCE: ${INSTANCE_ID} | QUERY: ${searchTerm} | PAGE: ${pageNum} ==========\n\n${bodyText}`;
                    fs.appendFileSync(RAW_PATH, entry);

                    saveProgress(progressKey);
                    console.log(`   ✅ Saved. (${bodyText.length} chars)`);

                    // Human-like delay (7-15 seconds)
                    const delay = 7000 + Math.random() * 8000;
                    await new Promise(r => setTimeout(r, delay));

                } catch (err) {
                    console.error(`   ❌ Error on page ${pageNum}: ${err.message}`);
                    await new Promise(r => setTimeout(r, 15000));
                }
            }
        }
    }

    await browser.close();
    console.log(`\n✅ Mission Accomplished for Instance ${INSTANCE_ID}!`);
}

main().catch(err => {
    console.error("FATAL ERROR:", err);
    process.exit(1);
});
