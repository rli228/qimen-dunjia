import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/common/Navigation';
import { ThemeProvider } from '@/components/common/ThemeProvider';

export const metadata: Metadata = {
  title: '奇门遁甲 — 排盘系统',
  description: '开源奇门遁甲排盘与解盘系统，面向初学者的学习平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-qimen-bg text-qimen-text antialiased">
        <ThemeProvider>
          <Navigation />
          <main className="mx-auto max-w-6xl px-4 py-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
