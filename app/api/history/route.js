import { NextResponse } from 'next/server';
import { kvRead, kvDelete } from '@/lib/kv-storage';

export async function GET() {
    const history = await kvRead('sent');
    return NextResponse.json(history);
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await kvDelete('sent', id);
    return NextResponse.json({ success: true });
}
