// Email Verification Report Generator
// Analyzes campaign emails and flags potential issues
// Run: Open in browser at /api/verify-emails?campaignId=YOUR_ID

import { NextResponse } from 'next/server';
import { readData } from '@/lib/storage';
import dns from 'dns/promises';

// Patterns that indicate potentially fake/invalid emails
const SUSPICIOUS_PATTERNS = {
    badPrefixes: ['general.', 'manager.', 'director.', 'hotel.', 'hospitality.', 'ervaren.', 'seasoned.', 'cluster.', 'founder.', 'vice.', 'senior.', 'people-centric.', 'commercial.', 'brand.', 'high.', 'experience.', 'restaurant.', 'assistent.', 'nh.', 'mercure.', 'avani.', 'accountmanager.', 'gm.'],
    badSuffixes: ['.mba', '.rm', '.rt', '.phd', '.msc'],
    locationPatterns: /nederland|duitsland|belgie|zwitserland|frankrijk|armenie|tunesie|jordanie|itali[eë]|spanje|area|metropolitan/i,
    genericPatterns: /^info@|^contact@|^hotel@|^sales@|^reception@|^reservations@/i,
    titleInEmail: /general|manager|director|hospitality|cluster|founder|senior|commercial|experience/i
};

// Known valid corporate email patterns
const VALID_PATTERNS = {
    standardFormat: /^[a-z]+\.[a-z]+@/i,  // firstname.lastname@
    corpDomains: ['marriott.com', 'hilton.com', 'accor.com', 'ihg.com', 'hyatt.com', 'radissonhotels.com', 'vfrb.nl', 'westcordhotels.nl', 'postillionhotels.com', 'bilderberg.nl', 'fletcher.nl', 'carlton.nl', 'nh-hotels.com', 'steigenberger.com', 'riu.com', 'barcelo.com', 'martinshotels.com', 'motel-one.com', 'edenhotels.nl', 'hampshire-hotels.com', 'corendonhotels.com', 'bestwestern.com', 'dorint.com', 'wyndham.com', 'louvrehotels.com']
};

async function analyzeEmail(email) {
    const local = email.split('@')[0].toLowerCase();
    const domain = email.split('@')[1]?.toLowerCase();

    const issues = [];
    let score = 100; // Start with perfect score

    // Check for bad prefixes
    for (const prefix of SUSPICIOUS_PATTERNS.badPrefixes) {
        if (local.startsWith(prefix)) {
            issues.push(`Suspicious prefix: ${prefix}`);
            score -= 40;
            break;
        }
    }

    // Check for bad suffixes
    for (const suffix of SUSPICIOUS_PATTERNS.badSuffixes) {
        if (local.endsWith(suffix)) {
            issues.push(`Title suffix: ${suffix}`);
            score -= 30;
            break;
        }
    }

    // Check for locations in email
    if (SUSPICIOUS_PATTERNS.locationPatterns.test(email)) {
        issues.push('Contains location name');
        score -= 50;
    }

    // Check for generic emails
    if (SUSPICIOUS_PATTERNS.genericPatterns.test(email)) {
        issues.push('Generic email (info@, sales@, etc.)');
        score -= 20; // Less penalty - these might still work
    }

    // Check for titles in email local part
    if (SUSPICIOUS_PATTERNS.titleInEmail.test(local)) {
        issues.push('Contains job title');
        score -= 35;
    }

    // Bonus for standard firstname.lastname format
    if (VALID_PATTERNS.standardFormat.test(email) && !issues.length) {
        score += 10;
    }

    // Bonus for known corporate domain
    if (VALID_PATTERNS.corpDomains.includes(domain)) {
        score += 5;
    }

    // Check if email has unusual characters
    if (/[,\s\-]{2,}|^\.|\.@|\.\.|@\./.test(email)) {
        issues.push('Invalid email format');
        score -= 50;
    }

    return {
        email,
        score: Math.max(0, Math.min(100, score)),
        issues,
        status: score >= 70 ? 'likely_valid' : score >= 40 ? 'suspicious' : 'likely_invalid'
    };
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const campaignId = searchParams.get('campaignId');

        if (!campaignId) {
            // Return all campaigns list
            const campaigns = await readData('campaigns');
            return NextResponse.json({
                message: 'Add ?campaignId=ID to verify a specific campaign',
                campaigns: campaigns.map(c => ({
                    id: c.id,
                    name: c.name,
                    recipientCount: c.recipients?.length || 0,
                    status: c.status
                }))
            });
        }

        const campaigns = await readData('campaigns');
        const campaign = campaigns.find(c => c.id === campaignId);

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        const recipients = campaign.recipients || [];
        const results = [];

        for (const recipient of recipients) {
            const analysis = await analyzeEmail(recipient.email);
            results.push({
                ...analysis,
                name: recipient.name,
                company: recipient.company
            });
        }

        // Sort by score (worst first)
        results.sort((a, b) => a.score - b.score);

        // Summary stats
        const likelyValid = results.filter(r => r.status === 'likely_valid').length;
        const suspicious = results.filter(r => r.status === 'suspicious').length;
        const likelyInvalid = results.filter(r => r.status === 'likely_invalid').length;

        return NextResponse.json({
            campaignId,
            campaignName: campaign.name,
            totalRecipients: recipients.length,
            summary: {
                likely_valid: likelyValid,
                suspicious: suspicious,
                likely_invalid: likelyInvalid,
                validPercentage: Math.round((likelyValid / recipients.length) * 100)
            },
            // Show worst emails first
            likely_invalid: results.filter(r => r.status === 'likely_invalid'),
            suspicious: results.filter(r => r.status === 'suspicious'),
            // Don't show all valid ones to keep response small
            sample_valid: results.filter(r => r.status === 'likely_valid').slice(0, 10)
        });

    } catch (err) {
        console.error('Verification error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
