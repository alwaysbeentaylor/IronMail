import { smartAICall } from './ai.js';
import { resend } from './resend.js';
import { readData, writeData, appendData } from './storage.js';
import dns from 'dns/promises';
import EmailValidator from 'email-deep-validator';

// =============================================================================
// ZOMBIE PROTECTION SYSTEM
// =============================================================================
// We use a global version and a map of active run IDs.
// If a loop's runID doesn't match the current active runID for that campaign, 
// the loop terminates immediately. This kills "ghost" runners from old code.
if (!global._executionVersions) global._executionVersions = new Map();
if (!global._activeControllers) global._activeControllers = new Map();

class CampaignRunner {
    constructor() {
        this.activeControllers = global._activeControllers;
        this.executionVersions = global._executionVersions;
        this.version = "3.0.0-ZOMBIE-PROOF";
    }

    async start(campaignId) {
        // 1. Kill any existing controller for this campaign ID
        if (this.activeControllers.has(campaignId)) {
            console.log(`[Runner] Killing existing zombie for campaign ${campaignId}...`);
            this.activeControllers.get(campaignId).abort();
            this.activeControllers.delete(campaignId);
        }

        // 2. Increment version - this renders all older loops invalid
        const newVersion = (this.executionVersions.get(campaignId) || 0) + 1;
        this.executionVersions.set(campaignId, newVersion);

        const controller = new AbortController();
        this.activeControllers.set(campaignId, controller);

        console.log(`[Runner v${this.version}] >>> STARTING CAMPAIGN ${campaignId} (Version: ${newVersion})`);

        // Use a background call but with version check
        this.runLoop(campaignId, newVersion, controller.signal);
    }

    async pause(campaignId) {
        if (this.activeControllers.has(campaignId)) {
            this.activeControllers.get(campaignId).abort();
            this.activeControllers.delete(campaignId);
        }

        // Update DB status
        const campaigns = await readData('campaigns');
        const idx = campaigns.findIndex(c => c.id === campaignId);
        if (idx !== -1) {
            campaigns[idx].status = 'paused';
            campaigns[idx].updatedAt = new Date().toISOString();
            await writeData('campaigns', campaigns);
        }
    }

    async runLoop(campaignId, runVersion, signal) {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        try {
            while (!signal.aborted) {
                // STALENESS CHECK: If the global version has changed, this loop is a zombie.
                if (this.executionVersions.get(campaignId) !== runVersion) {
                    console.log(`[Runner] Loop ${runVersion} is now STALE. Terminating.`);
                    return;
                }

                // 1. Fetch Fresh State
                const campaignsList = await readData('campaigns');
                const campaignIndex = campaignsList.findIndex(c => c.id === campaignId);

                if (campaignIndex === -1 || signal.aborted) return;
                let campaign = campaignsList[campaignIndex];

                // 2. DB Status Check
                if (campaign.status !== 'processing') {
                    console.log(`[Runner] Campaign status is ${campaign.status}. Stopping loop.`);
                    return;
                }

                const recipients = campaign.recipients || [];
                const currentIndex = campaign.currentIndex || 0;

                if (currentIndex >= recipients.length) {
                    campaign.status = 'completed';
                    campaign.updatedAt = new Date().toISOString();
                    await writeData('campaigns', campaignsList);
                    return;
                }

                const recipient = recipients[currentIndex];
                const settings = await readData('settings');
                const defaultSender = settings.defaultSender || 'info@knowyourvip.com';
                const senderName = settings.senderName || 'S-MAILER';
                const signature = settings.signature || '';

                // Load agent
                let agent = null;
                if (campaign.agentId) {
                    const agents = await readData('agents');
                    agent = agents.find(a => a.id === campaign.agentId);
                }

                // Logging helper
                const logActivity = async (step, status, message) => {
                    console.log(`[Runner v${runVersion}] [${recipient.email}] ${step}: ${message}`);
                    if (!campaign.logs) campaign.logs = [];
                    campaign.logs.unshift({
                        timestamp: new Date().toISOString(),
                        recipient: recipient.email,
                        step, status, message
                    });
                    if (campaign.logs.length > 50) campaign.logs = campaign.logs.slice(0, 50);
                };

                // ---- PROCESSING STEPS ----
                await logActivity('VOORBEREIDEN', 'processing', `Analyse voor ${recipient.name}...`);
                await delay(1000);

                // 1. VALIDATIE (Strict)
                const emailLocal = recipient.email.split('@')[0].toLowerCase();
                const badPrefixes = ['general.', 'info.', 'contact.', 'manager.', 'sales.', 'marketing.', 'reservations.', 'front.'];

                let qualityIssues = [];
                if (badPrefixes.some(p => emailLocal.startsWith(p))) qualityIssues.push('Generiek adres (geblokkeerd)');
                if (!recipient.email.includes('@')) qualityIssues.push('Ongeldig format');

                if (qualityIssues.length > 0) {
                    await logActivity('GEBLOKKEERD', 'skipped', qualityIssues.join(', '));
                    campaign.currentIndex = currentIndex + 1;
                    await writeData('campaigns', campaignsList);
                    continue;
                }

                // 2. DNS/MX CHECK
                const domain = recipient.email.split('@')[1];
                let domainPass = true;
                try {
                    const mx = await dns.resolveMx(domain);
                    if (!mx || mx.length === 0) domainPass = false;
                } catch (e) {
                    if (e.code === 'ENOTFOUND' || e.code === 'ENODATA') domainPass = false;
                }
                if (!domainPass) {
                    await logActivity('GEBLOKKEERD', 'skipped', `Domein ${domain} niet bereikbaar.`);
                    campaign.currentIndex = currentIndex + 1;
                    await writeData('campaigns', campaignsList);
                    continue;
                }

                // 3. SMTP CHECK
                await logActivity('VERIFIEER', 'checking', `Box controle...`);
                let boxOk = true;
                try {
                    const v = new EmailValidator();
                    const r = await v.verify(recipient.email);
                    if (r.validMailbox === false) boxOk = false;
                } catch (e) { }
                if (!boxOk) {
                    await logActivity('GEBLOKKEERD', 'skipped', `Mailbox bestaat niet.`);
                    campaign.currentIndex = currentIndex + 1;
                    await writeData('campaigns', campaignsList);
                    continue;
                }

                // 4. LANGUAGE & AI
                let lang = 'English';
                const loc = (recipient.location || '').toLowerCase();
                const emD = (recipient.email || '').toLowerCase();
                if (loc.includes('germany') || loc.includes('deutschland') || emD.endsWith('.de') || emD.endsWith('.at')) lang = 'German';
                else if (loc.includes('netherlands') || loc.includes('nederland') || emD.endsWith('.nl')) lang = 'Dutch';
                else if (loc.includes('france') || emD.endsWith('.fr')) lang = 'French';

                await logActivity('AI_OPSTELLEN', 'generating', `Mail opstellen in het ${lang}...`);
                let finalSubject = campaign.template?.subject || '';
                let finalBody = campaign.template?.content || '';

                if (campaign.agentId) {
                    const prompt = `### PERSONA\n${agent?.definition}\n### RECIPIENT\n- Name: ${recipient.name}\n- Company: ${recipient.company}\n### LANGUAGE: ${lang}\n### RULES\n- Subject: [Friction] + [Time moment]\n- Body: 3 paragraphs, ends on ?. No name/signature.\nRespond JSON: { "subject": "...", "content": "..." }`;
                    try {
                        const res = await smartAICall('research_synthesis', [{ role: 'user', content: prompt }], { jsonMode: true });
                        const p = JSON.parse(res.content);
                        finalSubject = p.subject;
                        finalBody = p.content;
                    } catch (e) {
                        await logActivity('FOUT', 'failed', 'AI mislukt');
                        throw e;
                    }
                }

                // 5. SEND
                await logActivity('VERZENDEN', 'sending', `Verzenden...`);
                const html = `<div style="font-family:Arial; line-height:1.6; color:#1a1a1a;">${finalBody}<br/><br/>${signature.replace(/\n/g, '<br/>')}</div>`;

                const { data, error } = await resend.emails.send({
                    from: `${senderName} <${defaultSender}>`,
                    to: [recipient.email],
                    subject: finalSubject,
                    html: html
                });

                if (error) throw error;

                // 6. FINALIZE
                await logActivity('VOLTOOID', 'success', `✅ Verzonden!`);
                campaign.currentIndex = currentIndex + 1;
                campaign.sentCount = (campaign.sentCount || 0) + 1;
                campaign.updatedAt = new Date().toISOString();
                await writeData('campaigns', campaignsList);

                await appendData('sent', {
                    resendId: data.id,
                    to: recipient.email,
                    subject: finalSubject,
                    status: 'sent',
                    campaignId: campaignId
                });

                // Global delay
                const delayS = (settings?.delaySeconds || 10) * 1000;
                await delay(delayS);
            }
        } catch (err) {
            console.error(`[Runner v${runVersion}] Loop Error:`, err);
        }
    }
}

const runner = new CampaignRunner();
export default runner;
