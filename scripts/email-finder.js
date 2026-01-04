/**
 * Email Finder v3.0 - Master Runner
 * Runs the complete email discovery pipeline
 * 
 * Usage:
 *   node scripts/email-finder.js              # Run all steps (skip domain search)
 *   node scripts/email-finder.js --full       # Run all steps including domain search
 *   node scripts/email-finder.js --step=3     # Run specific step only
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, val] = arg.replace('--', '').split('=');
    acc[key] = val || true;
    return acc;
}, {});

function runStep(script, description) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(description);
    console.log('='.repeat(50));

    try {
        execSync(`node scripts/${script}`, {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });
        return true;
    } catch (err) {
        console.error(`❌ Step failed: ${err.message}`);
        return false;
    }
}

async function main() {
    console.log('\n🚀 EMAIL FINDER v3.0 - MASTER RUNNER');
    console.log('=====================================\n');

    const step = args.step ? parseInt(args.step) : null;
    const full = args.full === true;

    // Step 0: Data Cleaning
    if (!step || step === 0) {
        if (!runStep('clean-leads.js', '🧹 STEP 0: Data Cleaning')) return;
    }

    // Step 1: Chain Detection
    if (!step || step === 1) {
        if (!runStep('chain-matcher.js', '🏨 STEP 1: Hotel Chain Detection')) return;
    }

    // Step 2: Headline Parsing
    if (!step || step === 2) {
        if (!runStep('extract-companies.js', '📝 STEP 2: Headline Parsing')) return;
    }

    // Step 3: Domain Discovery (only if --full flag)
    if (step === 3 || full) {
        console.log('\n⚠️ Step 3 (Domain Discovery) requires browser automation.');
        console.log('Run separately: node scripts/domain-finder.js --proxy="..." --headless=true');
    }

    // Step 4: Email Generation
    if (!step || step === 4) {
        if (!runStep('generate-emails.js', '📧 STEP 4: Email Pattern Generation')) return;
    }

    // Step 7: Final Export
    if (!step || step === 7) {
        if (!runStep('finalize-leads.js', '🏁 STEP 7: Final Export')) return;
    }

    console.log('\n\n✅ PIPELINE COMPLETE!');
    console.log('Check data/final-leads.json and data/final-leads.csv');
}

main().catch(console.error);
