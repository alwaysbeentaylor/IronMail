import './globals.css';
import { Rajdhani } from 'next/font/google';
import Navigation from '@/components/Navigation';
import AiChat from '@/components/AiChat';
import AuthGuard from '@/components/AuthGuard';

const rajdhani = Rajdhani({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700']
});

export const metadata = {
    title: 'IronMail | Command Center',
    description: 'Advanced email management with J.A.R.V.I.S integration',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={rajdhani.className}>
                <AuthGuard>
                    <div className="app-container">
                        <Navigation />
                        <main className="main-content">
                            {children}
                        </main>
                        <AiChat />
                    </div>
                </AuthGuard>
            </body>
        </html>
    );
}
