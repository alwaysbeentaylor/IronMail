'use client';

import { useState } from 'react';
import { Sparkles, RefreshCw, Languages, Wand2, Lightbulb, Loader2 } from 'lucide-react';

export default function AiAssistant({ content, onUpdate, onUpdateSubject }) {
    const [loading, setLoading] = useState(false);

    const callAi = async (action, context = '') => {
        if (!content && action !== 'subject') return;
        setLoading(true);
        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, content, context })
            });
            const data = await res.json();
            if (action === 'subject') {
                const subjects = data.result.split('\n').filter(s => s.trim());
                onUpdateSubject(subjects[0].replace(/^[0-9].\s*|"/g, ''));
            } else {
                onUpdate(data.result);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Sparkles size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stark Intelligence</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                    className="btn btn-outline"
                    onClick={() => callAi('improve')}
                    disabled={loading}
                    style={{ justifyContent: 'flex-start', fontSize: '0.85rem', gap: '0.6rem' }}
                >
                    {loading ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
                    Improve Text
                </button>

                <button
                    className="btn btn-outline"
                    onClick={() => callAi('subject')}
                    disabled={loading}
                    style={{ justifyContent: 'flex-start', fontSize: '0.85rem', gap: '0.6rem' }}
                >
                    {loading ? <Loader2 className="animate-spin" size={14} /> : <Lightbulb size={14} />}
                    Suggest Subject
                </button>

                <button
                    className="btn btn-outline"
                    onClick={() => callAi('tone', 'formele')}
                    disabled={loading}
                    style={{ justifyContent: 'flex-start', fontSize: '0.85rem', gap: '0.6rem' }}
                >
                    {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                    Make Formal
                </button>

                <button
                    className="btn btn-outline"
                    onClick={() => callAi('translate', 'Engels')}
                    disabled={loading}
                    style={{ justifyContent: 'flex-start', fontSize: '0.85rem', gap: '0.6rem' }}
                >
                    {loading ? <Loader2 className="animate-spin" size={14} /> : <Languages size={14} />}
                    Translate to EN
                </button>
            </div>

            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1rem', fontStyle: 'italic' }}>
                Jarvis analyzes your content to provide real-time optimizations.
            </p>
        </div>
    );
}
