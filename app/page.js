'use client';

import { useState, useEffect } from 'react';
import {
    Send,
    Inbox,
    FileText,
    TrendingUp,
    Clock,
    ArrowRight,
    Loader2
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/stats')
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    return (
        <div>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <p style={{ color: 'var(--primary)', fontWeight: 600, marginBottom: '0.25rem' }}>Overview</p>
                    <h1>Dashboard</h1>
                </div>
                <Link href="/compose" className="btn btn-primary" style={{ gap: '0.5rem' }}>
                    <Send size={18} />
                    New Email
                </Link>
            </header>

            <div className="grid grid-3" style={{ marginBottom: '2.5rem' }}>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                            <Send size={24} color="var(--primary)" />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1.75rem', margin: 0 }}>{stats?.sentCount || 0}</h2>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Emails Sent</p>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                            <Inbox size={24} color="var(--success)" />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1.75rem', margin: 0 }}>{stats?.inboxCount || 0}</h2>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Inbound Received</p>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                            <FileText size={24} color="var(--warning)" />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1.75rem', margin: 0 }}>{stats?.templateCount || 0}</h2>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Templates Saved</p>
                </div>
            </div>

            <div className="grid grid-2">
                <div className="card" style={{ gridColumn: 'span 1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0 }}>Recent Activity</h2>
                        <Link href="/sent" style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            View all <ArrowRight size={14} />
                        </Link>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {stats?.recentActivity?.length > 0 ? stats.recentActivity.map((activity) => (
                            <div key={activity.id} style={{ display: 'flex', gap: '1rem', padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ width: '40px', height: '40px', background: 'var(--bg)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Clock size={18} color="var(--text-muted)" />
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activity.subject}</h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>To: {activity.to}</p>
                                </div>
                            </div>
                        )) : (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No recent activity</p>
                        )}
                    </div>
                </div>

                <div className="card">
                    <h2 style={{ marginBottom: '1.5rem' }}>System Status</h2>
                    <div style={{ background: 'var(--bg)', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                        <TrendingUp size={20} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
                        <p style={{ color: 'var(--text)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                            All systems operational. Connected to Resend API and Stark Systems.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
