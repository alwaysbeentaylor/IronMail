/**
 * Email Finder v3.0 - Step 0: Data Cleaning
 * Removes junk entries and duplicates from linkedin-leads.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH = path.join(__dirname, '..', 'data', 'linkedin-leads.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'clean-leads.json');

function cleanLeads() {
    console.log('🧹 Step 0: Data Cleaning');
    console.log('========================\n');

    // Load raw leads
    const rawLeads = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
    console.log(`📥 Loaded ${rawLeads.length} raw leads`);

    const seen = new Set();
    const cleaned = [];
    let stats = {
        junkName: 0,
        shortName: 0,
        duplicates: 0,
        noHeadline: 0
    };

    for (const lead of rawLeads) {
        const name = (lead.name || '').trim();
        const headline = (lead.headline || '').trim();

        // Skip junk names
        if (name.includes('•') || name.includes('3rd') || name.includes('2nd') || name.includes('1st') || name.includes('volgers')) {
            stats.junkName++;
            continue;
        }

        // Skip short names (likely parsing errors)
        if (name.length < 5 || name.split(' ').length < 2) {
            stats.shortName++;
            continue;
        }

        // Skip if no headline
        if (!headline || headline.length < 5) {
            stats.noHeadline++;
            continue;
        }

        // Deduplicate by name + headline combo
        const key = `${name.toLowerCase()}|${headline.toLowerCase()}`;
        if (seen.has(key)) {
            stats.duplicates++;
            continue;
        }
        seen.add(key);

        // Clean and add
        cleaned.push({
            name: name,
            headline: headline,
            location: lead.location || 'Onbekend',
            priority: calculatePriority(headline)
        });
    }

    // Sort by priority (P1 first)
    cleaned.sort((a, b) => a.priority.localeCompare(b.priority));

    // Save
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(cleaned, null, 2));

    console.log('\n📊 Cleaning Statistics:');
    console.log(`   Junk names removed: ${stats.junkName}`);
    console.log(`   Short/invalid names: ${stats.shortName}`);
    console.log(`   Missing headlines: ${stats.noHeadline}`);
    console.log(`   Duplicates removed: ${stats.duplicates}`);
    console.log(`\n✅ Clean leads saved: ${cleaned.length}`);
    console.log(`💾 Output: ${OUTPUT_PATH}`);

    // Priority breakdown
    const p1 = cleaned.filter(l => l.priority === 'P1').length;
    const p2 = cleaned.filter(l => l.priority === 'P2').length;
    const p3 = cleaned.filter(l => l.priority === 'P3').length;
    console.log(`\n🎯 Priority Breakdown:`);
    console.log(`   P1 (GM/Owner/CEO): ${p1}`);
    console.log(`   P2 (Director/Head): ${p2}`);
    console.log(`   P3 (Manager): ${p3}`);
}

function calculatePriority(headline) {
    const lower = headline.toLowerCase();

    // P1: Top decision makers
    if (lower.includes('ceo') || lower.includes('owner') || lower.includes('eigenaar') ||
        lower.includes('general manager') || lower.match(/\bgm\b/) ||
        lower.includes('managing director') || lower.includes('founder')) {
        return 'P1';
    }

    // P2: Senior management
    if (lower.includes('director') || lower.includes('directeur') ||
        lower.includes('head of') || lower.includes('hoofd') ||
        lower.includes('cluster')) {
        return 'P2';
    }

    // P3: Everything else (managers, supervisors, etc.)
    return 'P3';
}

cleanLeads();
