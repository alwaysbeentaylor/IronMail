/**
 * Snapshot Merge Script
 * Reads partial results from finder-progress-*.json files
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_PATH = path.join(DATA_DIR, 'merged-email-results.json');

function snapshotMerge() {
    console.log('🔄 Performing Snapshot Merge of Email Results');
    console.log('='.repeat(45) + '\n');

    const allResults = [];
    const seen = new Set();

    // Find all finder-progress-*.json files
    const files = fs.readdirSync(DATA_DIR)
        .filter(f => f.startsWith('finder-progress-') && f.endsWith('.json'));

    console.log(`📁 Found ${files.length} active progress files`);

    for (const file of files) {
        const filePath = path.join(DATA_DIR, file);
        const progress = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const data = Object.values(progress.results || {});

        console.log(`   ${file}: ${data.length} partial results`);

        for (const result of data) {
            const key = `${result.name}|${result.company}`;
            if (!seen.has(key)) {
                seen.add(key);
                allResults.push(result);
            }
        }
    }

    // Also include chain-matched leads (HIGH confidence from v3)
    const chainPath = path.join(DATA_DIR, 'chain-matched-leads.json');
    if (fs.existsSync(chainPath)) {
        const chainLeads = JSON.parse(fs.readFileSync(chainPath, 'utf8'));
        let chainCount = 0;

        for (const lead of chainLeads) {
            if (lead.email && lead.emailConfidence === 'HIGH') {
                const key = `${lead.name}|${lead.chain || lead.company}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    allResults.push({
                        name: lead.name,
                        company: lead.chain,
                        headline: lead.headline,
                        location: lead.location,
                        priority: lead.priority,
                        personalEmails: [lead.email],
                        hotelEmails: [],
                        allEmails: [lead.email],
                        domain: lead.email.split('@')[1],
                        primaryEmail: lead.email,
                        confidence: 'HIGH',
                        source: 'chain-pattern'
                    });
                    chainCount++;
                }
            }
        }
        console.log(`   chain-matched: ${chainCount} HIGH confidence`);
    }

    // Sort by priority and confidence
    allResults.sort((a, b) => {
        if (a.priority !== b.priority) return (a.priority || 'P3').localeCompare(b.priority || 'P3');
        const confOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, NONE: 3 };
        return (confOrder[a.confidence] || 3) - (confOrder[b.confidence] || 3);
    });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allResults, null, 2));

    // Stats
    const high = allResults.filter(r => r.confidence === 'HIGH').length;
    const medium = allResults.filter(r => r.confidence === 'MEDIUM').length;

    console.log(`\n✅ Snapshot Merged: ${allResults.length} total leads`);
    console.log(`   HIGH: ${high}`);
    console.log(`   MEDIUM: ${medium}`);
    console.log(`\n💾 Output: ${OUTPUT_PATH}`);
}

snapshotMerge();
