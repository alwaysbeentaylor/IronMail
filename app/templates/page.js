'use client';

import { useState, useEffect } from 'react';
import {
    FileText,
    Trash2,
    ExternalLink,
    Plus,
    Search,
    Type,
    FileCode,
    Calendar
} from 'lucide-react';
import Link from 'next/link';

export default function TemplatesPage() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetch('/api/templates')
            .then(res => res.json())
            .then(data => {
                setTemplates(data);
                setLoading(false);
            });
    }, []);

    const handleDelete = async (id) => {
        if (!confirm('Weet je zeker dat je deze template wilt verwijderen?')) return;
        await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
        setTemplates(templates.filter(t => t.id !== id));
    };

    const filteredTemplates = templates.filter(t =>
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.subject?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <p style={{ color: 'var(--primary)', fontWeight: 600, marginBottom: '0.25rem' }}>Management</p>
                    <h1>Email Templates</h1>
                </div>
                <Link href="/compose" className="btn btn-primary" style={{ gap: '0.5rem' }}>
                    <Plus size={18} />
                    Create New
                </Link>
            </header>

            <div className="card" style={{ marginBottom: '2rem', padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Search size={18} color="var(--text-muted)" />
                    <input
                        className="input"
                        placeholder="Search templates by name or subject..."
                        style={{ margin: 0, border: 'none', background: 'transparent' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <p>Loading templates...</p>
            ) : filteredTemplates.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <FileText size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h3>Geen templates gevonden</h3>
                    <p>Begin met het opslaan van je eerste email als template.</p>
                </div>
            ) : (
                <div className="grid grid-3">
                    {filteredTemplates.map((template) => (
                        <div key={template.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div style={{
                                    background: 'var(--bg)',
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    color: 'var(--primary)'
                                }}>
                                    {template.type === 'html' ? <FileCode size={20} /> : <Type size={20} />}
                                </div>
                                <button
                                    onClick={() => handleDelete(template.id)}
                                    style={{ color: 'var(--text-muted)', hover: 'var(--error)' }}
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{template.name}</h3>
                            <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem', color: 'var(--text-muted)', flex: 1 }}>
                                {template.subject || 'No Subject'}
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                    <Calendar size={12} />
                                    {new Date(template.createdAt).toLocaleDateString()}
                                </div>
                                <Link
                                    href={`/compose?templateId=${template.id}`}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}
                                >
                                    Use <ExternalLink size={14} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
