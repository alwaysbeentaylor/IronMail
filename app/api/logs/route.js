import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/storage';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit')) || 100;

    let logs = await readData('activity_logs');

    // Apply filters
    if (type) {
        logs = logs.filter(log => log.type === type);
    }
    if (status) {
        logs = logs.filter(log => log.status === status);
    }

    // Limit results
    logs = logs.slice(0, limit);

    return NextResponse.json(logs);
}

export async function DELETE(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
        let logs = await readData('activity_logs');
        logs = logs.filter(log => log.id !== id);
        await writeData('activity_logs', logs);
    } else {
        // Clear all logs
        await writeData('activity_logs', []);
    }

    return NextResponse.json({ success: true });
}
