import { NextResponse } from 'next/server';
import { readdirSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const WORK_SESSIONS_DIR = join(process.cwd(), 'work_sessions');

// Ensure work_sessions directory exists
if (!existsSync(WORK_SESSIONS_DIR)) {
    mkdirSync(WORK_SESSIONS_DIR, { recursive: true });
}

export async function GET() {
    try {
        const entries = readdirSync(WORK_SESSIONS_DIR, { withFileTypes: true });
        const folders = entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort();

        return NextResponse.json({ folders });
    } catch (error) {
        console.error('Error reading folders:', error);
        return NextResponse.json({ folders: [] });
    }
}

export async function POST(request: Request) {
    try {
        const { name } = await request.json();

        if (!name) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }

        // Sanitize folder name
        const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const folderPath = join(WORK_SESSIONS_DIR, safeName);

        if (!existsSync(folderPath)) {
            mkdirSync(folderPath, { recursive: true });
        }

        return NextResponse.json({ success: true, folder: safeName });
    } catch (error) {
        console.error('Error creating folder:', error);
        return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
    }
}
