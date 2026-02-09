'use client';

import { useState, useEffect } from 'react';

interface FolderSelectProps {
    onSelect: (folder: string) => void;
    onBack: () => void;
}

export default function FolderSelect({ onSelect, onBack }: FolderSelectProps) {
    const [folders, setFolders] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchFolders();
    }, []);

    const fetchFolders = async () => {
        try {
            const res = await fetch('/api/folders');
            const data = await res.json();
            setFolders(data.folders || []);
        } catch (error) {
            console.error('Failed to fetch folders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        setCreating(true);
        try {
            const res = await fetch('/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newFolderName.trim() }),
            });

            if (res.ok) {
                onSelect(newFolderName.trim());
            }
        } catch (error) {
            console.error('Failed to create folder:', error);
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="card">
                <h2>LOADING FOLDERS...</h2>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="card">
            <h1>SELECT PROJECT FOLDER</h1>
            <h3>Choose an existing folder or create a new one</h3>

            {folders.length > 0 && (
                <div className="folder-grid">
                    {folders.map((folder) => (
                        <button
                            key={folder}
                            className="folder-btn"
                            onClick={() => onSelect(folder)}
                        >
                            📁 {folder}
                        </button>
                    ))}
                </div>
            )}

            {folders.length === 0 && !showCreate && (
                <p className="text-small mb-2" style={{ color: 'var(--text-secondary)' }}>
                    No folders found. Create your first one!
                </p>
            )}

            {!showCreate ? (
                <div className="mt-2">
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowCreate(true)}
                    >
                        + NEW FOLDER
                    </button>
                </div>
            ) : (
                <form onSubmit={handleCreateFolder} className="mt-2">
                    <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Enter folder name..."
                        autoFocus
                        autoComplete="off"
                    />
                    <div className="mt-1">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={creating}
                        >
                            {creating ? 'CREATING...' : 'CREATE'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => {
                                setShowCreate(false);
                                setNewFolderName('');
                            }}
                        >
                            CANCEL
                        </button>
                    </div>
                </form>
            )}

            <div className="mt-2">
                <button className="btn btn-danger" onClick={onBack}>
                    ← BACK
                </button>
            </div>
        </div>
    );
}
