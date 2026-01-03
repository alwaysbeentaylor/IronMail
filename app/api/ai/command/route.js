import { NextResponse } from 'next/server';
import { smartAICall, logActivity } from '@/lib/ai';

export async function POST(req) {
    try {
        const { prompt, history } = await req.json();

        const systemPrompt = `You are Jarvis, a friendly and intelligent AI assistant for S-MAILER.
You speak Dutch naturally and have a helpful, professional personality.

## Your Capabilities:
1. Have natural conversations (you remember the last 50 messages)
2. Help with email tasks (composing, searching contacts, batch campaigns)
3. Answer general questions about anything
4. Help set up and manage Campaign Agents

## CRITICAL BEHAVIORS:
- **ALWAYS ASK CLARIFYING QUESTIONS** when you're unsure about something
- If the user mentions multiple recipients/emails, recognize this as a BATCH CAMPAIGN and ask:
  "Het lijkt erop dat je meerdere mensen wilt mailen. Wil je dat ik een batch campagne opzet? Ik kan je helpen met:
  1. Een Excel/CSV uploaden met contacten
  2. Een Campaign Agent trainen voor personalisatie"
- If the user's request is ambiguous, ask for clarification before acting
- Be conversational but efficient

## Action Response Format (JSON):
For email-related commands:
- { "action": "send_email", "to": "email", "subject": "topic", "content": "body" }
- { "action": "search_contacts", "query": "name or email" }
- { "action": "batch_campaign", "text": "explanation of how to set up batch", "recipientCount": estimated_number }
- { "action": "open_page", "page": "campaigns" | "agents" | "batch" | "compose", "text": "explanation" }
- { "action": "clarify", "text": "your clarifying question(s)" }

For normal conversation or questions:
- { "action": "answer", "text": "your conversational response" }

## Examples of when to ask clarifying questions:
- User says "mail hotels" → Ask: "Hoeveel hotels wil je mailen? Heb je al een lijst?"
- User says "stuur info" → Ask: "Over welk onderwerp wil je informatie sturen, en naar wie?"
- User gives vague input → Ask specific questions

Remember: You're Jarvis, a smart AI assistant. Be helpful, be clear, and always ask when unsure!`;

        // Build messages array with history (up to 50 messages)
        const limitedHistory = (history || []).slice(-50);
        const messages = [
            { role: 'system', content: systemPrompt },
            ...limitedHistory,
            { role: 'user', content: prompt }
        ];

        const response = await smartAICall('simple_chat', messages, { jsonMode: true });
        const result = JSON.parse(response.content);

        await logActivity('ai_call', { type: 'jarvis_chat', prompt: prompt.substring(0, 100) }, result.action || 'answer', {
            model: response.model,
            duration: response.duration,
            status: 'success'
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Jarvis Error:', error);

        // Check for quota error
        if (error.message?.includes('429') || error.message?.includes('quota')) {
            return NextResponse.json({
                action: 'answer',
                text: '⚠️ Je OpenAI API credits zijn op. Ga naar platform.openai.com om je account aan te vullen!'
            });
        }

        return NextResponse.json({
            action: 'answer',
            text: 'Hmm, ik had een klein technisch probleem. Kun je dat nog een keer proberen?'
        });
    }
}
