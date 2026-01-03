'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Bot,
    Plus,
    Trash2,
    Play,
    Save,
    MessageSquare,
    Loader2,
    CheckCircle2,
    Building2,
    Send,
    Sparkles,
    ChevronRight
} from 'lucide-react';

export default function AgentsPage() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showWizard, setShowWizard] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [testMode, setTestMode] = useState(false);

    const fetchAgents = async () => {
        const res = await fetch('/api/agents');
        const data = await res.json();
        setAgents(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchAgents();
    }, []);

    const deleteAgent = async (id) => {
        if (confirm('Weet je zeker dat je deze agent wilt verwijderen?')) {
            await fetch(`/api/agents?id=${id}`, { method: 'DELETE' });
            fetchAgents();
        }
    };

    return (
        <div>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <p style={{ color: 'var(--primary)', fontWeight: 600, marginBottom: '0.25rem' }}>AI Agents</p>
                    <h1>Campaign Agents</h1>
                </div>
                <button className="btn btn-primary" onClick={() => setShowWizard(true)} style={{ gap: '0.5rem' }}>
                    <Plus size={18} /> Create Agent
                </button>
            </header>

            {showWizard && (
                <AgentWizard onClose={() => { setShowWizard(false); fetchAgents(); }} />
            )}

            {testMode && selectedAgent && (
                <AgentTestMode agent={selectedAgent} onClose={() => setTestMode(false)} />
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                </div>
            ) : agents.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <Bot size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h3>No agents yet</h3>
                    <p>Create your first Campaign Agent to start hyper-personalized outreach.</p>
                </div>
            ) : (
                <div className="grid grid-2">
                    {agents.map(agent => (
                        <div key={agent.id} className="card" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '12px',
                                        background: 'var(--primary)', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Bot size={24} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0 }}>{agent.name}</h3>
                                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            {agent.industry} • v{agent.version}
                                        </p>
                                    </div>
                                </div>
                                <div className="badge badge-primary">Active</div>
                            </div>

                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                {agent.definition?.substring(0, 150)}...
                            </p>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="btn btn-outline"
                                    style={{ flex: 1, gap: '0.4rem' }}
                                    onClick={() => { setSelectedAgent(agent); setTestMode(true); }}
                                >
                                    <Play size={16} /> Test
                                </button>
                                <button
                                    className="btn btn-outline"
                                    style={{ color: 'var(--error)' }}
                                    onClick={() => deleteAgent(agent.id)}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function AgentWizard({ onClose }) {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hoi! Ik help je een Campaign Agent te maken. Vertel me: wie wil je benaderen en met welk doel?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [agentConfig, setAgentConfig] = useState(null);
    const chatEndRef = useRef(null);

    const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(() => scrollToBottom(), [messages]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const res = await fetch('/api/ai/wizard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    history: messages,
                    currentConfig: agentConfig
                })
            });
            const data = await res.json();

            if (data.config) {
                setAgentConfig(data.config);
            }

            setMessages(prev => [...prev, { role: 'assistant', text: data.response }]);

            if (data.complete) {
                // Save the agent
                await fetch('/api/agents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data.config)
                });
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', text: 'Er ging iets mis. Probeer het opnieuw.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="card" style={{ width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Sparkles size={24} color="var(--primary)" />
                        <h3 style={{ margin: 0 }}>Agent Creation Wizard</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {messages.map((msg, i) => (
                        <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                            <div style={{
                                padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.9rem',
                                background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg)',
                                color: msg.role === 'user' ? 'white' : 'var(--text)',
                                border: msg.role === 'user' ? 'none' : '1px solid var(--border)'
                            }}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div style={{ alignSelf: 'flex-start' }}>
                            <div style={{ padding: '0.75rem 1rem', borderRadius: '12px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                                <Loader2 size={16} className="animate-spin" color="var(--primary)" />
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
                    <input
                        className="input"
                        placeholder="Beschrijf je agent..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <button className="btn btn-primary" onClick={sendMessage} disabled={loading}>
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function AgentTestMode({ agent, onClose }) {
    const [testData, setTestData] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);

    const runTest = async () => {
        setLoading(true);
        try {
            const rows = testData.split('\n').filter(r => r.trim()).map(row => {
                const parts = row.split(',').map(p => p.trim());
                const obj = {};
                agent.keyColumns && Object.keys(agent.keyColumns).forEach((key, i) => {
                    obj[key] = parts[i] || '';
                });
                return obj;
            });

            const res = await fetch('/api/agents/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId: agent.id, testData: rows })
            });
            const data = await res.json();
            setResults(data.results);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="card" style={{ width: '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Play size={24} color="var(--primary)" />
                        <h3 style={{ margin: 0 }}>Test Agent: {agent.name}</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    {!results ? (
                        <div>
                            <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                                Voer testdata in (CSV formaat, één rij per ontvanger):
                            </p>
                            <textarea
                                className="textarea"
                                style={{ minHeight: '150px', fontFamily: 'monospace' }}
                                placeholder="Jan Jansen, Hotel Amsterdam, jan@hotel.nl&#10;Piet de Vries, Resort Rotterdam, piet@resort.nl"
                                value={testData}
                                onChange={(e) => setTestData(e.target.value)}
                            />
                            <button
                                className="btn btn-primary"
                                style={{ marginTop: '1rem', width: '100%', gap: '0.5rem' }}
                                onClick={runTest}
                                disabled={loading || !testData.trim()}
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
                                {loading ? 'Testing...' : 'Run Test'}
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {results.map((result, i) => (
                                <div key={i} className="card" style={{ background: 'var(--bg)', padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <h4 style={{ margin: 0 }}>Preview #{i + 1}</h4>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
                                                {result.model}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {result.duration}ms
                                            </span>
                                            <div style={{
                                                padding: '0.25rem 0.5rem', borderRadius: '4px',
                                                background: `rgba(16, 185, 129, ${result.confidence})`,
                                                color: 'white', fontSize: '0.7rem', fontWeight: 600
                                            }}>
                                                {Math.round(result.confidence * 100)}% confidence
                                            </div>
                                        </div>
                                    </div>
                                    <p style={{ margin: 0, fontWeight: 600, marginBottom: '0.5rem' }}>Subject: {result.subject}</p>
                                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{result.body}</p>
                                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {result.fieldsUsed?.map(field => (
                                            <span key={field} className="badge" style={{ fontSize: '0.7rem' }}>{field}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <button className="btn btn-outline" onClick={() => setResults(null)}>
                                Test Opnieuw
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
