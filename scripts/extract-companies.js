/**
 * Email Finder v3.0 - Step 2: Headline Parsing
 * Extracts company/hotel names from headlines using regex patterns
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH = path.join(__dirname, '..', 'data', 'chain-matched-leads.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'parsed-leads.json');

// Regex patterns to extract company names from headlines
const EXTRACTION_PATTERNS = [
    // Dutch patterns
    /(?:bij|van|voor)\s+(.+?)(?:\s*[-–|,]|$)/i,
    /(?:General Manager|GM|Director|Manager|Owner|Eigenaar)\s+(?:bij|van|at)?\s*(.+?)(?:\s*[-–|,]|$)/i,

    // English patterns
    /(?:at|@)\s+(.+?)(?:\s*[-–|,]|$)/i,
    /(?:General Manager|GM|Director|Manager|Owner)\s+(?:of|for)?\s*(.+?)(?:\s*[-–|,]|$)/i,

    // Direct hotel mention
    /\b(Hotel\s+[A-Z][a-zA-Z\s]+)/i,
    /((?:The\s+)?[A-Z][a-zA-Z]+\s+Hotel)/i,

    // Resort patterns
    /\b([A-Z][a-zA-Z\s]+\s+Resort)/i,

    // Company after pipe or dash
    /[-–|]\s*(.+?)$/
];

// Words to clean from extracted company names
const NOISE_WORDS = [
    'hospitality', 'professional', 'industry', 'sector', 'tourism',
    'consultant', 'consulting', 'freelance', 'looking for', 'open to',
    'available', 'seeking', '|', '-', '–'
];

function extractCompany(headline) {
    if (!headline) return null;

    for (const pattern of EXTRACTION_PATTERNS) {
        const match = headline.match(pattern);
        if (match && match[1]) {
            let company = match[1].trim();

            // Clean noise words
            const lowerComp = company.toLowerCase();
            if (NOISE_WORDS.some(noise => lowerComp.includes(noise))) {
                continue;
            }

            // Skip if too short or too generic
            if (company.length < 3 || company.length > 80) continue;
            if (['Hotel', 'Hotels', 'The', 'Manager', 'Director'].includes(company)) continue;

            return company;
        }
    }

    return null;
}

function parseHeadlines() {
    console.log('📝 Step 2: Headline Parsing');
    console.log('===========================\n');

    const leads = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
    console.log(`📥 Loaded ${leads.length} leads`);

    let extracted = 0;
    let alreadyMatched = 0;
    let failed = 0;

    const processed = leads.map(lead => {
        // Skip if already has chain match
        if (lead.chain) {
            alreadyMatched++;
            return lead;
        }

        const company = extractCompany(lead.headline);
        if (company) {
            extracted++;
            return {
                ...lead,
                company: company,
                companySource: 'regex'
            };
        } else {
            failed++;
            return {
                ...lead,
                company: null,
                companySource: null
            };
        }
    });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(processed, null, 2));

    console.log(`\n📊 Results:`);
    console.log(`   Already chain-matched: ${alreadyMatched}`);
    console.log(`   Company extracted (regex): ${extracted}`);
    console.log(`   Could not extract: ${failed}`);
    console.log(`\n💾 Output: ${OUTPUT_PATH}`);

    // Show some examples
    console.log('\n📋 Sample Extractions:');
    processed
        .filter(l => l.company && !l.chain)
        .slice(0, 5)
        .forEach(l => {
            console.log(`   "${l.headline.substring(0, 50)}..." → ${l.company}`);
        });
}

parseHeadlines();
