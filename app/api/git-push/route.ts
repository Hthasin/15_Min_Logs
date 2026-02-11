import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

export async function POST(request: Request) {
    try {
        const { folder, sessionNumber, taskTitle, date } = await request.json();

        if (!folder || !sessionNumber || !taskTitle) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const commitMessage = `Work Session #${sessionNumber} - ${taskTitle} - ${date}`;
        const cwd = process.cwd();
        const folderPath = join(cwd, 'work_sessions', folder);

        // Check if folder exists
        if (!existsSync(folderPath)) {
            return NextResponse.json({ error: `Folder not found: ${folderPath}` }, { status: 400 });
        }

        // Remove stale lock file if it exists
        const lockFile = join(cwd, '.git', 'index.lock');
        if (existsSync(lockFile)) {
            const { unlinkSync } = require('fs');
            try { unlinkSync(lockFile); } catch { }
        }

        // Git add
        try {
            await execAsync(`git add -A "work_sessions/${folder}/"`, { cwd });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Git add error:', errorMessage);
            return NextResponse.json({ error: `Failed to stage files: ${errorMessage}` }, { status: 500 });
        }

        // Git commit
        try {
            await execAsync(`git commit -m "${commitMessage}"`, { cwd });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Check if it's "nothing to commit"
            if (errorMessage.includes('nothing to commit') || errorMessage.includes('no changes')) {
                return NextResponse.json({ success: true, message: 'No changes to commit' });
            }
            console.error('Git commit error:', errorMessage);
            return NextResponse.json({ error: `Failed to commit: ${errorMessage}` }, { status: 500 });
        }

        // Git push
        try {
            const { stdout } = await execAsync('git push', { cwd });
            console.log('Git push output:', stdout);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Git push error:', errorMessage);
            return NextResponse.json({ error: `Failed to push: ${errorMessage}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Successfully pushed to GitHub' });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Git push error:', errorMessage);
        return NextResponse.json({ error: `Failed to push to GitHub: ${errorMessage}` }, { status: 500 });
    }
}

