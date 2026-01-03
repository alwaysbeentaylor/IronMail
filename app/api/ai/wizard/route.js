import { NextResponse } from 'next/server';
import { smartAICall } from '@/lib/ai';

export async function POST(req) {
    try {
        const { message, history, currentConfig } = await req.json();

        const systemPrompt = `You are an AI Agent Creation Wizard. Your job is to help users create Campaign Agents through conversation.

An Agent needs these fields:
- name: Agent's name (e.g., "Hotel GM Outreach")
- industry: Target industry (e.g., "Hotels", "SaaS")
- definition: Natural language persona and goals
- keyColumns: Object mapping expected data columns to fields (e.g., {"gm_name": "General Manager Name", "hotel": "Hotel Name"})
- researchStrategy: { enabled: true/false, sources: ["linkedin", "news"], prompt: "What to research" }
- emailConfig: { tone: "formal" or "casual", language: "nl" or "en", signature: true/false }
- fallbackBehavior: What to do when research fails

Current config so far: ${JSON.stringify(currentConfig || {})}

Your response MUST be valid JSON:
{
  "response": "Your conversational message to the user",
  "config": { ...updated agent config based on conversation },
  "complete": false (set to true only when all required fields are filled)
}

Be conversational but professional. Ask clarifying questions if needed. Once you have enough info, confirm the agent config and set complete to true.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.text })),
            { role: 'user', content: message }
        ];

        const result = await smartAICall('agent_creation', messages, { jsonMode: true });
        const parsed = JSON.parse(result.content);

        return NextResponse.json(parsed);
    } catch (error) {
        console.error('Wizard error:', error);
        return NextResponse.json({
            response: 'Er ging iets mis. Probeer het opnieuw.',
            config: null,
            complete: false
        });
    }
}
