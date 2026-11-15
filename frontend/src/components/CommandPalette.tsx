import React, { useEffect, useState } from 'react';
import { useRouter } from '../lib/router';
import { Search, Moon, Sun, ArrowRight, CornerDownLeft, Sliders, Layers } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
}) => {
  const { navigate } = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'page-overview',
      title: 'Go to Overview',
      category: 'Pages',
      icon: <ArrowRight className="w-4 h-4 text-accent" />,
      run: () => {
        navigate('/');
        onClose();
      },
    },
    {
      id: 'page-lab',
      title: 'Go to Interactive Lab',
      category: 'Pages',
      icon: <Sliders className="w-4 h-4 text-accent" />,
      run: () => {
        navigate('/lab');
        onClose();
      },
    },
    {
      id: 'page-compare',
      title: 'Go to Controller Compare',
      category: 'Pages',
      icon: <Layers className="w-4 h-4 text-accent" />,
      run: () => {
        navigate('/compare');
        onClose();
      },
    },
    {
      id: 'page-theory',
      title: 'Go to Theory & Equations',
      category: 'Pages',
      icon: <ArrowRight className="w-4 h-4 text-accent" />,
      run: () => {
        navigate('/theory');
        onClose();
      },
    },
    {
      id: 'theme',
      title: `Switch to ${theme === 'dark' ? 'Daylight Lab (Light)' : 'Abyss Dark'}`,
      category: 'Theme',
      icon: theme === 'dark' ? <Sun className="w-4 h-4 text-warm" /> : <Moon className="w-4 h-4 text-accent" />,
      run: () => {
        onToggleTheme();
        onClose();
      },
    },
  ];

  const filtered = actions.filter(
    a =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg panel overflow-hidden shadow-2xl bg-surface"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-border bg-surface-2/50">
          <Search className="w-4 h-4 text-muted mr-3" />
          <input
            type="text"
            className="w-full bg-transparent text-text placeholder-muted focus:outline-none text-sm font-sans"
            placeholder="Search pages or toggle theme..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            autoFocus
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-muted border border-border rounded bg-surface">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-muted text-xs">No matching commands.</div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                onClick={item.run}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-xs font-sans transition-colors ${
                  idx === selectedIndex ? 'bg-surface-2 text-text font-semibold' : 'text-muted hover:text-text'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  {item.icon}
                  <span>{item.title}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-muted uppercase">{item.category}</span>
                  {idx === selectedIndex && <CornerDownLeft className="w-3.5 h-3.5 text-accent" />}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
