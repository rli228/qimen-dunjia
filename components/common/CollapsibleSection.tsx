'use client';

import { useState } from 'react';

interface Props {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  titleClass?: string;
}

export function CollapsibleSection({ title, defaultOpen = false, children, titleClass }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-qimen-border bg-qimen-surface">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <h2 className={titleClass ?? 'text-lg font-bold text-qimen-gold'}>{title}</h2>
        <span className={`text-qimen-text-secondary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="border-t border-qimen-border px-6 pb-6 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}
