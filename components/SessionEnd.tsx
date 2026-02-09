'use client';

import { useState } from 'react';

interface LogEntry {
    interval: number;
    timestamp: string;
    content: string;
}

interface SessionEndProps {
    taskTitle: string;
    folderName: string;
    sessionNumber: number;
    description: string;
    sessionStartTime: Date;
    logs: LogEntry[];
    totalDuration: number;
    onTerminate: () => void;
}

export default function SessionEnd({
    taskTitle,
    folderName,
    sessionNumber,
    description,
    sessionStartTime,
    logs,
    totalDuration,
    onTerminate,
}: SessionEndProps) {
    const [status, setStatus] = useState<'saving' | 'pushing' | 'success' | 'error'>('saving');
    const [errorMessage, setErrorMessage] = useState('');

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        const parts = [];
        if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
        if (mins > 0) parts.push(`${mins} minute${mins !== 1 ? 's' : ''}`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);

        return parts.join(', ');
    };

    const saveAndPush = async () => {
        try {
            // Generate markdown content
            const endTime = new Date();
            const dateStr = sessionStartTime.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
            const startTimeStr = sessionStartTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
            const endTimeStr = endTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });

            let markdown = `# Work Session #${sessionNumber} - ${taskTitle}\n\n`;
            markdown += `**Date:** ${dateStr}\n\n`;
            markdown += `**Time:** ${startTimeStr} - ${endTimeStr}\n\n`;
            markdown += `**Duration:** ${formatDuration(totalDuration)}\n\n`;
            markdown += `**Folder:** ${folderName}\n\n`;
            markdown += `**Description:** ${description}\n\n`;
            markdown += `---\n\n`;
            markdown += `## Session Logs\n\n`;

            if (logs.length === 0) {
                markdown += `*No logs recorded during this session.*\n\n`;
            } else {
                logs.forEach((log) => {
                    markdown += `### Interval ${log.interval} - ${log.timestamp}\n\n`;
                    markdown += `${log.content}\n\n`;
                });
            }

            markdown += `---\n\n`;
            markdown += `*Session ended at ${endTimeStr}*\n`;

            // Save markdown file
            setStatus('saving');
            const fileName = `session_${sessionNumber}_${sessionStartTime.toISOString().split('T')[0]}.md`;

            const saveRes = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folder: folderName,
                    fileName,
                    content: markdown,
                }),
            });

            if (!saveRes.ok) {
                throw new Error('Failed to save session file');
            }

            // Push to GitHub
            setStatus('pushing');
            const pushRes = await fetch('/api/git-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folder: folderName,
                    sessionNumber,
                    taskTitle,
                    date: sessionStartTime.toISOString().split('T')[0],
                }),
            });

            if (!pushRes.ok) {
                const data = await pushRes.json();
                throw new Error(data.error || 'Failed to push to GitHub');
            }

            setStatus('success');
        } catch (error) {
            console.error('Error:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
            setStatus('error');
        }
    };

    // Start save/push on mount
    useState(() => {
        saveAndPush();
    });

    const handleTerminate = () => {
        onTerminate();
        // Try to close window
        window.close();
        // If window.close() is blocked, just show the message
    };

    return (
        <div className="card">
            <h1>SESSION COMPLETE</h1>

            <div className="session-info">
                <p><span>TASK:</span> {taskTitle}</p>
                <p><span>FOLDER:</span> {folderName}</p>
                <p><span>SESSION:</span> #{sessionNumber}</p>
                <p><span>DURATION:</span> {formatDuration(totalDuration)}</p>
                <p><span>INTERVALS:</span> {logs.length > 0 ? logs.length : 0}</p>
            </div>

            {logs.length > 0 && (
                <div className="mt-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <h3 className="mb-1">SESSION LOGS</h3>
                    {logs.map((log, index) => (
                        <div key={index} className="log-entry">
                            <h4>Interval {log.interval} - {log.timestamp}</h4>
                            <p>{log.content}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-2">
                {status === 'saving' && (
                    <>
                        <div className="spinner"></div>
                        <p className="text-small">Saving session file...</p>
                    </>
                )}

                {status === 'pushing' && (
                    <>
                        <div className="spinner"></div>
                        <p className="text-small">Pushing to GitHub...</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <h2 className="success mb-1">✓ PUSHED TO GITHUB</h2>
                        <button className="btn btn-primary" onClick={handleTerminate}>
                            END PROGRAM
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <h2 className="error mb-1">✗ ERROR</h2>
                        <p className="text-small error mb-1">{errorMessage}</p>
                        <button className="btn btn-secondary" onClick={saveAndPush}>
                            RETRY
                        </button>
                        <button className="btn btn-primary" onClick={handleTerminate}>
                            END ANYWAY
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
