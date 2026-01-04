/**
 * Email Finder v3.0 - Step 3: Smart Domain & Email Discovery
 * IMPROVED: Extracts emails directly from search snippets
 * Uses DuckDuckGo (primary) and Google (fallback)
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

const INPUT_PATH = path.join(__dirname, '..', 'data', 'parsed-leads.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'leads-with-domains.json');
const PROGRESS_PATH = path.join(__dirname, '..', 'data', 'domain-progress.json');

// Parse command line args
const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, val] = arg.replace('--', '').split('=');
    acc[key] = val || true;
    return acc;
}, {});

// Email patterns to look for in search results
const EMAIL_REGEX = /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

async function findDomainAndEmail(page, companyName, useGoogle = false) {
    // Search query optimized for finding contact info
    const query = `"${companyName}" contact email`;
    const searchEngine = useGoogle
        ? `https://www.google.com/search?q=${encodeURIComponent(query)}`
        : `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;

    try {
        await page.goto(searchEngine, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));

        // Extract page text and look for emails + domains
        const result = await page.evaluate((isGoogle) => {
            const pageText = document.body.innerText;

            // Find all emails in the page
            const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
            const foundEmails = pageText.match(emailRegex) || [];

            // Filter for hotel-relevant emails (info@, hotel@, contact@, reservations@)
            const relevantEmails = foundEmails.filter(email => {
                const local = email.split('@')[0].toLowerCase();
                return ['info', 'hotel', 'contact', 'reservations', 'reservering',
                    'booking', 'reception', 'front', 'office', 'sales'].some(p => local.includes(p));
            });

            // Get first result URL for domain extraction
            let domain = null;
            let links;
            if (isGoogle) {
                links = document.querySelectorAll('div.g a[href^="http"]');
            } else {
                links = document.querySelectorAll('a.result__a[href^="http"], article a[href^="http"]');
            }

            for (const link of links) {
                const href = link.href;
                // Skip social media, directories, booking sites
                if (href.includes('linkedin.') || href.includes('facebook.') ||
                    href.includes('booking.com') || href.includes('tripadvisor.') ||
                    href.includes('yelp.') || href.includes('wikipedia.') ||
                    href.includes('expedia.') || href.includes('hotels.com') ||
                    href.includes('google.') || href.includes('duckduckgo.')) {
                    continue;
                }

                try {
                    const url = new URL(href);
                    domain = url.hostname.replace('www.', '');
                    break;
                } catch {
                    continue;
                }
            }

            return {
                emails: relevantEmails.slice(0, 3), // Top 3 relevant emails
                domain: domain,
                allEmails: foundEmails.slice(0, 5) // Backup: any emails found
            };
        }, useGoogle);

        return result;
    } catch (err) {
        console.error(`   ❌ Search error: ${err.message}`);
        return { emails: [], domain: null, allEmails: [] };
    }
}

async function discoverDomains() {
    console.log('🌐 Step 3: Smart Domain & Email Discovery');
    console.log('==========================================\n');

    // Load leads
    const leads = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
    console.log(`📥 Loaded ${leads.length} leads`);

    // Load progress
    let progress = { completed: {}, lastIndex: 0 };
    if (fs.existsSync(PROGRESS_PATH)) {
        progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
        console.log(`📈 Resuming from index ${progress.lastIndex}`);
    }

    // Get unique companies that need domain lookup
    const companiesNeedingDomain = new Map();
    leads.forEach((lead, idx) => {
        if (lead.email) return; // Skip if already has email
        if (!lead.company) return; // Skip if no company

        const key = lead.company.toLowerCase();
        if (!companiesNeedingDomain.has(key) && !progress.completed[key]) {
            companiesNeedingDomain.set(key, lead.company);
        }
    });

    console.log(`🔍 Unique companies to search: ${companiesNeedingDomain.size}`);

    // Limit for testing
    const limit = args.limit ? parseInt(args.limit) : companiesNeedingDomain.size;
    console.log(`🎯 Processing first ${limit} companies\n`);

    // Launch browser
    const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,720'];
    if (args.proxy) {
        const proxyHost = args.proxy.includes('@')
            ? args.proxy.split('@')[1]
            : args.proxy.replace('http://', '');
        launchArgs.push(`--proxy-server=http://${proxyHost}`);
    }

    const browser = await puppeteer.launch({
        headless: args.headless === 'true',
        executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        userDataDir: path.join(__dirname, '..', '.chrome-domain-finder'),
        args: launchArgs
    });

    const page = (await browser.pages())[0];

    // Proxy auth
    if (args.proxy && args.proxy.includes('@')) {
        const auth = args.proxy.split('//')[1].split('@')[0];
        const [username, password] = auth.split(':');
        await page.authenticate({ username, password });
    }

    let found = 0;
    let emailsFound = 0;
    let notFound = 0;
    let i = 0;
    const total = companiesNeedingDomain.size;

    for (const [key, company] of companiesNeedingDomain) {
        if (i >= limit) {
            console.log(`\n🛑 Limit of ${limit} reached, stopping.`);
            break;
        }
        i++;
        console.log(`[${i}/${Math.min(total, limit)}] Searching: "${company}"`);

        // Try DuckDuckGo first
        let result = await findDomainAndEmail(page, company, false);

        // Fallback to Google if not found
        if (!result.domain && !result.emails.length && args.googleFallback !== 'false') {
            console.log(`   ↻ Trying Google fallback...`);
            result = await findDomainAndEmail(page, company, true);
        }

        // Store results
        if (result.emails.length > 0) {
            progress.completed[key] = {
                domain: result.domain,
                emails: result.emails,
                source: 'direct-search'
            };
            emailsFound++;
            console.log(`   ✅ Found email: ${result.emails[0]}`);
        } else if (result.domain) {
            progress.completed[key] = {
                domain: result.domain,
                emails: [],
                source: 'domain-only'
            };
            found++;
            console.log(`   ✅ Found domain: ${result.domain}`);
        } else {
            progress.completed[key] = null;
            notFound++;
            console.log(`   ⚠️ Not found`);
        }

        // Save progress every 10 companies
        if (i % 10 === 0) {
            progress.lastIndex = i;
            fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
            console.log(`   💾 Progress saved (${i}/${total})`);
        }

        // Delay to avoid detection
        await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
    }

    await browser.close();

    // Final save
    fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));

    // Update leads with found data
    const updatedLeads = leads.map(lead => {
        if (lead.email) return lead; // Already has email
        if (!lead.company) return lead;

        const key = lead.company.toLowerCase();
        const data = progress.completed[key];

        if (!data) return { ...lead, domain: null, foundEmail: null };

        return {
            ...lead,
            domain: data.domain || null,
            foundEmail: data.emails && data.emails[0] ? data.emails[0] : null,
            foundEmailSource: data.source || null
        };
    });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(updatedLeads, null, 2));

    console.log(`\n📊 Results:`);
    console.log(`   Direct emails found: ${emailsFound}`);
    console.log(`   Domains found (no email): ${found}`);
    console.log(`   Not found: ${notFound}`);
    console.log(`💾 Output: ${OUTPUT_PATH}`);
}

discoverDomains().catch(console.error);
