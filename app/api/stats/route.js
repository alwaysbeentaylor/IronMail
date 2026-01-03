import { NextResponse } from 'next/server';
import { readData } from '@/lib/storage';

export async function GET() {
    try {
        const sent = await readData('sent');
        const inbox = await readData('inbox');
        const templates = await readData('templates');

        return NextResponse.json({
            sentCount: sent.length,
            inboxCount: inbox.length,
            templateCount: templates.length,
            recentActivity: sent.slice(0, 5)
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
