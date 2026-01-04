import { smartAICall, logActivity } from './ai.js';
import { resend } from './resend.js';
import { readData, writeData, appendData } from './storage.js';
import dns from 'dns/promises';
import EmailValidator from 'email-deep-validator';

class CampaignRunner {
    constructor() {
        this.activeCampaigns = new Map(); // Store abort controllers
        this.runningLocks = new Set();    // Store campaign IDs currently in the loop
    }

    async start(campaignId) {
        if (this.activeCampaigns.has(campaignId)) {
            console.log(`[Runner] Campaign ${campaignId} is already running.`);
            return;
        }

        const controller = new AbortController();
        this.activeCampaigns.set(campaignId, controller);

        console.log(`[Runner] Starting campaign: ${campaignId}`);
        this.runLoop(campaignId, controller.signal);
    }

    async pause(campaignId) {
        if (this.activeCampaigns.has(campaignId)) {
            console.log(`[Runner] Pausing campaign: ${campaignId}`);
            this.activeCampaigns.get(campaignId).abort();
            this.activeCampaigns.delete(campaignId);

            const campaigns = await readData('campaigns');
            const index = campaigns.findIndex(c => c.id === campaignId);
            if (index !== -1) {
                campaigns[index].status = 'paused';
                campaigns[index].updatedAt = new Date().toISOString();
                await writeData('campaigns', campaigns);
            }
        }
    }

    async stop(campaignId) {
        this.pause(campaignId);
        // Clear progress if needed, but usually we just pause/reset.
    }

    async runLoop(campaignId, signal) {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        try {
            while (!signal.aborted) {
                const campaigns = await readData('campaigns');
                const campaignIndex = campaigns.findIndex(c => c.id === campaignId);

                if (campaignIndex === -1) {
                    console.error(`[Runner] Campaign ${campaignId} not found.`);
                    this.activeCampaigns.delete(campaignId);
                    return;
                }

                const campaign = campaigns[campaignIndex];

                // If campaign was paused/stopped elsewhere
                if (campaign.status === 'paused' || campaign.status === 'stopped' || campaign.status === 'completed') {
                    console.log(`[Runner] Campaign ${campaignId} is in status: ${campaign.status}. Stopping runner.`);
                    this.activeCampaigns.delete(campaignId);
                    this.runningLocks.delete(campaignId);
                    return;
                }

                if (signal.aborted) return;

                const recipients = campaign.recipients || [];
                const currentIndex = campaign.currentIndex || 0;

                if (currentIndex >= recipients.length) {
                    console.log(`[Runner] Campaign ${campaignId} completed.`);
                    const updatedCampaigns = await readData('campaigns');
                    const idx = updatedCampaigns.findIndex(c => c.id === campaignId);
                    if (idx !== -1) {
                        updatedCampaigns[idx].status = 'completed';
                        updatedCampaigns[idx].updatedAt = new Date().toISOString();
                        await writeData('campaigns', updatedCampaigns);
                    }
                    this.activeCampaigns.delete(campaignId);
                    this.runningLocks.delete(campaignId);
                    return;
                }

                // ACQUIRE LOCK for this iteration
                if (this.runningLocks.has(campaignId)) {
                    console.log(`[Runner] Another loop iteration is already processing ${campaignId}. Waiting...`);
                    await delay(3000);
                    continue;
                }
                this.runningLocks.add(campaignId);

                try {
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

                    // Helper to log activity
                    const logActivity = async (step, status, message) => {
                        console.log(`[Runner] ${step}: ${message}`);
                        const freshCampaigns = await readData('campaigns');
                        const freshIdx = freshCampaigns.findIndex(c => c.id === campaignId);
                        if (freshIdx !== -1) {
                            if (!freshCampaigns[freshIdx].logs) freshCampaigns[freshIdx].logs = [];
                            freshCampaigns[freshIdx].logs.unshift({
                                timestamp: new Date().toISOString(),
                                recipient: recipient.email,
                                step,
                                status,
                                message
                            });
                            if (freshCampaigns[freshIdx].logs.length > 100) {
                                freshCampaigns[freshIdx].logs = freshCampaigns[freshIdx].logs.slice(0, 100);
                            }
                            await writeData('campaigns', freshCampaigns);
                        }
                    };

                    console.log(`[Runner] ══════════════════════════════════════`);
                    console.log(`[Runner] Processing ${currentIndex + 1}/${recipients.length}: ${recipient.email}`);
                    await logActivity('START', 'processing', `Starting email ${currentIndex + 1}/${recipients.length}`);

                    // 1. Strict Email Validator
                    const emailLocal = recipient.email.split('@')[0].toLowerCase();
                    const emailDomainPart = recipient.email.split('@')[1]?.toLowerCase();
                    let emailScore = 100;
                    const emailIssues = [];

                    if (!recipient.email.includes('@') || !emailDomainPart) {
                        emailScore = 0;
                        emailIssues.push('Invalid email format');
                    }

                    const badPrefixes = ['general.', 'manager.', 'director.', 'hotel.', 'hospitality.', 'ervaren.', 'seasoned.', 'cluster.', 'founder.', 'vice.', 'senior.', 'people-centric.', 'commercial.', 'brand.', 'high.', 'experience.', 'restaurant.', 'assistent.', 'nh.', 'mercure.', 'avani.', 'accountmanager.', 'gm.', 'agm.', 'ceo.', 'cfo.', 'hr.', 'it.', 'pr.', 'sales.', 'marketing.', 'info.', 'contact.', 'reservations.', 'front.', 'back.', 'f&b.', 'food.', 'revenue.', 'owner.', 'president.', 'chef.', 'executive.', 'managing.', 'area.', 'regional.', 'corporate.', 'head.', 'chief.'];
                    for (const prefix of badPrefixes) {
                        if (emailLocal.startsWith(prefix)) {
                            emailScore -= 60;
                            emailIssues.push(`Bad prefix: ${prefix}`);
                            break;
                        }
                    }

                    if (emailScore < 50) {
                        await logActivity('BLOCKED', 'skipped', `Email quality too low: ${emailIssues.join(', ')}`);
                        // Increment index and save
                        const updatedCampaigns = await readData('campaigns');
                        const idx = updatedCampaigns.findIndex(c => c.id === campaignId);
                        if (idx !== -1) {
                            updatedCampaigns[idx].currentIndex = currentIndex + 1;
                            await writeData('campaigns', updatedCampaigns);
                        }
                        continue;
                    }

                    // 2. MX Record Check
                    const emailDomain = recipient.email.split('@')[1];
                    const trustedDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'marriott.com', 'hilton.com', 'accor.com', 'ihg.com', 'hyatt.com', 'radissonhotels.com', 'vfrb.nl', 'westcordhotels.nl', 'postillionhotels.com', 'bilderberg.nl', 'fletcher.nl', 'carlton.nl', 'nh-hotels.com'];

                    let domainValid = true;
                    if (!trustedDomains.includes(emailDomain.toLowerCase())) {
                        try {
                            const mxRecords = await dns.resolveMx(emailDomain);
                            if (!mxRecords || mxRecords.length === 0) domainValid = false;
                        } catch (mxErr) {
                            if (mxErr.code === 'ENOTFOUND' || mxErr.code === 'ENODATA') domainValid = false;
                        }
                    }

                    if (!domainValid) {
                        await logActivity('BLOCKED', 'skipped', `Invalid domain: ${emailDomain}`);
                        const updatedCampaigns = await readData('campaigns');
                        const idx = updatedCampaigns.findIndex(c => c.id === campaignId);
                        if (idx !== -1) {
                            updatedCampaigns[idx].currentIndex = currentIndex + 1;
                            await writeData('campaigns', updatedCampaigns);
                        }
                        continue;
                    }

                    // 3. SMTP Check
                    await logActivity('SMTP_CHECK', 'checking', `Verifying mailbox...`);
                    let mailboxExists = true;
                    try {
                        const emailValidator = new EmailValidator();
                        const { validMailbox } = await emailValidator.verify(recipient.email);
                        if (validMailbox === false) mailboxExists = false;
                    } catch (smtpErr) {
                        // ignore smtp errors
                    }

                    if (!mailboxExists) {
                        await logActivity('BLOCKED', 'skipped', `Mailbox does not exist`);
                        const updatedCampaigns = await readData('campaigns');
                        const idx = updatedCampaigns.findIndex(c => c.id === campaignId);
                        if (idx !== -1) {
                            updatedCampaigns[idx].currentIndex = currentIndex + 1;
                            await writeData('campaigns', updatedCampaigns);
                        }
                        continue;
                    }

                    // 4. AI Generation & Send
                    let finalSubject = campaign.template?.subject || '';
                    let finalBody = campaign.template?.content || '';

                    if (campaign.agentId) {
                        await logActivity('AI_GENERATE', 'generating', `Creating personalized email...`);
                        let prompt = `### PERSONA
${agent?.definition}

### RECIPIENT DATA (Use ALL of this naturally in the email)
- Full Name: ${recipient.name}
- Hotel/Company: ${recipient.company}
- Job Title: ${recipient.title}
- Location: ${recipient.location}
- Email: ${recipient.email}
- Raw Context: ${JSON.stringify(recipient._raw || {}, null, 2)}

### SUBJECT LINE RULES (CRITICAL)
Your subject must follow this formula: [Operational friction] + [time moment]
NO solutions, NO promises, NO consulting-speak.

✅ GOOD EXAMPLES:
- "Wat pas na vertrek duidelijk wordt"
- "Wanneer VIP-herkenning niet vooraf geborgd is"
- "Een operationele blinde vlek vóór check-in"
- "An Operational Blind Spot in VIP Recognition"
- "Waar VIP-erkenning operationeel wringt"

❌ FORBIDDEN in subjects:
- "Optimalisatie" / "Optimization" 
- Project-speak like "bij [Hotel Name]" at the end
- Thought leadership terms like "Operational Empathy"

### EMAIL BODY RULES
1. GREETING: Vary between "Beste", "Dag", "Hallo", "Goedemiddag" + first name. NOT always "Beste".
2. STRUCTURE: Exactly 3 short paragraphs, each separated by DOUBLE line break (<br/><br/>):
   - Paragraph 1: Greeting + concrete operational friction mentioning "${recipient.company}"
   - Paragraph 2: The consequence (loss of control, blind spot, or operational impact)
   - Paragraph 3: A single question as CTA (this is where you END)
3. TONE: Senior consultant observing. Zero sales, zero fluff.
4. LANGUAGE: Dutch if NL/BE. German if DACH. French if FR. Otherwise English.
5. ENDING: The email ends EXACTLY on the question. NO closing, NO signature, NO name. The question mark is the last character.

### OUTPUT FORMAT (use <br/><br/> between paragraphs)
Respond with ONLY a valid JSON object:
{
  "subject": "Subject following the formula",
  "content": "Greeting,<br/><br/>Friction paragraph.<br/><br/>Consequence paragraph.<br/><br/>Question?"
}`;

                        let attempts = 0;
                        let validated = false;
                        let personalizedResult = null;

                        while (attempts < 2 && !validated) {
                            attempts++;
                            try {
                                const response = await smartAICall('research_synthesis', [{ role: 'user', content: prompt }], { jsonMode: true });
                                let personalized;
                                try {
                                    personalized = JSON.parse(response.content);
                                } catch (e) {
                                    const match = response.content.match(/\{[\s\S]*\}/);
                                    if (match) personalized = JSON.parse(match[0]);
                                    else throw e;
                                }

                                // Validation
                                const validationPrompt = `Quality check this email:
Subject: ${personalized.subject}
Content: ${personalized.content}

Checklist:
1. Subject friction+time? (no "optimalisatie")
2. Spacing with <br/><br/>?
3. Ends exactly on ? mark? (no signature/name)
4. Mentioned ${recipient.company}?

Respond JSON: { "valid": true/false, "issues": [] }`;

                                const vResp = await smartAICall('research_synthesis', [{ role: 'user', content: validationPrompt }], { jsonMode: true });
                                const vResult = JSON.parse(vResp.content);

                                if (vResult.valid) {
                                    validated = true;
                                    personalizedResult = personalized;
                                    await logActivity('AI_VALIDATE', 'passed', `Valid email on attempt ${attempts}`);
                                } else {
                                    await logActivity('AI_VALIDATE', 'retry', `Attempt ${attempts} failed: ${vResult.issues?.join(', ')}`);
                                    prompt += `\n\n### FIX ISSUES:\n${vResult.issues?.join(', ')}`;
                                }
                            } catch (e) {
                                await logActivity('AI_GENERATE', 'error', `Attempt ${attempts} failed: ${e.message}`);
                            }
                        }

                        if (!personalizedResult) {
                            await logActivity('BLOCKED', 'skipped', `AI failed to generate valid email`);
                            const updatedCampaigns = await readData('campaigns');
                            const idx = updatedCampaigns.findIndex(c => c.id === campaignId);
                            if (idx !== -1) {
                                updatedCampaigns[idx].currentIndex = currentIndex + 1;
                                await writeData('campaigns', updatedCampaigns);
                            }
                            continue;
                        }

                        finalSubject = personalizedResult.subject;
                        finalBody = personalizedResult.content;
                    }

                    const htmlContent = `
                        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; font-size: 16px;">
                            ${finalBody}
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666;">
                                ${signature.replace(/\n/g, '<br/>')}
                            </div>
                        </div>
                    `;

                    await logActivity('SENDING', 'sending', `Sending to ${recipient.email}...`);
                    const { data, error } = await resend.emails.send({
                        from: `${senderName} <${defaultSender}>`,
                        to: [recipient.email],
                        subject: finalSubject,
                        html: htmlContent
                    });

                    if (error) throw error;

                    await logActivity('SENT', 'success', `✅ Delivered! ID: ${data.id}`);

                    // SAVE PROGRESS
                    const updatedCampaigns = await readData('campaigns');
                    const idx = updatedCampaigns.findIndex(c => c.id === campaignId);
                    if (idx !== -1) {
                        updatedCampaigns[idx].currentIndex = currentIndex + 1;
                        updatedCampaigns[idx].sentCount = (updatedCampaigns[idx].sentCount || 0) + 1;
                        updatedCampaigns[idx].updatedAt = new Date().toISOString();
                        await writeData('campaigns', updatedCampaigns);
                    }

                    await appendData('sent', {
                        resendId: data.id,
                        from: defaultSender,
                        to: recipient.email,
                        subject: finalSubject,
                        html: htmlContent,
                        status: 'sent',
                        campaignId: campaignId
                    });

                } catch (err) {
                    await logActivity('ERROR', 'failed', `Error: ${err.message}`);
                    const updatedCampaigns = await readData('campaigns');
                    const idx = updatedCampaigns.findIndex(c => c.id === campaignId);
                    if (idx !== -1) {
                        updatedCampaigns[idx].currentIndex = currentIndex + 1;
                        await writeData('campaigns', updatedCampaigns);
                    }
                } finally {
                    this.runningLocks.delete(campaignId);
                }

                await delay(settings?.delaySeconds ? settings.delaySeconds * 1000 : 5000);
            }
        } catch (err) {
            console.error(`[Runner] Critical break for ${campaignId}:`, err);
            this.runningLocks.delete(campaignId);
        }
    }
}

const globalForRunner = global;
const runner = globalForRunner.campaignRunner || new CampaignRunner();
if (process.env.NODE_ENV !== 'production') globalForRunner.campaignRunner = runner;

export default runner;
