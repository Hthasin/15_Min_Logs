'use client';

import { useState, useEffect } from 'react';

interface SessionStartProps {
    taskTitle: string;
    folderName: string;
    onStart: (description: string, sessionNumber: number) => void;
    onBack: () => void;
}

export default function SessionStart({ taskTitle, folderName, onStart, onBack }: SessionStartProps) {
    const [description, setDescription] = useState('');
    const [sessionNumber, setSessionNumber] = useState(1);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        fetchSessionNumber();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchSessionNumber = async () => {
        try {
            const res = await fetch(`/api/sessions?folder=${encodeURIComponent(folderName)}`);
            const data = await res.json();
            setSessionNumber((data.count || 0) + 1);
        } catch (error) {
            console.error('Failed to fetch session count:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const handleStart = () => {
        onStart(description || 'No description provided', sessionNumber);
    };

    if (loading) {
        return (
            <div className="card">
                <h2>LOADING SESSION INFO...</h2>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="card">
            <h1>
                WORK SESSION #{sessionNumber}
            </h1>
            <h2>
                {formatDate(currentTime)} • {formatTime(currentTime)}
            </h2>
            <h3>📁 {folderName} / {taskTitle}</h3>

            <div className="mt-2">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                    WHAT WILL THIS SESSION BE ABOUT?
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your goals for this work session..."
                    autoFocus
                />
            </div>

            <div className="mt-2">
                <button className="btn btn-start" onClick={handleStart}>
                    ▶ START SESSION
                </button>
            </div>

            <div className="mt-1">
                <button className="btn btn-danger" onClick={onBack}>
                    ← BACK
                </button>
            </div>
        </div>
    );
}
