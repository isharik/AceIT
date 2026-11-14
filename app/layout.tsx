import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'AceIt — Interview practice that sounds like you', description: 'Thoughtful practice for AI training and evaluation roles.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
