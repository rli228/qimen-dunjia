import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/common/Navigation';
import { ThemeProvider } from '@/components/common/ThemeProvider';

export const metadata: Metadata = {
  title: '奇门遁甲 — 排盘与解盘系统',
  description: '开源奇门遁甲排盘与解盘系统。时家奇门、转盘、拆补法/置闰法，支持规则解盘、用神分析、AI辅助解盘。面向初学者的学习与实践平台。',
  keywords: ['奇门遁甲', '排盘', '解盘', '时家奇门', '转盘', '八门', '九星', '十干克应', '用神'],
  authors: [{ name: 'rli228' }],
  openGraph: {
    title: '奇门遁甲 — 排盘与解盘系统',
    description: '开源奇门遁甲排盘与解盘系统，支持规则解盘、用神分析、AI辅助解盘',
    type: 'website',
    locale: 'zh_CN',
    url: 'https://qimen-dunjia-vert.vercel.app',
  },
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
