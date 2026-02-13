'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const INTERVAL_DURATION = 15 * 60; // 15 minutes in seconds
const POPUP_DURATION = 50;          // 50 seconds for log popup

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
    const [timeRemaining, setTimeRemaining] = useState(INTERVAL_DURATION);
    const [totalElapsed, setTotalElapsed] = useState(0);
    const [intervalNumber, setIntervalNumber] = useState(1);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [showLogPopup, setShowLogPopup] = useState(false);
    const [popupTimeRemaining, setPopupTimeRemaining] = useState(POPUP_DURATION);
    const [currentLog, setCurrentLog] = useState('');
    const [volume, setVolume] = useState(0.7);
    const [isMuted, setIsMuted] = useState(false);
    const [showNotificationBanner, setShowNotificationBanner] = useState(false);
    const [notificationPermission, setNotificationPermission] = useState<string>('default');

    // Flag to trigger notifications outside the state updater
    const [shouldFireNotifications, setShouldFireNotifications] = useState(false);

    // Wall-clock timestamps — immune to browser tab throttling
    const timerEndRef = useRef(Date.now() + INTERVAL_DURATION * 1000);
    const sessionStartRef = useRef(Date.now());
    const popupEndRef = useRef(0);

    // Web Audio API refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBufferRef = useRef<AudioBuffer | null>(null);
    const audioUnlockedRef = useRef(false);

    // Ref to always have current saveLog without stale closures
    const saveLogRef = useRef<() => void>(() => { });

    // Request browser notification permission on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                setNotificationPermission('granted');
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then((perm) => {
                    setNotificationPermission(perm);
                });
            }
        }
    }, []);

    // Initialize Web Audio API and pre-load the sound file into a buffer
    useEffect(() => {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioContextRef.current = ctx;

        fetch('/notification.mp3')
            .then((res) => res.arrayBuffer())
            .then((buf) => ctx.decodeAudioData(buf))
            .then((decoded) => {
                audioBufferRef.current = decoded;
                console.log('Audio buffer loaded successfully');
            })
            .catch((err) => console.error('Failed to load audio buffer:', err));

        return () => {
            ctx.close();
        };
    }, []);

    // Unlock AudioContext on any user interaction (required by Chrome)
    useEffect(() => {
        const unlock = () => {
            const ctx = audioContextRef.current;
            if (ctx && ctx.state === 'suspended') {
                ctx.resume().then(() => {
                    audioUnlockedRef.current = true;
                    console.log('AudioContext unlocked');
                });
            } else if (ctx) {
                audioUnlockedRef.current = true;
            }
        };

        document.addEventListener('click', unlock);
        document.addEventListener('keydown', unlock);
        document.addEventListener('touchstart', unlock);
        unlock();

        return () => {
            document.removeEventListener('click', unlock);
            document.removeEventListener('keydown', unlock);
            document.removeEventListener('touchstart', unlock);
        };
    }, []);

    // Keep AudioContext alive — play an inaudible pulse every 25s to prevent
    // Chrome from suspending the context during long idle periods
    useEffect(() => {
        const keepAlive = setInterval(() => {
            const ctx = audioContextRef.current;
            if (!ctx || ctx.state === 'closed') return;

            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => { });
            }

            try {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                gain.gain.value = 0;
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.001);
            } catch {
                // ignore errors
            }
        }, 25000);

        return () => clearInterval(keepAlive);
    }, []);

    // Play sound via Web Audio API — awaits resume so audio works from background
    const playSound = useCallback(async () => {
        const ctx = audioContextRef.current;
        const buffer = audioBufferRef.current;

        if (!ctx || !buffer) {
            console.error('AudioContext or buffer not ready');
            return;
        }

        if (ctx.state === 'suspended') {
            try {
                await ctx.resume();
                console.log('AudioContext resumed from suspended state');
            } catch (err) {
                console.error('Failed to resume AudioContext:', err);
            }
        }

        const source = ctx.createBufferSource();
        const gainNode = ctx.createGain();
        gainNode.gain.value = isMuted ? 0 : volume;
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
        console.log('Playing notification sound via Web Audio API');
    }, [volume, isMuted]);

    // Fire all notifications — called from a useEffect, NOT from inside a state updater
    const fireNotifications = useCallback(async () => {
        await playSound();

        if (notificationPermission === 'granted') {
            try {
                new Notification('⏱️ 15 Minutes Complete!', {
                    body: `Time to log your progress on "${taskTitle}"`,
                    icon: '/speaker_icon.png',
                    tag: '15min-alert',
                    requireInteraction: true,
                });
            } catch (err) {
                console.error('Browser notification failed:', err);
            }
        }

        setShowNotificationBanner(true);
    }, [playSound, notificationPermission, taskTitle]);

    // React to the notification flag
    useEffect(() => {
        if (shouldFireNotifications) {
            fireNotifications();
            setShouldFireNotifications(false);
        }
    }, [shouldFireNotifications, fireNotifications]);

    // Auto-hide the notification banner after 8 seconds
    useEffect(() => {
        if (!showNotificationBanner) return;
        const timer = setTimeout(() => setShowNotificationBanner(false), 8000);
        return () => clearTimeout(timer);
    }, [showNotificationBanner]);

    // ── Wall-clock based 15-minute countdown ──
    // Uses Date.now() so the timer is accurate even when the tab is backgrounded.
    // Browsers throttle setInterval in background tabs, but when the tab returns
    // the next tick instantly sees the real elapsed time and catches up.
    useEffect(() => {
        if (showLogPopup) return;

        const tick = () => {
            const now = Date.now();
            const remaining = Math.round((timerEndRef.current - now) / 1000);
            const elapsed = Math.round((now - sessionStartRef.current) / 1000);

            setTotalElapsed(elapsed);

            if (remaining <= 0) {
                // Timer expired — fire notifications and open log popup
                setShouldFireNotifications(true);
                setShowLogPopup(true);
                popupEndRef.current = Date.now() + POPUP_DURATION * 1000;
                setPopupTimeRemaining(POPUP_DURATION);
                // Reset for next interval
                timerEndRef.current = Date.now() + INTERVAL_DURATION * 1000;
                setTimeRemaining(INTERVAL_DURATION);
            } else {
                setTimeRemaining(remaining);
            }
        };

        // Run immediately to catch up after returning from background
        tick();
        const timer = setInterval(tick, 1000);

        return () => clearInterval(timer);
    }, [showLogPopup]);

    // Catch up instantly when the tab becomes visible again
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState !== 'visible') return;

            const now = Date.now();

            if (showLogPopup) {
                // Update popup timer
                const popupRemaining = Math.round((popupEndRef.current - now) / 1000);
                if (popupRemaining <= 0) {
                    saveLogRef.current();
                } else {
                    setPopupTimeRemaining(popupRemaining);
                }
            } else {
                // Update main timer
                const remaining = Math.round((timerEndRef.current - now) / 1000);
                const elapsed = Math.round((now - sessionStartRef.current) / 1000);
                setTotalElapsed(elapsed);

                if (remaining <= 0) {
                    setShouldFireNotifications(true);
                    setShowLogPopup(true);
                    popupEndRef.current = Date.now() + POPUP_DURATION * 1000;
                    setPopupTimeRemaining(POPUP_DURATION);
                    timerEndRef.current = Date.now() + INTERVAL_DURATION * 1000;
                    setTimeRemaining(INTERVAL_DURATION);
                } else {
                    setTimeRemaining(remaining);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
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
        setShowNotificationBanner(false);
    }, [currentLog, intervalNumber]);

    // Keep saveLogRef in sync
    useEffect(() => {
        saveLogRef.current = saveLog;
    }, [saveLog]);

    // ── Wall-clock based 50-second popup countdown ──
    useEffect(() => {
        if (!showLogPopup) return;

        const tick = () => {
            const remaining = Math.round((popupEndRef.current - Date.now()) / 1000);
            if (remaining <= 0) {
                saveLogRef.current();
            } else {
                setPopupTimeRemaining(remaining);
            }
        };

        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [showLogPopup]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
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
            {/* Notification Banner — slides down from top */}
            {showNotificationBanner && (
                <div className="notification-banner">
                    <div className="notification-banner-content">
                        <span className="notification-banner-icon">⏱️</span>
                        <div>
                            <strong>15 MINUTES COMPLETE!</strong>
                            <p>Time to log your progress</p>
                        </div>
                        <button
                            className="notification-banner-close"
                            onClick={() => setShowNotificationBanner(false)}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

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

                <div className="volume-control">
                    <img
                        src="/speaker_icon.png"
                        alt="Volume"
                        className="volume-icon"
                        onClick={() => setIsMuted(!isMuted)}
                        title={isMuted ? 'Unmute' : 'Mute'}
                        style={{
                            width: '20px',
                            height: '20px',
                            opacity: isMuted || volume === 0 ? 0.3 : 1,
                            filter: isMuted ? 'grayscale(1)' : 'none',
                        }}
                    />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setVolume(val);
                            if (val > 0) setIsMuted(false);
                        }}
                        className="volume-slider"
                    />
                    <span className="volume-label">
                        {isMuted ? '0' : Math.round(volume * 100)}%
                    </span>
                </div>

                {/* Test sound button — also serves as an audio unlock gesture */}
                <button
                    className="btn btn-secondary"
                    onClick={playSound}
                    style={{ fontSize: '0.5rem', padding: '0.5rem 1rem', marginTop: '0.5rem' }}
                >
                    🔊 TEST SOUND
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
