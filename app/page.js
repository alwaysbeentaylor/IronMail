'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AiChat from '@/components/AiChat';

// JARVIS LANDING PAGE - The First Thing You See
export default function JarvisLanding() {
    const [showJarvis, setShowJarvis] = useState(true);
    const router = useRouter();

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000
        }}>
            {/* Auto-open Jarvis fullscreen on app start */}
            <div style={{ display: 'none' }}>
                <AiChat initialOpen={true} />
            </div>

            {/* Manual Jarvis component that's always open on this page */}
            <JarvisFullscreenWelcome router={router} />
        </div>
    );
}

// Dedicated fullscreen Jarvis welcome component
function JarvisFullscreenWelcome({ router }) {
    const [bootStep, setBootStep] = useState(0);
    const [bootComplete, setBootComplete] = useState(false);

    const BOOT_SEQUENCE = [
        { text: 'NEURAL INTERFACE DETECTED', delay: 0 },
        { text: 'INITIALIZING CORE SYSTEMS...', delay: 400 },
        { text: 'QUANTUM PROCESSORS: ONLINE', delay: 800 },
        { text: 'LANGUAGE MATRIX: LOADED', delay: 1100 },
        { text: 'WELCOME TO IRONMAIL', delay: 1500 },
        { text: 'J.A.R.V.I.S. READY', delay: 1900 },
    ];

    useEffect(() => {
        BOOT_SEQUENCE.forEach((step, index) => {
            setTimeout(() => {
                setBootStep(index + 1);
                if (index === BOOT_SEQUENCE.length - 1) {
                    setTimeout(() => {
                        setBootComplete(true);
                    }, 600);
                }
            }, step.delay);
        });
    }, []);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, #0a0e14 0%, #1a1f2e 50%, #0a0e14 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.5s ease-out'
        }}>
            {/* Animated Background Grid */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `
                    linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px',
                opacity: 0.3,
                pointerEvents: 'none'
            }} />

            {/* Glowing particles */}
            <div className="jarvis-particles-fullscreen" />

            {/* Boot Sequence or Welcome Screen */}
            {!bootComplete ? (
                <div style={{
                    position: 'relative',
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '3rem'
                }}>
                    <div style={{ position: 'relative', width: '250px', height: '250px' }}>
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '200px',
                            height: '200px',
                            borderRadius: '50%',
                            border: '3px solid rgba(0, 212, 255, 0.3)',
                            animation: 'pulse 2s ease-in-out infinite'
                        }} />
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '150px',
                            height: '150px',
                            borderRadius: '50%',
                            border: '2px solid rgba(0, 212, 255, 0.5)',
                            animation: 'pulse 2s ease-in-out infinite 0.5s'
                        }} />
                        <img
                            src="/jarvis-icon.png"
                            alt="Jarvis"
                            width={100}
                            height={100}
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                boxShadow: '0 0 60px rgba(0, 212, 255, 0.8)'
                            }}
                        />
                    </div>
                    <div style={{ textAlign: 'center', fontFamily: 'monospace', minHeight: '200px' }}>
                        {BOOT_SEQUENCE.slice(0, bootStep).map((step, i) => (
                            <div key={i} style={{
                                fontSize: '1.1rem',
                                color: '#00d4ff',
                                marginBottom: '0.75rem',
                                opacity: 0,
                                animation: 'fadeIn 0.3s ease-out forwards',
                                animationDelay: `${i * 0.1}s`,
                                letterSpacing: '0.1em',
                                fontWeight: i === BOOT_SEQUENCE.length - 1 ? 700 : 400
                            }}>
                                <span style={{ color: '#00ff88', marginRight: '0.75rem', fontSize: '1.2rem' }}>▸</span>
                                {step.text}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div style={{
                    position: 'relative',
                    zIndex: 10,
                    textAlign: 'center',
                    maxWidth: '800px',
                    padding: '2rem',
                    animation: 'fadeIn 0.5s ease-out'
                }}>
                    <div style={{ marginBottom: '3rem' }}>
                        <img
                            src="/jarvis-icon.png"
                            alt="Jarvis"
                            width={120}
                            height={120}
                            style={{
                                borderRadius: '50%',
                                objectFit: 'cover',
                                boxShadow: '0 0 80px rgba(0, 212, 255, 0.6)',
                                marginBottom: '2rem'
                            }}
                        />
                        <h1 style={{
                            fontSize: '3rem',
                            color: '#00d4ff',
                            marginBottom: '1rem',
                            fontWeight: 700,
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            textShadow: '0 0 30px rgba(0, 212, 255, 0.5)'
                        }}>
                            J.A.R.V.I.S
                        </h1>
                        <p style={{
                            fontSize: '1.3rem',
                            color: 'rgba(122, 162, 196, 0.9)',
                            marginBottom: '3rem',
                            letterSpacing: '0.05em'
                        }}>
                            Just A Rather Very Intelligent System
                        </p>
                    </div>

                    <div style={{
                        background: 'rgba(20, 35, 50, 0.6)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(0, 212, 255, 0.3)',
                        borderRadius: '16px',
                        padding: '2.5rem',
                        marginBottom: '3rem',
                        textAlign: 'left'
                    }}>
                        <p style={{
                            fontSize: '1.2rem',
                            color: '#f0f8ff',
                            lineHeight: '1.8',
                            marginBottom: '1.5rem'
                        }}>
                            👋 Welkom! Ik ben je persoonlijke AI assistent.
                        </p>
                        <p style={{
                            fontSize: '1rem',
                            color: 'rgba(122, 162, 196, 0.9)',
                            lineHeight: '1.8',
                            marginBottom: 0
                        }}>
                            Ik help je met alles: van emails schrijven tot algemene vragen beantwoorden.
                            Denk aan mij als je eigen ChatGPT, maar dan speciaal voor jouw workflow. 🚀
                        </p>
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        maxWidth: '400px',
                        margin: '0 auto'
                    }}>
                        <button
                            onClick={() => router.push('/inbox')}
                            style={{
                                padding: '1.25rem 2rem',
                                background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                                color: '#0a0e14',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 0 40px rgba(0, 212, 255, 0.5)',
                                transition: 'all 0.2s ease',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 0 60px rgba(0, 212, 255, 0.7)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 212, 255, 0.5)';
                            }}
                        >
                            🚀 Start Working
                        </button>

                        <p style={{
                            fontSize: '0.85rem',
                            color: 'rgba(122, 162, 196, 0.7)',
                            textAlign: 'center',
                            margin: '1rem 0 0 0'
                        }}>
                            💡 Tip: Klik op het Arc Reactor icoontje rechtsonder om mij te openen
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
