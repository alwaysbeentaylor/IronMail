import { NextResponse } from 'next/server';
import { smartAICall, logActivity } from '@/lib/ai';
import { readData } from '@/lib/storage';

export async function POST(req) {
    try {
        const { agentId, testData } = await req.json();

        // Get agent configuration
        const agents = await readData('agents');
        const agent = agents.find(a => a.id === agentId);

        if (!agent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        const results = [];

        for (const row of testData) {
            const prompt = `You are a Campaign Agent with this configuration:
Name: ${agent.name}
Industry: ${agent.industry}
Persona: ${agent.definition}
Tone: ${agent.emailConfig?.tone || 'professional'}
Language: ${agent.emailConfig?.language || 'nl'}

Data provided for this recipient:
${JSON.stringify(row, null, 2)}

Key columns to use: ${JSON.stringify(agent.keyColumns)}

${agent.researchStrategy?.enabled ? `Research instructions: ${agent.researchStrategy.prompt}` : 'No research needed.'}

Generate a personalized email for this recipient. Respond with JSON:
{
  "subject": "...",
  "body": "...",
  "fieldsUsed": ["list of data fields you used"],
  "confidence": 0.0-1.0,
  "researchApplied": true/false
}`;

            const response = await smartAICall('agent_testing', [
                { role: 'system', content: 'You are an expert email campaign agent.' },
                { role: 'user', content: prompt }
            ], { jsonMode: true });

            const parsed = JSON.parse(response.content);
            results.push({
                ...parsed,
                recipientData: row,
                model: response.model,
                duration: response.duration
            });
        }

        await logActivity('agent_test', { agentId, rowCount: testData.length }, { resultCount: results.length }, { status: 'success' });

        return NextResponse.json({ success: true, results });
    } catch (error) {
        console.error('Agent test error:', error);
        return NextResponse.json({ error: 'Agent test failed' }, { status: 500 });
    }
}
