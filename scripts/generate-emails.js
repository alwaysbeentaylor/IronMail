/**
 * Email Finder v3.0 - Step 4: Email Pattern Generation + MX Validation
 * Generates email patterns and validates domains can receive email
 */

import fs from 'fs';
import path from 'path';
import dns from 'dns';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveMx = promisify(dns.resolveMx);

const INPUT_PATH = path.join(__dirname, '..', 'data', 'leads-with-domains.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'email-candidates.json');
const PATTERN_MEMORY_PATH = path.join(__dirname, '..', 'data', 'pattern-memory.json');

// Email patterns in order of probability (hospitality industry)
const PATTERNS = [
    '{first}.{last}',   // Most common: jan.jansen@hotel.com
    '{f}.{last}',       // Common: j.jansen@hotel.com  
    '{first}{last}',    // janjansen@hotel.com
    '{first}',          // jan@hotel.com (common for small hotels)
    '{last}',           // jansen@hotel.com
];

// Fallback email (always included as backup)
const FALLBACK_PATTERN = 'info';

// Load or create pattern memory (learns from successful patterns)
let patternMemory = {};
if (fs.existsSync(PATTERN_MEMORY_PATH)) {
    patternMemory = JSON.parse(fs.readFileSync(PATTERN_MEMORY_PATH, 'utf8'));
}

function generateEmailFromPattern(name, pattern, domain) {
    const parts = name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .split(' ')
        .filter(p => p.length > 0);

    if (parts.length < 2) return null;

    const first = parts[0];
    const last = parts[parts.length - 1];

    const localPart = pattern
        .replace('{first}', first)
        .replace('{last}', last)
        .replace('{f}', first[0])
        .replace('{l}', last[0]);

    return `${localPart}@${domain}`;
}

async function checkMxRecord(domain) {
    try {
        const records = await resolveMx(domain);
        return records && records.length > 0;
    } catch {
        return false;
    }
}

// Known catch-all domains (accept any email)
const CATCH_ALL_DOMAINS = new Set([
    'gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com'
]);

async function generateEmails() {
    console.log('📧 Step 4: Email Pattern Generation + MX Validation');
    console.log('====================================================\n');

    // Check if domain discovery was run
    if (!fs.existsSync(INPUT_PATH)) {
        // Use parsed-leads.json instead if domain-finder wasn't run
        const altPath = path.join(__dirname, '..', 'data', 'parsed-leads.json');
        if (fs.existsSync(altPath)) {
            console.log('⚠️ Using parsed-leads.json (domain discovery not yet run)');
            fs.copyFileSync(altPath, INPUT_PATH);
        }
    }

    const leads = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
    console.log(`📥 Loaded ${leads.length} leads`);

    let stats = {
        alreadyHasEmail: 0,
        generated: 0,
        mxValid: 0,
        mxInvalid: 0,
        noDomain: 0
    };

    const processed = [];
    const domainMxCache = {};

    for (const lead of leads) {
        // Already has HIGH confidence email from chain matching
        if (lead.email && lead.emailConfidence === 'HIGH') {
            stats.alreadyHasEmail++;
            processed.push(lead);
            continue;
        }

        // Need domain to generate email
        const domain = lead.domain || (lead.company ? null : null);
        if (!domain) {
            stats.noDomain++;
            processed.push({
                ...lead,
                email: null,
                emailConfidence: 'NONE',
                emailSource: 'no-domain'
            });
            continue;
        }

        // Check MX record (cached)
        if (domainMxCache[domain] === undefined) {
            domainMxCache[domain] = await checkMxRecord(domain);
        }
        const hasMx = domainMxCache[domain];

        if (!hasMx) {
            stats.mxInvalid++;
            processed.push({
                ...lead,
                email: null,
                emailConfidence: 'NONE',
                emailSource: 'mx-invalid'
            });
            continue;
        }

        stats.mxValid++;

        // Check if we learned a pattern for this domain
        const learnedPattern = patternMemory[domain];

        // Generate email with best pattern
        const pattern = learnedPattern || PATTERNS[0];
        const email = generateEmailFromPattern(lead.name, pattern, domain);

        if (email) {
            stats.generated++;
            processed.push({
                ...lead,
                email: email,
                emailConfidence: learnedPattern ? 'HIGH' : 'MEDIUM',
                emailSource: learnedPattern ? 'learned-pattern' : 'generated',
                emailPattern: pattern,
                alternativeEmails: PATTERNS.slice(1).map(p => generateEmailFromPattern(lead.name, p, domain)).filter(Boolean)
            });
        } else {
            processed.push({
                ...lead,
                email: null,
                emailConfidence: 'NONE',
                emailSource: 'generation-failed'
            });
        }
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(processed, null, 2));

    console.log(`\n📊 Results:`);
    console.log(`   Already has email (chain): ${stats.alreadyHasEmail}`);
    console.log(`   Emails generated: ${stats.generated}`);
    console.log(`   MX valid domains: ${stats.mxValid}`);
    console.log(`   MX invalid domains: ${stats.mxInvalid}`);
    console.log(`   No domain available: ${stats.noDomain}`);
    console.log(`\n💾 Output: ${OUTPUT_PATH}`);

    // Confidence breakdown
    const high = processed.filter(l => l.emailConfidence === 'HIGH').length;
    const medium = processed.filter(l => l.emailConfidence === 'MEDIUM').length;
    const none = processed.filter(l => l.emailConfidence === 'NONE').length;
    console.log(`\n🎯 Confidence Breakdown:`);
    console.log(`   HIGH: ${high}`);
    console.log(`   MEDIUM: ${medium}`);
    console.log(`   NONE: ${none}`);
}

generateEmails().catch(console.error);
