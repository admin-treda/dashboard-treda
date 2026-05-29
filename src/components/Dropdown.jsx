import { useState, useRef, useEffect } from 'react';

export function Dropdown({ trigger, children, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
        onClick={() => setOpen(!open)}
      >
        {trigger}
      </button>
      {open && (
        <div
          className={`absolute top-full mt-1 z-50 min-w-[160px] bg-bg-card border border-border rounded-lg shadow-lg shadow-black/30 py-1 animate-[fadeIn_0.1s_ease-out] ${align === 'right' ? 'right-0' : 'left-0'}`}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'}`}
      onClick={onClick}
    >
      {icon && <span className="w-4 h-4 shrink-0">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

export function DropdownDivider() {
  return <div className="my-1 border-t border-border" />;
}
