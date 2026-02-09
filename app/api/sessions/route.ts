import { NextResponse } from 'next/server';
import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const WORK_SESSIONS_DIR = join(process.cwd(), 'work_sessions');

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const folder = searchParams.get('folder');

        if (!folder) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }

        const folderPath = join(WORK_SESSIONS_DIR, folder);

        if (!existsSync(folderPath)) {
            return NextResponse.json({ count: 0 });
        }

        const files = readdirSync(folderPath);
        const mdFiles = files.filter((file) => file.endsWith('.md'));

        return NextResponse.json({ count: mdFiles.length });
    } catch (error) {
        console.error('Error counting sessions:', error);
        return NextResponse.json({ count: 0 });
    }
}

export async function POST(request: Request) {
    try {
        const { folder, fileName, content } = await request.json();

        if (!folder || !fileName || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const folderPath = join(WORK_SESSIONS_DIR, folder);

        if (!existsSync(folderPath)) {
            mkdirSync(folderPath, { recursive: true });
        }

        const filePath = join(folderPath, fileName);
        writeFileSync(filePath, content, 'utf-8');

        return NextResponse.json({ success: true, path: filePath });
    } catch (error) {
        console.error('Error saving session:', error);
        return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
    }
}
