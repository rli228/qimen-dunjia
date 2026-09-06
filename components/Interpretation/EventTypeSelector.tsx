'use client';

import { EVENT_TYPES, type EventType } from '@/lib/ai/buildPrompt';

interface Props {
  value: EventType;
  onChange: (type: EventType) => void;
}

export function EventTypeSelector({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {EVENT_TYPES.map(type => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === type
              ? 'bg-qimen-gold text-white'
              : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  );
}
