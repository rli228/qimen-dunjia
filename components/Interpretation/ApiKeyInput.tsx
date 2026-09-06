'use client';

interface Props {
  apiKey: string;
  isValid: boolean;
  onChange: (key: string) => void;
}

export function ApiKeyInput({ apiKey, isValid, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="password"
        placeholder="sk-ant-..."
        value={apiKey}
        onChange={e => onChange(e.target.value)}
        className="flex-1 rounded-lg border border-qimen-border bg-qimen-bg px-3 py-2 text-sm"
      />
      <span className={`text-xs ${isValid ? 'text-qimen-green' : 'text-qimen-text-secondary'}`}>
        {isValid ? '已配置' : '未配置'}
      </span>
    </div>
  );
}
