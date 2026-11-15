import React from 'react';
import { useRouter } from '../lib/router';
import { Sun, Moon, Search } from 'lucide-react';

interface NavbarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenCommandPalette: () => void;
  isLiveApi: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  onToggleTheme,
  onOpenCommandPalette,
  isLiveApi,
}) => {
  const { route, navigate } = useRouter();

  const navLinks = [
    { path: '/', label: 'Overview' },
    { path: '/lab', label: 'Lab' },
    { path: '/compare', label: 'Compare' },
    { path: '/theory', label: 'Theory' },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="max-w-site mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand + Status dot */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/')}
            className="text-left group flex items-center space-x-2.5 focus:outline-none"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-accent group-hover:scale-110 transition-transform" />
            <span className="font-display font-bold text-base tracking-wide text-text">
              Thermal Optimizer
            </span>
          </button>

          <span className="hidden sm:inline-block text-muted/30">|</span>

          {/* Engine status indicator */}
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-muted font-sans">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLiveApi ? 'bg-accent animate-pulse' : 'bg-warm'
              }`}
            />
            <span>{isLiveApi ? 'Live engine' : 'Using saved results'}</span>
          </div>
        </div>

        {/* 4-Page Navigation */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          {navLinks.map(({ path, label }) => {
            const isActive = route === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? 'text-accent bg-surface-2 border border-border font-semibold'
                    : 'text-muted hover:text-text'
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          {/* Quick Command Palette Hint */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md border border-border bg-surface text-muted hover:text-text text-xs transition-colors"
            title="Search or jump (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-accent" />
            <span className="hidden md:inline font-mono text-[11px]">⌘K</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-md border border-border bg-surface text-muted hover:text-text transition-colors"
            title={theme === 'dark' ? 'Switch to Daylight Lab' : 'Switch to Abyss Dark'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-warm" />
            ) : (
              <Moon className="w-4 h-4 text-accent" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
