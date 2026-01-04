/**
 * LinkedIn Harvester V3 - Simplified
 * Just copy-paste approach - you give it the LinkedIn HTML
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n📋 LinkedIn Lead Parser\n');
console.log('Stappen:');
console.log('1. Ga naar LinkedIn search: https://www.linkedin.com/search/results/people/?keywords=general%20manager%20hotel');
console.log('2. Scroll door de resultaten');
console.log('3. Selecteer ALLES (Ctrl+A)');
console.log('4. Kopieer (Ctrl+C)');
console.log('5. Plak hieronder en druk ENTER 2x:\n');

let input = '';

process.stdin.on('data', (chunk) => {
    const data = chunk.toString();

    if (data.trim() === '' && input.length > 100) {
        // User pressed enter twice, process the input
        processLinkedInText(input);
        process.exit(0);
    } else {
        input += data;
    }
});

function processLinkedInText(text) {
    console.log('\n🔍 Processing...\n');

    const leads = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Pattern: Name usually followed by headline, then location
    for (let i = 0; i < lines.length - 2; i++) {
        const line = lines[i];

        // Skip common UI elements
        if (line.includes('Connectie maken') ||
            line.includes('Bericht') ||
            line.includes('gemeenschappelijke') ||
            line.includes('Huidig:') ||
            line.includes('Volgende') ||
            line.length < 3 ||
            line.length > 60) {
            continue;
        }

        // Check if this looks like a name (2-4 words, capitalized)
        const words = line.split(' ');
        const looksLikeName = words.length >= 2 &&
            words.length <= 4 &&
            words.every(w => w[0] === w[0].toUpperCase());

        if (looksLikeName) {
            const name = line;
            const headline = lines[i + 1] || '';
            const location = lines[i + 2] || '';

            // Check if headline looks like a job title (contains keywords)
            const jobKeywords = ['manager', 'director', 'owner', 'ceo', 'gm', 'general', 'hotel', 'resort'];
            const hasJobKeyword = jobKeywords.some(kw => headline.toLowerCase().includes(kw));

            if (hasJobKeyword && headline !== name) {
                leads.push({
                    name,
                    headline,
                    location: location.includes(',') ? location : null,
                    extractedAt: new Date().toISOString()
                });
            }
        }
    }

    // Filter for hotels
    const hotelKeywords = [
        'hotel', 'resort', 'inn', 'suites', 'lodge', 'hospitality',
        'marriott', 'hilton', 'hyatt', 'accor', 'ihg', 'radisson'
    ];

    const hotelLeads = leads.filter(lead => {
        const text = `${lead.headline} ${lead.location || ''}`.toLowerCase();
        return hotelKeywords.some(kw => text.includes(kw));
    });

    // Remove duplicates
    const unique = hotelLeads.filter((lead, index, self) =>
        index === self.findIndex(l => l.name === lead.name)
    );

    // Save
    const outputPath = path.join(__dirname, '..', 'data', 'linkedin-leads.json');

    let existing = [];
    if (fs.existsSync(outputPath)) {
        try {
            existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        } catch (e) { }
    }

    const merged = [...existing];
    unique.forEach(lead => {
        if (!merged.some(l => l.name === lead.name)) {
            merged.push(lead);
        }
    });

    fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2));

    console.log('='.repeat(60));
    console.log('📊 RESULTAAT');
    console.log('='.repeat(60));
    console.log(`Totaal gevonden: ${leads.length}`);
    console.log(`Hotel GMs: ${unique.length}`);
    console.log(`Nieuw toegevoegd: ${merged.length - existing.length}`);
    console.log(`Totaal in database: ${merged.length}`);
    console.log(`\nOpgeslagen in: ${outputPath}`);
    console.log('='.repeat(60) + '\n');

    if (unique.length > 0) {
        console.log('📋 Sample:\n');
        unique.slice(0, 5).forEach((lead, i) => {
            console.log(`${i + 1}. ${lead.name}`);
            console.log(`   ${lead.headline}`);
            console.log(`   📍 ${lead.location || 'N/A'}\n`);
        });
    }
}
