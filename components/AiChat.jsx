'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

const MAX_HISTORY = 50;

// Boot sequence messages
const BOOT_SEQUENCE = [
    { text: 'NEURAL INTERFACE DETECTED', delay: 0 },
    { text: 'INITIALIZING CORE SYSTEMS...', delay: 400 },
    { text: 'QUANTUM PROCESSORS: ONLINE', delay: 800 },
    { text: 'LANGUAGE MATRIX: LOADED', delay: 1100 },
    { text: 'J.A.R.V.I.S. READY', delay: 1500 },
];

export default function AiChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [isBooting, setIsBooting] = useState(false);
    const [bootStep, setBootStep] = useState(0);
    const [bootComplete, setBootComplete] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hey! Ik ben Jarvis, je persoonlijke assistent. Stel me een vraag of geef een commando!' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef(null);
    const router = useRouter();

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Boot sequence effect
    useEffect(() => {
        if (isOpen && !bootComplete) {
            setIsBooting(true);
            setBootStep(0);

            BOOT_SEQUENCE.forEach((step, index) => {
                setTimeout(() => {
                    setBootStep(index + 1);
                    if (index === BOOT_SEQUENCE.length - 1) {
                        setTimeout(() => {
                            setIsBooting(false);
                            setBootComplete(true);
                        }, 600);
                    }
                }, step.delay);
            });
        }
    }, [isOpen]);

    const handleOpen = () => {
        if (!isOpen) {
            setBootComplete(false);
        }
        setIsOpen(!isOpen);
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput('');
        const newMessages = [...messages, { role: 'user', text: userMsg }];
        setMessages(newMessages);
        setLoading(true);

        const history = newMessages.slice(-MAX_HISTORY).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text
        }));

        try {
            const res = await fetch('/api/ai/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userMsg, history })
            });
            const data = await res.json();

            if (data.action === 'send_email') {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: `Zeker! Ik heb een concept klaargezet voor ${data.to || 'de ontvanger'}. Klik hieronder om het te bekijken.`,
                    action: data
                }]);
            } else if (data.action === 'search_contacts') {
                router.push(`/contacts?search=${encodeURIComponent(data.query)}`);
                setMessages(prev => [...prev, { role: 'assistant', text: `Ik zoek naar "${data.query}" in je contacten...` }]);
            } else if (data.action === 'batch_campaign') {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: data.text,
                    action: { action: 'open_page', page: 'campaigns' }
                }]);
            } else if (data.action === 'open_page') {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: data.text,
                    action: data
                }]);
            } else if (data.action === 'clarify') {
                setMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
            } else if (data.action === 'answer' || data.text) {
                setMessages(prev => [...prev, { role: 'assistant', text: data.text || data.answer }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', text: 'Hmm, dat is interessant. Vertel me meer of vraag iets anders!' }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', text: 'Oei, er ging iets mis. Probeer het nog eens!' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
            {/* Arc Reactor Toggle Button */}
            <button
                onClick={handleOpen}
                style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 30% 30%, #1a2a3a, #0a0e14)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 30px rgba(0, 212, 255, 0.5), 0 0 60px rgba(0, 212, 255, 0.3), inset 0 0 20px rgba(0, 212, 255, 0.1)',
                    border: '2px solid rgba(0, 212, 255, 0.5)',
                    cursor: 'pointer',
                    animation: 'arc-reactor 2s ease-in-out infinite',
                    overflow: 'hidden',
                    padding: 0
                }}
            >
                {isOpen ? (
                    <X size={28} color="#00d4ff" />
                ) : (
                    <img
                        src="/jarvis-icon.png"
                        alt="Jarvis"
                        width={50}
                        height={50}
                        className="jarvis-eye"
                        style={{ borderRadius: '50%', objectFit: 'cover' }}
                    />
                )}
            </button>

            {/* JARVIS Brain Control Center */}
            {isOpen && (
                <div className="jarvis-hud-container">
                    {/* Outer Rotating Ring */}
                    <div className="jarvis-ring jarvis-ring-outer" />

                    {/* Middle Pulsing Ring */}
                    <div className="jarvis-ring jarvis-ring-middle" />

                    {/* Inner Core Ring */}
                    <div className="jarvis-ring jarvis-ring-inner" />

                    {/* Scanning Grid Lines */}
                    <div className="jarvis-grid" />

                    {/* Corner Brackets */}
                    <div className="jarvis-bracket jarvis-bracket-tl" />
                    <div className="jarvis-bracket jarvis-bracket-tr" />
                    <div className="jarvis-bracket jarvis-bracket-bl" />
                    <div className="jarvis-bracket jarvis-bracket-br" />

                    {/* Boot Sequence Overlay */}
                    {isBooting && (
                        <div className="jarvis-boot-overlay">
                            <div className="jarvis-boot-core">
                                <div className="jarvis-boot-circle" />
                                <div className="jarvis-boot-circle jarvis-boot-circle-2" />
                                <div className="jarvis-boot-circle jarvis-boot-circle-3" />
                            </div>
                            <div className="jarvis-boot-text">
                                {BOOT_SEQUENCE.slice(0, bootStep).map((step, i) => (
                                    <div key={i} className="jarvis-boot-line" style={{ animationDelay: `${i * 0.1}s` }}>
                                        <span className="jarvis-boot-indicator">▸</span>
                                        {step.text}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Main Chat Window */}
                    <div
                        className="jarvis-chat-window"
                        style={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            background: 'rgba(10, 14, 20, 0.95)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            borderRadius: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            opacity: bootComplete ? 1 : 0,
                            transition: 'opacity 0.5s ease'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '1.25rem',
                            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 153, 204, 0.1) 100%)',
                            borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem'
                        }}>
                            <div style={{
                                width: '45px',
                                height: '45px',
                                borderRadius: '12px',
                                background: 'radial-gradient(circle at 30% 30%, rgba(0, 212, 255, 0.3), transparent)',
                                border: '1px solid rgba(0, 212, 255, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                            }}>
                                <img
                                    src="/jarvis-icon.png"
                                    alt="Jarvis"
                                    width={35}
                                    height={35}
                                    style={{ borderRadius: '8px', objectFit: 'cover' }}
                                />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#00d4ff', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>J.A.R.V.I.S</h4>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(122, 162, 196, 0.9)' }}>Neural Command Interface</p>
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 10px #00ff88' }} />
                                <span style={{ fontSize: '0.7rem', color: '#00ff88', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Online</span>
                            </div>
                        </div>

                        {/* Messages */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            minHeight: 0,
                            background: 'rgba(10, 14, 20, 1)'
                        }}>
                            {messages.map((msg, i) => (
                                <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                    <div style={{
                                        padding: '0.85rem 1.1rem',
                                        borderRadius: '12px',
                                        fontSize: '0.9rem',
                                        lineHeight: '1.5',
                                        background: msg.role === 'user'
                                            ? 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)'
                                            : 'rgba(20, 35, 50, 0.8)',
                                        color: msg.role === 'user' ? '#0a0e14' : '#f0f8ff',
                                        border: msg.role === 'user' ? 'none' : '1px solid rgba(0, 212, 255, 0.2)',
                                        borderBottomLeftRadius: msg.role === 'assistant' ? '2px' : '12px',
                                        borderBottomRightRadius: msg.role === 'user' ? '2px' : '12px',
                                        boxShadow: msg.role === 'user'
                                            ? '0 4px 15px rgba(0, 212, 255, 0.3)'
                                            : '0 2px 10px rgba(0, 0, 0, 0.2)'
                                    }}>
                                        {msg.text}

                                        {msg.action?.action === 'send_email' && (
                                            <button
                                                onClick={() => {
                                                    const url = `/compose?to=${encodeURIComponent(msg.action.to || '')}&subject=${encodeURIComponent(msg.action.subject || '')}&content=${encodeURIComponent(msg.action.content || '')}`;
                                                    router.push(url);
                                                    setIsOpen(false);
                                                }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                                                    marginTop: '0.75rem', padding: '0.6rem', borderRadius: '8px',
                                                    background: 'rgba(0, 212, 255, 0.15)', border: '1px solid rgba(0, 212, 255, 0.3)',
                                                    color: '#00d4ff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                                    textTransform: 'uppercase', letterSpacing: '0.05em',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'rgba(0, 212, 255, 0.25)';
                                                    e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.3)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(0, 212, 255, 0.15)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }}
                                            >
                                                <Mail size={14} /> Open Composer
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div style={{
                                    alignSelf: 'flex-start',
                                    background: 'rgba(20, 35, 50, 0.8)',
                                    padding: '0.85rem 1.1rem',
                                    borderRadius: '12px',
                                    borderBottomLeftRadius: '2px',
                                    border: '1px solid rgba(0, 212, 255, 0.2)'
                                }}>
                                    <Loader2 size={18} className="animate-spin" color="#00d4ff" />
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <div style={{ padding: '1rem', borderTop: '1px solid rgba(0, 212, 255, 0.2)', background: 'rgba(10, 14, 20, 0.5)' }}>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <input
                                    className="input"
                                    placeholder="Enter command..."
                                    style={{
                                        borderRadius: '24px',
                                        paddingLeft: '1.25rem',
                                        background: 'rgba(20, 35, 50, 0.6)',
                                        border: '1px solid rgba(0, 212, 255, 0.2)',
                                        marginBottom: 0
                                    }}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || loading}
                                    style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                                        color: '#0a0e14',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: 'none',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                        boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                            <p style={{ margin: '0.6rem 0 0', fontSize: '0.7rem', color: 'rgba(122, 162, 196, 0.7)', textAlign: 'center', letterSpacing: '0.03em' }}>
                                Neural link active • Voice command enabled
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
