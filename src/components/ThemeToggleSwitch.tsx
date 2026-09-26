import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleSwitchProps {
  theme: 'dark' | 'light';
  onToggle: () => void;
  className?: string;
  showLabels?: boolean;
}

export const ThemeToggleSwitch: React.FC<ThemeToggleSwitchProps> = ({
  theme,
  onToggle,
  className = '',
  showLabels = true,
}) => {
  const isLight = theme === 'light';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showLabels && (
        <span className="text-[11px] font-semibold text-slate-400 hidden md:inline select-none">
          {isLight ? 'High-Contrast Light' : 'Full Dark Mode'}
        </span>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={isLight}
        aria-label={`Switch to ${isLight ? 'Full Dark Mode' : 'High-Contrast Light Theme'}`}
        onClick={onToggle}
        className={`relative inline-flex items-center h-8 w-16 rounded-full p-1 transition-colors duration-300 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner border touch-manipulation ${
          isLight
            ? 'bg-amber-100 border-amber-300 text-amber-700'
            : 'bg-slate-950 border-slate-700 text-blue-400'
        }`}
        title={`Current: ${isLight ? 'High-Contrast Light' : 'Dark Mode'}. Click to toggle.`}
      >
        {/* Track Icons */}
        <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] pointer-events-none">
          <Sun className={`w-3.5 h-3.5 transition-opacity duration-200 ${isLight ? 'opacity-0' : 'opacity-70 text-amber-400'}`} />
          <Moon className={`w-3.5 h-3.5 transition-opacity duration-200 ${isLight ? 'opacity-70 text-indigo-600' : 'opacity-0'}`} />
        </div>

        {/* Sliding Pill Thumb */}
        <div
          className={`relative z-10 w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ease-spring flex items-center justify-center ${
            isLight
              ? 'translate-x-8 bg-amber-500 text-white shadow-amber-500/40'
              : 'translate-x-0 bg-blue-600 text-white shadow-blue-600/40'
          }`}
        >
          {isLight ? (
            <Sun className="w-3.5 h-3.5 text-white animate-spin-once" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-white" />
          )}
        </div>
      </button>
    </div>
  );
};
