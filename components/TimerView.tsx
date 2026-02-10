'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface LogEntry {
    interval: number;
    timestamp: string;
    content: string;
}

interface TimerViewProps {
    taskTitle: string;
    folderName: string;
    sessionNumber: number;
    description: string;
    sessionStartTime: Date;
    onEndSession: (logs: LogEntry[], totalDuration: number) => void;
}

export default function TimerView({
    taskTitle,
    folderName,
    sessionNumber,
    description,
    sessionStartTime,
    onEndSession,
}: TimerViewProps) {
    const [timeRemaining, setTimeRemaining] = useState(15 * 60); // 15 minutes in seconds
    const [totalElapsed, setTotalElapsed] = useState(0);
    const [intervalNumber, setIntervalNumber] = useState(1);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [showLogPopup, setShowLogPopup] = useState(false);
    const [popupTimeRemaining, setPopupTimeRemaining] = useState(50);
    const [currentLog, setCurrentLog] = useState('');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio
    useEffect(() => {
        audioRef.current = new Audio('/notification.mp3');
    }, []);

    // Main timer
    useEffect(() => {
        if (showLogPopup) return;

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    // Timer reached 0, play sound and show popup
                    audioRef.current?.play().catch(console.error);
                    setShowLogPopup(true);
                    setPopupTimeRemaining(50);
                    return 15 * 60;
                }
                return prev - 1;
            });
            setTotalElapsed((prev) => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [showLogPopup]);

    // Popup timer
    useEffect(() => {
        if (!showLogPopup) return;

        const timer = setInterval(() => {
            setPopupTimeRemaining((prev) => {
                if (prev <= 1) {
                    // Popup timer expired, save log and close
                    saveLog();
                    return 50;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [showLogPopup]);

    const saveLog = useCallback(() => {
        const newLog: LogEntry = {
            interval: intervalNumber,
            timestamp: new Date().toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
            }),
            content: currentLog.trim() || '[No log entered]',
        };
        setLogs((prev) => [...prev, newLog]);
        setIntervalNumber((prev) => prev + 1);
        setCurrentLog('');
        setShowLogPopup(false);
    }, [currentLog, intervalNumber]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m ${secs}s`;
        }
        return `${mins}m ${secs}s`;
    };

    const getTimerClass = () => {
        if (timeRemaining <= 60) return 'timer-display danger';
        if (timeRemaining <= 180) return 'timer-display warning';
        return 'timer-display';
    };

    const handleEndSession = () => {
        if (window.confirm('Are you sure you want to end this session?')) {
            onEndSession(logs, totalElapsed);
        }
    };

    const progressPercent = ((15 * 60 - timeRemaining) / (15 * 60)) * 100;

    return (
        <>
            <div className="card">
                <h3>SESSION #{sessionNumber} • {folderName}</h3>
                <h2>{taskTitle}</h2>

                <div className={getTimerClass()}>
                    {formatTime(timeRemaining)}
                </div>

                <div className="progress-container">
                    <div
                        className="progress-bar"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                <div className="session-info">
                    <p><span>INTERVAL:</span> {intervalNumber}</p>
                    <p><span>TOTAL TIME:</span> {formatDuration(totalElapsed)}</p>
                    <p><span>LOGS SAVED:</span> {logs.length}</p>
                </div>

                <button className="btn btn-danger" onClick={handleEndSession}>
                    ⬛ END SESSION
                </button>
            </div>

            {showLogPopup && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h1>LOG YOUR PROGRESS</h1>
                        <h2>INTERVAL #{intervalNumber}</h2>

                        <div className={`timer-display ${popupTimeRemaining <= 10 ? 'danger' : 'warning'}`} style={{ fontSize: '2rem' }}>
                            {popupTimeRemaining}s
                        </div>

                        <div className="mt-1">
                            <textarea
                                value={currentLog}
                                onChange={(e) => setCurrentLog(e.target.value)}
                                placeholder="What did you accomplish in the last 15 minutes?"
                                autoFocus
                                style={{ minHeight: '100px' }}
                            />
                        </div>

                        <div className="mt-1">
                            <button className="btn btn-primary" onClick={saveLog}>
                                SAVE LOG
                            </button>
                        </div>

                        <p className="text-small mt-1" style={{ color: 'var(--text-secondary)' }}>
                            Auto-saving in {popupTimeRemaining} seconds...
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
