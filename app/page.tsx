'use client';

import { useState } from 'react';
import TitleInput from '@/components/TitleInput';
import FolderSelect from '@/components/FolderSelect';
import SessionStart from '@/components/SessionStart';
import TimerView from '@/components/TimerView';
import SessionEnd from '@/components/SessionEnd';

type Step = 'title' | 'folder' | 'session' | 'timer' | 'end';

interface LogEntry {
    interval: number;
    timestamp: string;
    content: string;
}

interface SessionData {
    taskTitle: string;
    folderName: string;
    description: string;
    sessionNumber: number;
    sessionStartTime: Date;
    logs: LogEntry[];
    totalDuration: number;
}

export default function Home() {
    const [step, setStep] = useState<Step>('title');
    const [sessionData, setSessionData] = useState<SessionData>({
        taskTitle: '',
        folderName: '',
        description: '',
        sessionNumber: 1,
        sessionStartTime: new Date(),
        logs: [],
        totalDuration: 0,
    });
    const [terminated, setTerminated] = useState(false);

    const handleTitleSubmit = (title: string) => {
        setSessionData((prev) => ({ ...prev, taskTitle: title }));
        setStep('folder');
    };

    const handleFolderSelect = (folder: string) => {
        setSessionData((prev) => ({ ...prev, folderName: folder }));
        setStep('session');
    };

    const handleSessionStart = (description: string, sessionNumber: number) => {
        setSessionData((prev) => ({
            ...prev,
            description,
            sessionNumber,
            sessionStartTime: new Date(),
        }));
        setStep('timer');
    };

    const handleEndSession = (logs: LogEntry[], totalDuration: number) => {
        setSessionData((prev) => ({ ...prev, logs, totalDuration }));
        setStep('end');
    };

    const handleTerminate = () => {
        setTerminated(true);
    };

    if (terminated) {
        return (
            <main className="container">
                <div className="card">
                    <h1 className="success">GOODBYE</h1>
                    <p className="text-small mt-2" style={{ color: 'var(--text-secondary)' }}>
                        You may now close this window.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="container">
            {step === 'title' && <TitleInput onSubmit={handleTitleSubmit} />}

            {step === 'folder' && (
                <FolderSelect
                    onSelect={handleFolderSelect}
                    onBack={() => setStep('title')}
                />
            )}

            {step === 'session' && (
                <SessionStart
                    taskTitle={sessionData.taskTitle}
                    folderName={sessionData.folderName}
                    onStart={handleSessionStart}
                    onBack={() => setStep('folder')}
                />
            )}

            {step === 'timer' && (
                <TimerView
                    taskTitle={sessionData.taskTitle}
                    folderName={sessionData.folderName}
                    sessionNumber={sessionData.sessionNumber}
                    description={sessionData.description}
                    sessionStartTime={sessionData.sessionStartTime}
                    onEndSession={handleEndSession}
                />
            )}

            {step === 'end' && (
                <SessionEnd
                    taskTitle={sessionData.taskTitle}
                    folderName={sessionData.folderName}
                    sessionNumber={sessionData.sessionNumber}
                    description={sessionData.description}
                    sessionStartTime={sessionData.sessionStartTime}
                    logs={sessionData.logs}
                    totalDuration={sessionData.totalDuration}
                    onTerminate={handleTerminate}
                />
            )}
        </main>
    );
}
