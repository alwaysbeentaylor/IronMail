'use client';

import { useState, useEffect } from 'react';
import {
    Activity,
    Filter,
    Trash2,
    RefreshCw,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    Cpu,
    Mail,
    Upload,
    Bot
} from 'lucide-react';

const TYPE_ICONS = {
    'ai_call': Cpu,
    'email_sent': Mail,
    'import': Upload,
    'agent_test': Bot,
    'error': XCircle
};

const STATUS_COLORS = {
    'success': 'var(--success)',
    'error': 'var(--error)',
    'warning': 'rgba(251, 191, 36, 1)'
};

export default function LogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ type: '', status: '' });

    const fetchLogs = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filter.type) params.set('type', filter.type);
        if (filter.status) params.set('status', filter.status);

        const res = await fetch(`/api/logs?${params.toString()}`);
        const data = await res.json();
        setLogs(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, [filter]);

    const clearLogs = async () => {
        if (confirm('Weet je zeker dat je alle logs wilt verwijderen?')) {
            await fetch('/api/logs', { method: 'DELETE' });
            fetchLogs();
        }
    };

    return (
        <div>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <p style={{ color: 'var(--primary)', fontWeight: 600, marginBottom: '0.25rem' }}>System</p>
                    <h1>Activity Logs</h1>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <select
                        className="input"
                        style={{ width: 'auto' }}
                        value={filter.type}
                        onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                    >
                        <option value="">All Types</option>
                        <option value="ai_call">AI Calls</option>
                        <option value="email_sent">Emails</option>
                        <option value="import">Imports</option>
                        <option value="agent_test">Agent Tests</option>
                        <option value="error">Errors</option>
                    </select>
                    <select
                        className="input"
                        style={{ width: 'auto' }}
                        value={filter.status}
                        onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                    >
                        <option value="">All Status</option>
                        <option value="success">Success</option>
                        <option value="error">Error</option>
                        <option value="warning">Warning</option>
                    </select>
                    <button className="btn btn-outline" onClick={fetchLogs} style={{ gap: '0.4rem' }}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button className="btn btn-outline" onClick={clearLogs} style={{ gap: '0.4rem', color: 'var(--error)' }}>
                        <Trash2 size={16} /> Clear All
                    </button>
                </div>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <Activity className="animate-spin" size={32} color="var(--primary)" />
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading activity logs...</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <Activity size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h3>No activity logs yet</h3>
                    <p>All system operations will be tracked here automatically.</p>
                </div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>TIME</th>
                                <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>TYPE</th>
                                <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>INPUT</th>
                                <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>OUTPUT</th>
                                <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>MODEL</th>
                                <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>DURATION</th>
                                <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => {
                                const Icon = TYPE_ICONS[log.type] || Activity;
                                return (
                                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                <Clock size={14} />
                                                {new Date(log.timestamp).toLocaleString()}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Icon size={16} color="var(--primary)" />
                                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{log.type}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', maxWidth: '200px' }}>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {typeof log.input === 'string' ? log.input : JSON.stringify(log.input)}
                                            </p>
                                        </td>
                                        <td style={{ padding: '1rem', maxWidth: '200px' }}>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {typeof log.output === 'string' ? log.output : JSON.stringify(log.output)}
                                            </p>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {log.model && (
                                                <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', fontSize: '0.7rem' }}>
                                                    {log.model}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {log.duration && (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.duration}ms</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                background: `${STATUS_COLORS[log.status]}20`,
                                                color: STATUS_COLORS[log.status],
                                                fontSize: '0.75rem',
                                                fontWeight: 600
                                            }}>
                                                {log.status === 'success' && <CheckCircle2 size={12} />}
                                                {log.status === 'error' && <XCircle size={12} />}
                                                {log.status === 'warning' && <AlertTriangle size={12} />}
                                                {log.status}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
