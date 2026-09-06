'use client';

import Link from 'next/link';
import { useTheme } from './ThemeProvider';

export function Navigation() {
  const { theme, toggle } = useTheme();

  return (
    <nav className="border-b border-qimen-border bg-qimen-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-qimen-gold">
          奇门遁甲
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm hover:text-qimen-gold transition-colors">
            排盘
          </Link>
          <Link href="/encyclopedia" className="text-sm hover:text-qimen-gold transition-colors">
            百科
          </Link>
          <Link href="/classics" className="text-sm hover:text-qimen-gold transition-colors">
            古籍
          </Link>

          <button
            onClick={toggle}
            className="rounded-lg border border-qimen-border px-2 py-1 text-sm transition-colors hover:bg-qimen-border"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </nav>
  );
}
