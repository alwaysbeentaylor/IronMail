/**
 * Email Finder v4.0 - Multi-Query Search with Parallel Execution
 * 
 * Features:
 * - 3 search queries per lead (personal + hotel + domain)
 * - Stores ALL found emails
 * - Parallel execution with --id and --batch
 * 
 * Usage:
 *   node scripts/email-finder-v4.js --id=1 --batch=0-2000 --proxy="..."
 *   node scripts/email-finder-v4.js --limit=10 --proxy="..."  (test mode)
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

// Parse command line args
const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, val] = arg.replace('--', '').split('=');
    acc[key] = val || true;
    return acc;
}, {});

const INSTANCE_ID = args.id || '1';
const INPUT_PATH = path.join(__dirname, '..', 'data', 'parsed-leads.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', `email-results-${INSTANCE_ID}.json`);
const PROGRESS_PATH = path.join(__dirname, '..', 'data', `finder-progress-${INSTANCE_ID}.json`);
const PROFILE_DIR = path.join(__dirname, '..', `.chrome-finder-${INSTANCE_ID}`);

// Regex patterns
const EMAIL_REGEX = /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

// Phone patterns: +31, 0031, 06, landline, international
const PHONE_REGEX = /(?:\+31|0031|\+49|\+33|\+32|\+34|\+39)?[\s.-]?(?:\(0\)|0)?[\s.-]?[1-9][0-9]{1,2}[\s.-]?[0-9]{2,3}[\s.-]?[0-9]{2,4}/g;

// Address pattern (Dutch/European style: street + number)
const ADDRESS_REGEX = /([A-Z][a-z]+(?:straat|laan|weg|plein|gracht|kade|singel|dreef|hof|steeg|dijk|pad|ring|boulevard|avenue|street|road|lane)\s+\d+[a-zA-Z]?(?:[\s,]+\d{4}\s?[A-Z]{2})?)/gi;

// Domains to skip (not hotel emails)
const SKIP_DOMAINS = ['linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com',
    'gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com',
    'booking.com', 'tripadvisor.com', 'expedia.com'];

function extractEmails(text) {
    const matches = text.match(EMAIL_REGEX) || [];
    return [...new Set(matches)]
        .filter(email => !SKIP_DOMAINS.some(d => email.includes(d)))
        .slice(0, 10);
}

function extractPhones(text) {
    const matches = text.match(PHONE_REGEX) || [];
    // Clean and deduplicate
    return [...new Set(matches.map(p => p.replace(/[\s.-]/g, '')))]
        .filter(p => p.length >= 9 && p.length <= 15) // Valid phone length
        .slice(0, 5);
}

function extractAddresses(text) {
    const matches = text.match(ADDRESS_REGEX) || [];
    return [...new Set(matches)].slice(0, 3);
}

function categorizeEmails(emails, personName) {
    const nameParts = personName.toLowerCase().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];

    const personal = [];
    const hotel = [];

    for (const email of emails) {
        const local = email.split('@')[0].toLowerCase();

        // Check if email contains person's name
        if (local.includes(firstName) || local.includes(lastName)) {
            personal.push(email);
        }
        // Check if it's a generic hotel email
        else if (['info', 'hotel', 'contact', 'reservations', 'reservering',
            'booking', 'reception', 'front', 'office', 'sales', 'gm'].some(p => local.includes(p))) {
            hotel.push(email);
        }
    }

    return { personal, hotel };
}

async function searchGoogle(page, query) {
    try {
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`,
            { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));

        const result = await page.evaluate(() => {
            const text = document.body.innerText;

            // Get first result domain
            let domain = null;
            const links = document.querySelectorAll('div.g a[href^="http"]');
            for (const link of links) {
                const href = link.href;
                if (href.includes('linkedin.') || href.includes('facebook.') ||
                    href.includes('booking.com') || href.includes('tripadvisor.') ||
                    href.includes('google.') || href.includes('wikipedia.')) continue;
                try {
                    const url = new URL(href);
                    domain = url.hostname.replace('www.', '');
                    break;
                } catch { continue; }
            }

            return { text, domain };
        });

        // Extract phone and address from the search text
        result.phones = extractPhones(result.text);
        result.addresses = extractAddresses(result.text);

        return result;
    } catch (err) {
        console.log(`      ⚠️ Search error: ${err.message.substring(0, 50)}`);
        return { text: '', domain: null, phones: [], addresses: [] };
    }
}

async function findEmailsForLead(page, lead) {
    const results = {
        personalEmails: [],
        hotelEmails: [],
        allEmails: [],
        phones: [],
        addresses: [],
        domain: null
    };

    const personName = lead.name;
    const company = lead.company;
    // Extract city from location for more accurate search
    const locationParts = (lead.location || '').split(',');
    const city = locationParts[0]?.trim() || '';

    // Query 1: Personal email search (with location)
    const q1Query = city ? `"${personName}" "${company}" ${city} email` : `"${personName}" "${company}" email`;
    console.log(`      🔍 Query 1: ${q1Query.substring(0, 60)}...`);
    const q1 = await searchGoogle(page, q1Query);
    const emails1 = extractEmails(q1.text);
    results.allEmails.push(...emails1);
    results.phones.push(...(q1.phones || []));
    results.addresses.push(...(q1.addresses || []));

    await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));

    // Query 2: Hotel contact email (with location)
    const q2Query = city ? `"${company}" ${city} contact info email` : `"${company}" contact info email`;
    console.log(`      🔍 Query 2: ${q2Query.substring(0, 60)}...`);
    const q2 = await searchGoogle(page, q2Query);
    const emails2 = extractEmails(q2.text);
    results.allEmails.push(...emails2);
    results.phones.push(...(q2.phones || []));
    results.addresses.push(...(q2.addresses || []));
    results.domain = q2.domain || q1.domain;

    await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));

    // Query 3: Domain search (if no domain found yet)
    if (!results.domain) {
        const q3Query = city ? `"${company}" ${city} official website` : `"${company}" official website`;
        console.log(`      🔍 Query 3: ${q3Query.substring(0, 60)}...`);
        const q3 = await searchGoogle(page, q3Query);
        results.domain = q3.domain;
        const emails3 = extractEmails(q3.text);
        results.allEmails.push(...emails3);
    }

    // Deduplicate and categorize
    results.allEmails = [...new Set(results.allEmails)];
    results.phones = [...new Set(results.phones)];
    results.addresses = [...new Set(results.addresses)];
    const categorized = categorizeEmails(results.allEmails, personName);
    results.personalEmails = categorized.personal;
    results.hotelEmails = categorized.hotel;

    return results;
}

async function main() {
    console.log(`\n🚀 EMAIL FINDER v4.0 - Instance ${INSTANCE_ID}`);
    console.log('='.repeat(50) + '\n');

    // Load leads
    const allLeads = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
    console.log(`📥 Total leads in file: ${allLeads.length}`);

    // Filter leads that need processing (no chain email yet)
    let leads = allLeads.filter(l => !l.email && l.company);
    console.log(`🎯 Leads needing email search: ${leads.length}`);

    // Apply batch filter
    if (args.batch) {
        const [start, end] = args.batch.split('-').map(Number);
        leads = leads.slice(start, end);
        console.log(`📦 Batch ${args.batch}: Processing ${leads.length} leads`);
    }

    // Apply limit
    if (args.limit) {
        leads = leads.slice(0, parseInt(args.limit));
        console.log(`🧪 Test mode: First ${args.limit} leads only`);
    }

    // Load progress
    let progress = { completed: [], results: {} };
    if (fs.existsSync(PROGRESS_PATH)) {
        progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
        console.log(`📈 Resuming: ${progress.completed.length} already done`);
    }

    // Launch browser
    const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,720'];
    if (args.proxy) {
        const proxyHost = args.proxy.includes('@')
            ? args.proxy.split('@')[1]
            : args.proxy.replace('http://', '');
        launchArgs.push(`--proxy-server=http://${proxyHost}`);
        console.log(`🌐 Using proxy: ${proxyHost}`);
    }

    const browser = await puppeteer.launch({
        headless: args.headless === 'true',
        executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        userDataDir: PROFILE_DIR,
        args: launchArgs
    });

    const page = (await browser.pages())[0];

    // Proxy auth
    if (args.proxy && args.proxy.includes('@')) {
        const auth = args.proxy.split('//')[1].split('@')[0];
        const [username, password] = auth.split(':');
        await page.authenticate({ username, password });
    }

    console.log(`\n${'='.repeat(50)}\n`);

    let processed = 0;
    let found = 0;

    for (const lead of leads) {
        const key = `${lead.name}|${lead.company}`;

        // Skip if already done
        if (progress.completed.includes(key)) {
            continue;
        }

        processed++;
        console.log(`\n[${processed}/${leads.length}] ${lead.name}`);
        console.log(`   📍 ${lead.company}`);

        const results = await findEmailsForLead(page, lead);

        // Store results
        progress.results[key] = {
            name: lead.name,
            company: lead.company,
            headline: lead.headline,
            location: lead.location,
            priority: lead.priority,
            ...results,
            primaryEmail: results.personalEmails[0] || results.hotelEmails[0] || null,
            confidence: results.personalEmails.length > 0 ? 'HIGH' :
                results.hotelEmails.length > 0 ? 'MEDIUM' :
                    results.domain ? 'LOW' : 'NONE'
        };
        progress.completed.push(key);

        // Log results
        if (results.personalEmails.length > 0) {
            console.log(`   ✅ Personal: ${results.personalEmails.join(', ')}`);
            found++;
        }
        if (results.hotelEmails.length > 0) {
            console.log(`   📧 Hotel: ${results.hotelEmails.join(', ')}`);
            if (results.personalEmails.length === 0) found++;
        }
        if (results.domain) {
            console.log(`   🌐 Domain: ${results.domain}`);
        }
        if (results.phones.length > 0) {
            console.log(`   📞 Phone: ${results.phones.slice(0, 2).join(', ')}`);
        }
        if (results.addresses.length > 0) {
            console.log(`   🏠 Address: ${results.addresses[0]}`);
        }
        if (results.allEmails.length === 0 && !results.domain) {
            console.log(`   ⚠️ Nothing found`);
        }

        // Save progress every 5 leads
        if (processed % 5 === 0) {
            fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
            console.log(`\n💾 Progress saved (${processed}/${leads.length})`);
        }

        // Delay between leads
        await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
    }

    await browser.close();

    // Final save
    fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(Object.values(progress.results), null, 2));

    console.log(`\n${'='.repeat(50)}`);
    console.log(`\n✅ INSTANCE ${INSTANCE_ID} COMPLETE!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Found emails: ${found}`);
    console.log(`   Output: ${OUTPUT_PATH}`);
}

main().catch(console.error);
