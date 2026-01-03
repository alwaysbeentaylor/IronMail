import { NextResponse } from 'next/server';
import { kvRead, kvDelete } from '@/lib/kv-storage';

export async function GET() {
    const inbox = await kvRead('inbox');
    return NextResponse.json(inbox);
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await kvDelete('inbox', id);
    return NextResponse.json({ success: true });
}
