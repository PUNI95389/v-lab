import React from 'react';

export type AppView = 'curriculum' | 'workbench' | 'progress' | 'teacher';

interface TopBarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onPrimaryAction: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ activeView, onNavigate, onPrimaryAction }) => {
  const navItems: { id: AppView; label: string }[] = [
    { id: 'curriculum', label: 'Curriculum' },
    { id: 'workbench', label: 'Live Lab' },
    { id: 'progress', label: 'Progress' },
    { id: 'teacher', label: 'Teacher Desk' },
  ];

  const primaryLabel = activeView === 'teacher' ? 'New Course' : 'Open Workbench';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element brand wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('curriculum')}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded"
        >
          Principia Labs
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav aria-label="Primary Navigation" className="flex items-center gap-5 sm:gap-7 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`py-2 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                  isActive
                    ? 'border-sky-600 text-slate-900'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="shrink-0 hidden sm:flex items-center">
          <button
            type="button"
            onClick={onPrimaryAction}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </header>
  );
};
