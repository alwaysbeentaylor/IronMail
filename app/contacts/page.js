'use client';

import { useState, useEffect } from 'react';
import {
    Users,
    Mail,
    Calendar,
    MessageSquare,
    Search,
    UserPlus,
    Loader2
} from 'lucide-react';

export default function ContactsPage() {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetch('/api/contacts')
            .then(res => res.json())
            .then(data => {
                setContacts(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filteredContacts = contacts.filter(contact =>
        contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <p style={{ color: 'var(--primary)', fontWeight: 600, marginBottom: '0.25rem' }}>Management</p>
                    <h1>Contacts (CRM)</h1>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div className="card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0 }}>
                        <Search size={16} color="var(--text-muted)" />
                        <input
                            placeholder="Search contacts..."
                            style={{ background: 'none', border: 'none', color: 'var(--text)', outline: 'none', fontSize: '0.9rem' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading CRM data...</p>
                </div>
            ) : filteredContacts.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <Users size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h3>No contacts found</h3>
                    <p>Every person you email or receive mail from will appear here automatically.</p>
                </div>
            ) : (
                <div className="grid grid-2">
                    {filteredContacts.map(contact => (
                        <div key={contact.id} className="card" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: 'var(--primary)',
                                        color: 'white',
                                        display: 'flex',
                                        itemsAlign: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.2rem',
                                        fontWeight: 700,
                                        alignItems: 'center'
                                    }}>
                                        {contact.name?.substring(0, 1).toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0 }}>{contact.name || contact.email}</h3>
                                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{contact.email}</p>
                                    </div>
                                </div>
                                <div className="badge badge-primary">{contact.interactionCount || 1} Mails</div>
                            </div>

                            <div className="grid grid-2" style={{ gap: '1rem' }}>
                                <div style={{ background: 'var(--bg)', padding: '0.75rem', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <Calendar size={14} color="var(--text-muted)" />
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Last Contact</span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.85rem' }}>{new Date(contact.lastInteraction).toLocaleDateString()}</p>
                                </div>
                                <div style={{ background: 'var(--bg)', padding: '0.75rem', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <MessageSquare size={14} color="var(--text-muted)" />
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Status</span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Active Lead</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
