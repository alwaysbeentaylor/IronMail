/**
 * Email Finder v3.0 - Step 1: Chain Detection
 * Instantly matches leads to known hotel chains and generates HIGH confidence emails
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH = path.join(__dirname, '..', 'data', 'clean-leads.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'chain-matched-leads.json');

// Pre-loaded hotel chain email patterns (research-backed)
const CHAIN_PATTERNS = {
    // International Chains
    'hilton': { domain: 'hilton.com', pattern: '{first}.{last}' },
    'marriott': { domain: 'marriott.com', pattern: '{first}.{last}' },
    'accor': { domain: 'accor.com', pattern: '{first}.{last}' },
    'ihg': { domain: 'ihg.com', pattern: '{first}.{last}' },
    'hyatt': { domain: 'hyatt.com', pattern: '{first}.{last}' },
    'wyndham': { domain: 'wyndham.com', pattern: '{first}.{last}' },
    'radisson': { domain: 'radissonhotels.com', pattern: '{first}.{last}' },
    'best western': { domain: 'bestwestern.com', pattern: '{first}.{last}' },
    'intercontinental': { domain: 'ihg.com', pattern: '{first}.{last}' },
    'holiday inn': { domain: 'ihg.com', pattern: '{first}.{last}' },
    'crowne plaza': { domain: 'ihg.com', pattern: '{first}.{last}' },
    'novotel': { domain: 'accor.com', pattern: '{first}.{last}' },
    'ibis': { domain: 'accor.com', pattern: '{first}.{last}' },
    'mercure': { domain: 'accor.com', pattern: '{first}.{last}' },
    'sofitel': { domain: 'accor.com', pattern: '{first}.{last}' },
    'pullman': { domain: 'accor.com', pattern: '{first}.{last}' },
    'moxy': { domain: 'marriott.com', pattern: '{first}.{last}' },
    'w hotel': { domain: 'marriott.com', pattern: '{first}.{last}' },
    'sheraton': { domain: 'marriott.com', pattern: '{first}.{last}' },
    'westin': { domain: 'marriott.com', pattern: '{first}.{last}' },
    'renaissance': { domain: 'marriott.com', pattern: '{first}.{last}' },
    'courtyard': { domain: 'marriott.com', pattern: '{first}.{last}' },
    'fairfield': { domain: 'marriott.com', pattern: '{first}.{last}' },
    'four points': { domain: 'marriott.com', pattern: '{first}.{last}' },
    'le meridien': { domain: 'marriott.com', pattern: '{first}.{last}' },
    'tribute': { domain: 'marriott.com', pattern: '{first}.{last}' },
    'doubletree': { domain: 'hilton.com', pattern: '{first}.{last}' },
    'hampton': { domain: 'hilton.com', pattern: '{first}.{last}' },
    'embassy suites': { domain: 'hilton.com', pattern: '{first}.{last}' },
    'waldorf': { domain: 'hilton.com', pattern: '{first}.{last}' },
    'conrad': { domain: 'hilton.com', pattern: '{first}.{last}' },
    'canopy': { domain: 'hilton.com', pattern: '{first}.{last}' },
    'curio': { domain: 'hilton.com', pattern: '{first}.{last}' },
    'tapestry': { domain: 'hilton.com', pattern: '{first}.{last}' },

    // Dutch Chains
    'van der valk': { domain: 'vfrb.nl', pattern: '{first}.{last}' },
    'fletcher': { domain: 'fletcher.nl', pattern: '{first}.{last}' },
    'postillion': { domain: 'postillionhotels.com', pattern: '{first}.{last}' },
    'bilderberg': { domain: 'bilderberg.nl', pattern: '{first}.{last}' },
    'westcord': { domain: 'westcordhotels.nl', pattern: '{first}.{last}' },
    'carlton': { domain: 'carlton.nl', pattern: '{first}.{last}' },
    'hampshire': { domain: 'hampshire-hotels.com', pattern: '{first}.{last}' },
    'eden': { domain: 'edenhotels.nl', pattern: '{first}.{last}' },
    'corendon': { domain: 'corendonhotels.com', pattern: '{first}.{last}' },

    // Belgian Chains
    'martin\'s': { domain: 'martinshotels.com', pattern: '{first}.{last}' },

    // German Chains
    'steigenberger': { domain: 'steigenberger.com', pattern: '{first}.{last}' },
    'motel one': { domain: 'motel-one.com', pattern: '{first}.{last}' },
    'dorint': { domain: 'dorint.com', pattern: '{first}.{last}' },

    // French Chains
    'louvre hotels': { domain: 'louvrehotels.com', pattern: '{first}.{last}' },

    // Spanish Chains
    'nh hotels': { domain: 'nh-hotels.com', pattern: '{first}.{last}' },
    'nh hotel': { domain: 'nh-hotels.com', pattern: '{first}.{last}' },
    'melia': { domain: 'melia.com', pattern: '{first}.{last}' },
    'barcelo': { domain: 'barcelo.com', pattern: '{first}.{last}' },
    'riu': { domain: 'riu.com', pattern: '{first}.{last}' }
};

function generateEmail(name, pattern, domain) {
    const parts = name.toLowerCase().split(' ');
    const first = parts[0].normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove accents
    const last = parts[parts.length - 1].normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const email = pattern
        .replace('{first}', first)
        .replace('{last}', last)
        .replace('{f}', first[0]);

    return `${email}@${domain}`;
}

function detectChain(headline) {
    const lower = headline.toLowerCase();

    for (const [chainName, config] of Object.entries(CHAIN_PATTERNS)) {
        if (lower.includes(chainName)) {
            return { chainName, ...config };
        }
    }
    return null;
}

function matchChains() {
    console.log('🏨 Step 1: Chain Detection');
    console.log('==========================\n');

    const leads = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
    console.log(`📥 Loaded ${leads.length} clean leads`);

    let matched = 0;
    let processed = [];

    for (const lead of leads) {
        const chain = detectChain(lead.headline);

        if (chain) {
            const email = generateEmail(lead.name, chain.pattern, chain.domain);
            processed.push({
                ...lead,
                chain: chain.chainName,
                email: email,
                emailConfidence: 'HIGH',
                emailSource: 'chain-pattern'
            });
            matched++;
        } else {
            processed.push({
                ...lead,
                chain: null,
                email: null,
                emailConfidence: null,
                emailSource: null
            });
        }
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(processed, null, 2));

    console.log(`\n✅ Chain matches: ${matched} (${((matched / leads.length) * 100).toFixed(1)}%)`);
    console.log(`⏳ Remaining for pattern discovery: ${leads.length - matched}`);
    console.log(`💾 Output: ${OUTPUT_PATH}`);

    // Show chain breakdown
    const chainStats = {};
    processed.filter(l => l.chain).forEach(l => {
        chainStats[l.chain] = (chainStats[l.chain] || 0) + 1;
    });

    console.log('\n🏢 Top Chains Found:');
    Object.entries(chainStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([chain, count]) => {
            console.log(`   ${chain}: ${count}`);
        });
}

matchChains();
