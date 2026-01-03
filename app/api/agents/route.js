import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/storage';

export async function GET() {
    const agents = await readData('agents');
    return NextResponse.json(agents);
}

export async function POST(req) {
    try {
        const agent = await req.json();
        let agents = await readData('agents');

        const now = new Date().toISOString();

        if (agent.id) {
            // Update existing agent (creates new version)
            const index = agents.findIndex(a => a.id === agent.id);
            if (index !== -1) {
                agents[index] = {
                    ...agents[index],
                    ...agent,
                    version: (agents[index].version || 1) + 1,
                    updatedAt: now
                };
            }
        } else {
            // Create new agent
            agents.unshift({
                id: crypto.randomUUID(),
                version: 1,
                createdAt: now,
                updatedAt: now,
                ...agent
            });
        }

        await writeData('agents', agents);
        return NextResponse.json({ success: true, agent: agents[0] });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save agent' }, { status: 500 });
    }
}

export async function DELETE(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    let agents = await readData('agents');
    agents = agents.filter(a => a.id !== id);
    await writeData('agents', agents);

    return NextResponse.json({ success: true });
}
