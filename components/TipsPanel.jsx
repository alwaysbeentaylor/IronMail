import { Info, CheckCircle, Zap, ShieldCheck } from 'lucide-react';

export default function TipsPanel() {
    const tips = [
        { icon: Zap, title: 'Engagement', text: 'Stuur emails tussen 9:00 en 11:00 voor de hoogste open-rate.' },
        { icon: CheckCircle, title: 'Subject Lines', text: 'Houd je onderwerpregels onder de 50 karakters.' },
        { icon: ShieldCheck, title: 'Spam Prevention', text: 'Vermijd woorden als "GRATIS" of "NU!!!" in hoofdletters.' },
        { icon: Info, title: 'HTML Best Practice', text: 'Gebruik inline CSS voor maximale compatibiliteit.' }
    ];

    return (
        <div className="card" style={{ padding: '1.25rem', background: 'var(--bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Info size={18} color="var(--warning)" />
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Tips & Tricks</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {tips.map((tip, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.75rem' }}>
                        <div style={{ paddingTop: '0.2rem' }}>
                            <tip.icon size={16} color="var(--text-muted)" />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>{tip.title}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{tip.text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
