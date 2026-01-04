import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawFilePath = path.join(__dirname, '..', 'data', 'linkedin-raw.txt');
const leadsFilePath = path.join(__dirname, '..', 'data', 'linkedin-leads.json');

function parseLeads() {
    if (!fs.existsSync(rawFilePath)) {
        console.error('Raw file not found at:', rawFilePath);
        return;
    }

    const content = fs.readFileSync(rawFilePath, 'utf8');
    const sections = content.split(/========== PAGE \d+ ==========/);

    const allLeads = [];
    const processedNames = new Set();
    const jobKeywords = ['manager', 'director', 'owner', 'ceo', 'gm', 'general', 'hotel', 'resort', 'professional', 'hospitality', 'operation', 'boutique', 'leader', 'head', 'host', 'consultant'];

    sections.forEach(section => {
        if (!section.trim()) return;
        const lines = section.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        let i = 0;
        while (i < lines.length) {
            let line = lines[i];

            // Clean common prefixes/suffixes
            let cleanName = line.split(' • ')[0].split('  • ')[0].replace(/ • .*/, '').trim();

            // Skip UI noise
            const isUINoise = ['Home', 'Mijn netwerk', 'Vacatures', 'Bericht', 'Volgen', 'Connectie maken', 'Probeer Premium', 'Personen', 'Locaties', 'Ik', 'Volgende', 'Vorige', 'Filters', 'Alle filters', 'Huidige bedrijven', 'Info', 'Overslaan', 'meldingen', '1ste', '2de', '3de+', '3rd+'].some(noise => cleanName === noise || cleanName.startsWith(noise));

            if (isUINoise || cleanName.length < 3 || cleanName.length > 40) {
                i++;
                continue;
            }

            const words = cleanName.split(' ');
            const isName = words.length >= 2 && words.length <= 6 && words.every(w => {
                const lw = w.toLowerCase();
                if (['van', 'der', 'de', 'den', 'in', 't', 'op', 'el', 'la', 'le'].includes(lw)) return true;
                return w[0] === w[0]?.toUpperCase() || (w.includes('.') && w.length < 4); // Handle initials like "H."
            });

            if (isName) {
                // We found a name! Now look for a headline in the next 4 lines
                let headline = '';
                let location = 'Onbekend';
                let foundHeadline = false;

                for (let j = 1; j <= 4 && (i + j) < lines.length; j++) {
                    const nextLine = lines[i + j];

                    // If we see another name-like structure, stop looking
                    if (nextLine.includes(' • 3') || nextLine.includes(' • 2') || nextLine.includes(' • 1')) break;
                    if (['Bericht', 'Volgen', 'Connectie maken', 'Berichten', 'Meldingen'].includes(nextLine)) break;

                    const hasKeyword = jobKeywords.some(kw => nextLine.toLowerCase().includes(kw));
                    if (hasKeyword && !foundHeadline) {
                        headline = nextLine;
                        // Check if the next line is also part of the headline
                        if ((i + j + 1) < lines.length && !lines[i + j + 1].includes(',') && !lines[i + j + 1].includes('Nederland') && !lines[i + j + 1].includes('België') && jobKeywords.some(kw => lines[i + j + 1].toLowerCase().includes(kw))) {
                            headline += ' ' + lines[i + j + 1];
                            j++;
                        }
                        foundHeadline = true;
                    } else if (foundHeadline && location === 'Onbekend' && (nextLine.includes(',') || nextLine.includes('Nederland') || nextLine.includes('België') || nextLine.includes('Area') || nextLine.includes('omgeving') || nextLine.includes('Regio'))) {
                        location = nextLine;
                        break; // We have enough for a record
                    }
                }

                if (foundHeadline && !processedNames.has(cleanName)) {
                    allLeads.push({
                        name: cleanName,
                        headline: headline,
                        location: location,
                        extractedAt: new Date().toISOString()
                    });
                    processedNames.add(cleanName);
                    i += 1;
                    continue;
                }
            }
            i++;
        }
    });

    fs.writeFileSync(leadsFilePath, JSON.stringify(allLeads, null, 2));

    console.log(`\n🚀 LinkedIn Data Extraction Result:`);
    console.log(`-----------------------------------`);
    console.log(`✅ Unieke Hotel Leads gevonden: ${allLeads.length}`);
    console.log(`💾 Opgeslagen in: ${leadsFilePath}`);
    console.log(`-----------------------------------\n`);
}

parseLeads();
