'use client';

interface TitleInputProps {
    onSubmit: (title: string) => void;
}

export default function TitleInput({ onSubmit }: TitleInputProps) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const title = formData.get('title') as string;
        if (title.trim()) {
            onSubmit(title.trim());
        }
    };

    return (
        <div className="card">
            <h1>// 15 MIN TRACKER //</h1>
            <h2>WHAT ARE YOU WORKING ON?</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    name="title"
                    placeholder="Enter task title..."
                    autoFocus
                    autoComplete="off"
                />
                <div className="mt-2">
                    <button type="submit" className="btn btn-primary">
                        CONTINUE →
                    </button>
                </div>
            </form>
        </div>
    );
}
