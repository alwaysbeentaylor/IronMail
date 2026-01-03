import './globals.css';
import { Rajdhani } from 'next/font/google';
import Navigation from '@/components/Navigation';
import AiChat from '@/components/AiChat';

const rajdhani = Rajdhani({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700']
});

export const metadata = {
    title: 'S-MAILER | Stark Command Center',
    description: 'Advanced email management with Jarvis integration',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={rajdhani.className}>
                <div className="app-container">
                    <Navigation />
                    <main className="main-content">
                        {children}
                    </main>
                    <AiChat />
                </div>
            </body>
        </html>
    );
}
