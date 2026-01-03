'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Layers,
    Users,
    Send,
    Sparkles,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Bot,
    FolderOpen
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BatchPage() {
    const searchParams = useSearchParams();
    const campaignId = searchParams.get('campaignId');

    const [contacts, setContacts] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [agents, setAgents] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [template, setTemplate] = useState({ subject: '', content: '' });
    const [isPersonalizing, setIsPersonalizing] = useState(true);
    const [sending, setSending] = useState(false);
    const [results, setResults] = useState(null);
    const router = useRouter();

    useEffect(() => {
        Promise.all([
            fetch('/api/contacts').then(r => r.json()),
            fetch('/api/campaigns').then(r => r.json()),
            fetch('/api/agents').then(r => r.json())
        ]).then(([contactsData, campaignsData, agentsData]) => {
            setContacts(contactsData);
            setCampaigns(campaignsData);
            setAgents(agentsData);

            // Auto-load campaign if ID provided
            if (campaignId) {
                const campaign = campaignsData.find(c => c.id === campaignId);
                if (campaign) {
                    setSelectedCampaign(campaign);
                    setSelectedIds(campaign.recipients?.map((_, i) => i) || []);
                    if (campaign.agentId) {
                        const agent = agentsData.find(a => a.id === campaign.agentId);
                        setSelectedAgent(agent);
                    }
                }
            }
        });
    }, [campaignId]);

    const getRecipients = () => {
        if (selectedCampaign) {
            return selectedCampaign.recipients || [];
        }
        return contacts;
    };

    const toggleRecipient = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBatchSend = async () => {
        const recipients = getRecipients();
        const selected = selectedIds.map(id => recipients[id] || recipients.find(r => r.id === id));

        if (selected.length === 0) return alert('Selecteer minimaal één ontvanger.');
        setSending(true);
        setResults(null);

        try {
            const res = await fetch('/api/send/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contacts: selected,
                    subject: template.subject,
                    content: template.content,
                    personalize: isPersonalizing,
                    agentId: selectedAgent?.id
                })
            });
            const data = await res.json();
            setResults(data);
        } catch (err) {
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    if (results) {
        return (
            <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
                <div style={{
                    width: '80px', height: '80px', borderRadius: '50%', background: 'var(--success)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem'
                }}>
                    <CheckCircle2 size={40} />
                </div>
                <h1>Batch Verzonden!</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    We hebben {results.count} gepersonaliseerde mails in de wachtrij gezet.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button className="btn btn-outline" onClick={() => setResults(null)}>Nieuwe Batch</button>
                    <button className="btn btn-primary" onClick={() => router.push('/sent')}>Bekijk Geschiedenis</button>
                </div>
            </div>
        );
    }

    const recipients = getRecipients();

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
            <div>
                <header style={{ marginBottom: '2rem' }}>
                    <p style={{ color: 'var(--primary)', fontWeight: 600, marginBottom: '0.25rem' }}>Campaigns</p>
                    <h1>Personalized Bulk Messaging</h1>
                </header>

                {/* Campaign Selector */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FolderOpen size={20} color="var(--primary)" />
                        Select Campaign (Optional)
                    </h3>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div
                            onClick={() => { setSelectedCampaign(null); setSelectedIds([]); }}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer',
                                border: !selectedCampaign ? '2px solid var(--primary)' : '1px solid var(--border)',
                                background: !selectedCampaign ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                            }}
                        >
                            Use Contacts
                        </div>
                        {campaigns.map(c => (
                            <div
                                key={c.id}
                                onClick={() => {
                                    setSelectedCampaign(c);
                                    setSelectedIds(c.recipients?.map((_, i) => i) || []);
                                    if (c.agentId) {
                                        const agent = agents.find(a => a.id === c.agentId);
                                        setSelectedAgent(agent);
                                    }
                                }}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer',
                                    border: selectedCampaign?.id === c.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                    background: selectedCampaign?.id === c.id ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                                }}
                            >
                                {c.name} ({c.recipients?.length || 0})
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recipients */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={20} color="var(--primary)" />
                        Select Recipients ({selectedIds.length})
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', maxHeight: '300px', overflowY: 'auto', padding: '0.5rem' }}>
                        {recipients.map((recipient, index) => {
                            const id = recipient.id || index;
                            const isSelected = selectedIds.includes(id);
                            return (
                                <div
                                    key={id}
                                    onClick={() => toggleRecipient(id)}
                                    style={{
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                                        background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{recipient.name || 'Unknown'}</p>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{recipient.email}</p>
                                    {recipient.company && <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>{recipient.company}</p>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Template */}
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Email Template</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label className="label">Subject</label>
                            <input
                                className="input"
                                placeholder="E.g. Special offer for {{name}}"
                                value={template.subject}
                                onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">Base Message</label>
                            <textarea
                                className="textarea"
                                style={{ minHeight: '200px' }}
                                placeholder="Write your core message here. AI will personalize this for each recipient."
                                value={template.content}
                                onChange={(e) => setTemplate({ ...template, content: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <aside>
                <div className="card" style={{ position: 'sticky', top: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Batch Settings</h3>

                    {/* Agent Selector */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Bot size={14} /> Campaign Agent
                        </label>
                        <select
                            className="input"
                            value={selectedAgent?.id || ''}
                            onChange={(e) => setSelectedAgent(agents.find(a => a.id === e.target.value))}
                        >
                            <option value="">None (Basic AI)</option>
                            {agents.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{
                        padding: '1rem', borderRadius: '12px', background: 'var(--bg)', border: '1px solid var(--border)',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Sparkles size={16} color="var(--primary)" />
                                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>AI Personalization</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={isPersonalizing}
                                onChange={(e) => setIsPersonalizing(e.target.checked)}
                            />
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {selectedAgent
                                ? `Using agent "${selectedAgent.name}" for hyper-personalization.`
                                : 'Automatically tailor the tone and content for each recipient.'}
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Recipients:</span>
                            <span style={{ fontWeight: 600 }}>{selectedIds.length}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Agent:</span>
                            <span>{selectedAgent?.name || 'Basic AI'}</span>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.5rem 0' }} />

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', gap: '0.5rem' }}
                            onClick={handleBatchSend}
                            disabled={sending || selectedIds.length === 0}
                        >
                            {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                            {sending ? 'Processing Batch...' : 'Send Batch Now'}
                        </button>
                    </div>

                    {!isPersonalizing && (
                        <div style={{
                            marginTop: '1.5rem', padding: '0.75rem', borderRadius: '8px',
                            background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)',
                            display: 'flex', gap: '0.75rem'
                        }}>
                            <AlertCircle size={18} color="rgba(251, 191, 36, 1)" style={{ flexShrink: 0 }} />
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text)' }}>
                                Without AI, everyone receives the exact same message.
                            </p>
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}
