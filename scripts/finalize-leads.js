/**
 * Email Finder v3.0 - Step 7: Final Scoring & Export
 * Consolidates all data and exports final qualified leads
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH = path.join(__dirname, '..', 'data', 'email-candidates.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'final-leads.json');
const CSV_PATH = path.join(__dirname, '..', 'data', 'final-leads.csv');

// Language detection based on location and headline
function detectLanguage(location, headline) {
    const loc = (location || '').toLowerCase();
    const head = (headline || '').toLowerCase();

    // Dutch
    if (loc.includes('nederland') || loc.includes('netherlands') ||
        loc.includes('amsterdam') || loc.includes('rotterdam') || loc.includes('utrecht') ||
        loc.includes('eindhoven') || loc.includes('den haag') || loc.includes('groningen') ||
        head.includes(' bij ') || head.includes(' van ')) {
        return 'NL';
    }

    // Belgian (could be NL or FR)
    if (loc.includes('belgi') || loc.includes('belgium') ||
        loc.includes('brussels') || loc.includes('brussel') || loc.includes('antwerp')) {
        // Check for French indicators
        if (loc.includes('walloni') || loc.includes('liège') || loc.includes('namur') ||
            head.includes(' chez ') || head.includes(' de ')) {
            return 'FR';
        }
        return 'NL'; // Flemish/Dutch
    }

    // German
    if (loc.includes('germany') || loc.includes('deutschland') || loc.includes('deutsch') ||
        loc.includes('berlin') || loc.includes('munich') || loc.includes('münchen') ||
        loc.includes('hamburg') || loc.includes('frankfurt') ||
        head.includes(' bei ') || head.includes(' gmbh')) {
        return 'DE';
    }

    // French
    if (loc.includes('france') || loc.includes('paris') || loc.includes('lyon') ||
        loc.includes('marseille') || loc.includes('français') ||
        head.includes(' chez ') || head.includes(' hôtel')) {
        return 'FR';
    }

    // Spanish
    if (loc.includes('spain') || loc.includes('españa') || loc.includes('madrid') ||
        loc.includes('barcelona') || loc.includes('valencia')) {
        return 'ES';
    }

    // Italian
    if (loc.includes('italy') || loc.includes('italia') || loc.includes('rome') ||
        loc.includes('milan') || loc.includes('venice') || loc.includes('florence')) {
        return 'IT';
    }

    // UK/Ireland (English)
    if (loc.includes('united kingdom') || loc.includes('uk') || loc.includes('london') ||
        loc.includes('manchester') || loc.includes('birmingham') || loc.includes('ireland') ||
        loc.includes('dublin')) {
        return 'EN';
    }

    // Default to English for other locations
    return 'EN';
}

function finalizeLeads() {
    console.log('🏁 Step 7: Final Scoring & Export');
    console.log('==================================\n');

    const leads = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
    console.log(`📥 Loaded ${leads.length} leads`);

    // Final processing
    const finalLeads = leads
        .filter(l => l.email && l.emailConfidence !== 'NONE')
        .map(lead => {
            // Extract domain from email for info@ fallback
            const domain = lead.email ? lead.email.split('@')[1] : null;
            const fallbackEmail = domain ? `info@${domain}` : null;

            return {
                name: lead.name,
                email: lead.email,
                fallbackEmail: fallbackEmail,
                confidence: lead.emailConfidence,
                company: lead.chain || lead.company || 'Unknown',
                title: lead.headline,
                location: lead.location,
                priority: lead.priority,
                language: detectLanguage(lead.location, lead.headline),
                alternativeEmails: lead.alternativeEmails || []
            };
        })
        .sort((a, b) => {
            // Sort by priority first, then confidence
            if (a.priority !== b.priority) return a.priority.localeCompare(b.priority);
            if (a.confidence === 'HIGH' && b.confidence !== 'HIGH') return -1;
            if (b.confidence === 'HIGH' && a.confidence !== 'HIGH') return 1;
            return 0;
        });

    // Save JSON
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalLeads, null, 2));

    // Generate CSV with fallback email column
    const csvHeader = 'Name,Email,Fallback Email (info@),Confidence,Company,Title,Location,Priority,Language,Alternative Emails\n';
    const csvRows = finalLeads.map(l =>
        `"${l.name}","${l.email}","${l.fallbackEmail || ''}","${l.confidence}","${l.company}","${l.title?.replace(/"/g, '""') || ''}","${l.location}","${l.priority}","${l.language}","${l.alternativeEmails.slice(0, 2).join('; ')}"`
    ).join('\n');
    fs.writeFileSync(CSV_PATH, csvHeader + csvRows);

    // Statistics
    const high = finalLeads.filter(l => l.confidence === 'HIGH').length;
    const medium = finalLeads.filter(l => l.confidence === 'MEDIUM').length;
    const p1 = finalLeads.filter(l => l.priority === 'P1').length;
    const p2 = finalLeads.filter(l => l.priority === 'P2').length;
    const p3 = finalLeads.filter(l => l.priority === 'P3').length;

    console.log(`\n✅ FINAL RESULTS:`);
    console.log(`================`);
    console.log(`Total qualified leads: ${finalLeads.length}`);
    console.log(`\n📊 By Confidence:`);
    console.log(`   HIGH (safe to mail): ${high}`);
    console.log(`   MEDIUM (test batch first): ${medium}`);
    console.log(`\n🎯 By Priority:`);
    console.log(`   P1 (GM/Owner/CEO): ${p1}`);
    console.log(`   P2 (Director): ${p2}`);
    console.log(`   P3 (Manager): ${p3}`);
    console.log(`\n💾 Output files:`);
    console.log(`   JSON: ${OUTPUT_PATH}`);
    console.log(`   CSV: ${CSV_PATH}`);
}

finalizeLeads();
