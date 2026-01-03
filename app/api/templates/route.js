import { NextResponse } from 'next/server';
import { readData, writeData, appendData } from '@/lib/storage';

export async function GET() {
    const templates = await readData('templates');
    return NextResponse.json(templates);
}

export async function POST(req) {
    const template = await req.json();
    const newTemplate = await appendData('templates', template);
    return NextResponse.json(newTemplate);
}

export async function PUT(req) {
    const { id, ...updatedFields } = await req.json();
    const templates = await readData('templates');
    const index = templates.findIndex(t => t.id === id);

    if (index === -1) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    templates[index] = { ...templates[index], ...updatedFields, updatedAt: new Date().toISOString() };
    await writeData('templates', templates);
    return NextResponse.json(templates[index]);
}

export async function DELETE(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const templates = await readData('templates');
    const filtered = templates.filter(t => t.id !== id);
    await writeData('templates', filtered);
    return NextResponse.json({ success: true });
}
