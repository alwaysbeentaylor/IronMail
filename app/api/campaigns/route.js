import { NextResponse } from 'next/server';
import { readData, writeData, appendData } from '@/lib/storage';

export async function GET() {
    const campaigns = await readData('campaigns');
    return NextResponse.json(campaigns);
}

export async function POST(req) {
    try {
        const campaign = await req.json();
        let campaigns = await readData('campaigns');

        const now = new Date().toISOString();

        if (campaign.id) {
            // Update existing campaign
            const index = campaigns.findIndex(c => c.id === campaign.id);
            if (index !== -1) {
                campaigns[index] = {
                    ...campaigns[index],
                    ...campaign,
                    updatedAt: now
                };
            }
        } else {
            // Create new campaign
            campaigns.unshift({
                id: crypto.randomUUID(),
                status: 'draft',
                createdAt: now,
                updatedAt: now,
                recipients: [],
                ...campaign
            });
        }

        await writeData('campaigns', campaigns);
        return NextResponse.json({ success: true, campaign: campaigns[0] });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save campaign' }, { status: 500 });
    }
}

export async function DELETE(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    let campaigns = await readData('campaigns');
    campaigns = campaigns.filter(c => c.id !== id);
    await writeData('campaigns', campaigns);

    return NextResponse.json({ success: true });
}
