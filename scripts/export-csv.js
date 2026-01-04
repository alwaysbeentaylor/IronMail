/**
 * Email Finder v4.0 - Final CSV Export
 * Exports merged results to final-leads.csv with all columns
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH = path.join(__dirname, '..', 'data', 'merged-email-results.json');
const JSON_OUTPUT = path.join(__dirname, '..', 'data', 'final-leads.json');
const CSV_OUTPUT = path.join(__dirname, '..', 'data', 'final-leads.csv');

// Language detection
function detectLanguage(location, headline) {
    const loc = (location || '').toLowerCase();
    const head = (headline || '').toLowerCase();

    if (loc.includes('nederland') || loc.includes('amsterdam') || loc.includes('rotterdam') ||
        loc.includes('utrecht') || head.includes(' bij ') || head.includes(' van ')) return 'NL';
    if (loc.includes('germany') || loc.includes('deutschland') || loc.includes('berlin') ||
        loc.includes('munich') || head.includes(' bei ')) return 'DE';
    if (loc.includes('france') || loc.includes('paris') || loc.includes('lyon') ||
        head.includes(' chez ')) return 'FR';
    if (loc.includes('belgi') || loc.includes('brussels') || loc.includes('antwerp')) {
        if (head.includes(' chez ')) return 'FR';
        return 'NL';
    }
    if (loc.includes('spain') || loc.includes('madrid') || loc.includes('barcelona')) return 'ES';
    if (loc.includes('italy') || loc.includes('roma') || loc.includes('milan')) return 'IT';
    return 'EN';
}

function exportToCsv() {
    console.log('📊 Exporting Final Results');
    console.log('='.repeat(40) + '\n');

    if (!fs.existsSync(INPUT_PATH)) {
        console.log('❌ No merged results found. Run merge-results.js first.');
        return;
    }

    const results = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
    console.log(`📥 Loaded ${results.length} results`);

    // Filter to only those with emails
    const withEmails = results.filter(r => r.primaryEmail || r.hotelEmails?.length > 0);
    console.log(`📧 With emails: ${withEmails.length}`);

    // Add language and format
    const finalLeads = withEmails.map(r => ({
        name: r.name,
        primaryEmail: r.primaryEmail || r.hotelEmails?.[0] || '',
        hotelEmail: r.hotelEmails?.[0] || (r.domain ? `info@${r.domain}` : ''),
        allEmails: r.allEmails?.join('; ') || '',
        phone: r.phones?.[0] || '',
        allPhones: r.phones?.join('; ') || '',
        address: r.addresses?.[0] || '',
        confidence: r.confidence,
        company: r.company,
        title: r.headline,
        location: r.location,
        priority: r.priority,
        language: detectLanguage(r.location, r.headline),
        domain: r.domain
    }));

    // Save JSON
    fs.writeFileSync(JSON_OUTPUT, JSON.stringify(finalLeads, null, 2));

    // Generate CSV
    const headers = [
        'Name',
        'Primary Email',
        'Hotel Email (fallback)',
        'Phone',
        'All Phones',
        'Address',
        'All Found Emails',
        'Confidence',
        'Company',
        'Title',
        'Location',
        'Priority',
        'Language',
        'Domain'
    ];

    const csvRows = finalLeads.map(l => [
        `"${l.name}"`,
        `"${l.primaryEmail}"`,
        `"${l.hotelEmail}"`,
        `"${l.phone}"`,
        `"${l.allPhones}"`,
        `"${l.address}"`,
        `"${l.allEmails}"`,
        `"${l.confidence}"`,
        `"${l.company}"`,
        `"${(l.title || '').replace(/"/g, '""')}"`,
        `"${l.location}"`,
        `"${l.priority}"`,
        `"${l.language}"`,
        `"${l.domain || ''}"`
    ].join(','));

    const csv = [headers.join(','), ...csvRows].join('\n');
    fs.writeFileSync(CSV_OUTPUT, csv);

    // Stats
    const high = finalLeads.filter(l => l.confidence === 'HIGH').length;
    const medium = finalLeads.filter(l => l.confidence === 'MEDIUM').length;
    const p1 = finalLeads.filter(l => l.priority === 'P1').length;

    console.log(`\n✅ FINAL OUTPUT:`);
    console.log(`   Total leads: ${finalLeads.length}`);
    console.log(`   HIGH confidence: ${high}`);
    console.log(`   MEDIUM confidence: ${medium}`);
    console.log(`   P1 (GM/Owner): ${p1}`);
    console.log(`\n💾 Files:`);
    console.log(`   JSON: ${JSON_OUTPUT}`);
    console.log(`   CSV: ${CSV_OUTPUT}`);
}

exportToCsv();
