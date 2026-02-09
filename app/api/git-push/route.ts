import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
    try {
        const { folder, sessionNumber, taskTitle, date } = await request.json();

        if (!folder || !sessionNumber || !taskTitle) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const commitMessage = `Work Session #${sessionNumber} - ${taskTitle} - ${date}`;
        const cwd = process.cwd();

        // Git add
        try {
            await execAsync(`git add work_sessions/${folder}/`, { cwd });
        } catch (error) {
            console.error('Git add error:', error);
            return NextResponse.json({ error: 'Failed to stage files' }, { status: 500 });
        }

        // Git commit
        try {
            await execAsync(`git commit -m "${commitMessage}"`, { cwd });
        } catch (error: unknown) {
            // Check if it's "nothing to commit"
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('nothing to commit')) {
                return NextResponse.json({ success: true, message: 'No changes to commit' });
            }
            console.error('Git commit error:', error);
            return NextResponse.json({ error: 'Failed to commit changes' }, { status: 500 });
        }

        // Git push
        try {
            await execAsync('git push', { cwd });
        } catch (error) {
            console.error('Git push error:', error);
            return NextResponse.json({ error: 'Failed to push to GitHub' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Successfully pushed to GitHub' });
    } catch (error) {
        console.error('Git push error:', error);
        return NextResponse.json({ error: 'Failed to push to GitHub' }, { status: 500 });
    }
}
