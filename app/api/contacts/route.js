import { NextResponse } from 'next/server';
import { readData } from '@/lib/storage';

export async function GET() {
    const contacts = await readData('contacts');
    return NextResponse.json(contacts);
}
