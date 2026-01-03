import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/storage';

export async function GET() {
    const drafts = await readData('drafts');
    return NextResponse.json(drafts);
}

export async function POST(req) {
    try {
        const draft = await req.json();
        let drafts = await readData('drafts');

        // Update existing draft if ID exists, otherwise create new
        const index = drafts.findIndex(d => d.id === draft.id);
        if (index !== -1) {
            drafts[index] = { ...drafts[index], ...draft, updatedAt: new Date().toISOString() };
        } else {
            drafts.unshift({
                ...draft,
                id: draft.id || crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        await writeData('drafts', drafts);
        return NextResponse.json({ success: true, draft: drafts[0] });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
    }
}

export async function DELETE(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    let drafts = await readData('drafts');
    drafts = drafts.filter(d => d.id !== id);
    await writeData('drafts', drafts);

    return NextResponse.json({ success: true });
}
