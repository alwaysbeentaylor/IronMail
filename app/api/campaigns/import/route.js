import { NextResponse } from 'next/server';
import { smartAICall, logActivity } from '@/lib/ai';
import * as XLSX from 'xlsx';

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');
        const pastedData = formData.get('pastedData');

        let rawData = [];
        let source = 'paste';

        if (file) {
            // Parse Excel/CSV file
            const buffer = Buffer.from(await file.arrayBuffer());
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            rawData = XLSX.utils.sheet_to_json(sheet);
            source = file.name;
        } else if (pastedData) {
            // Parse pasted data (assume tab or comma separated)
            const lines = pastedData.split('\n').filter(l => l.trim());
            const headers = lines[0].split(/[,\t]/).map(h => h.trim());

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(/[,\t]/).map(v => v.trim());
                const row = {};
                headers.forEach((h, idx) => {
                    row[h] = values[idx] || '';
                });
                rawData.push(row);
            }
        }

        if (rawData.length === 0) {
            return NextResponse.json({ error: 'No data found' }, { status: 400 });
        }

        // AI Column Mapping
        const sampleRow = rawData[0];
        const headers = Object.keys(sampleRow);

        const mappingPrompt = `Given these column headers from an imported file: ${JSON.stringify(headers)}
        
And this sample row: ${JSON.stringify(sampleRow)}

Map these to standard fields. Respond with JSON:
{
  "mappings": {
    "name": "detected column for person's name or null",
    "email": "detected column for email address or null",
    "company": "detected column for company/organization or null",
    "title": "detected column for job title or null",
    "extra": ["list of other interesting columns"]
  },
  "confidence": 0.0-1.0,
  "suggestions": "any suggestions for improving the data"
}`;

        const mappingResult = await smartAICall('column_mapping', [
            { role: 'user', content: mappingPrompt }
        ], { jsonMode: true });

        const mapping = JSON.parse(mappingResult.content);

        // Transform data based on mapping
        const recipients = rawData.map(row => ({
            name: mapping.mappings.name ? row[mapping.mappings.name] : null,
            email: mapping.mappings.email ? row[mapping.mappings.email] : null,
            company: mapping.mappings.company ? row[mapping.mappings.company] : null,
            title: mapping.mappings.title ? row[mapping.mappings.title] : null,
            extra: mapping.mappings.extra?.reduce((acc, col) => {
                acc[col] = row[col];
                return acc;
            }, {}),
            _raw: row
        }));

        await logActivity('import', { source, rowCount: rawData.length }, { mappedCount: recipients.length }, { status: 'success' });

        return NextResponse.json({
            success: true,
            source,
            recipients,
            mapping,
            totalRows: rawData.length
        });
    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({ error: 'Import failed' }, { status: 500 });
    }
}
