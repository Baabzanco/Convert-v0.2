import React, { useState } from 'react';
import {
  Shield,
  Sun,
  Moon,
  KeyRound,
  Menu,
  X,
  Layers,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Theme } from '../hooks/useTheme.js';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  adminUser: { id: string; username: string; role: string } | null;
  onOpenLoginModal: () => void;
  onNavigateHome: () => void;
  selectedCategory: 'all' | 'image' | 'pdf';
  onSelectCategory: (cat: 'all' | 'image' | 'pdf') => void;
}

export function Header({
  theme,
  onToggleTheme,
  adminUser,
  onOpenLoginModal,
  onNavigateHome,
  selectedCategory,
  onSelectCategory,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleCategoryClick = (cat: 'all' | 'image' | 'pdf') => {
    onNavigateHome();
    onSelectCategory(cat);
    setMobileMenuOpen(false);
    // Smooth scroll to tools section if on home
    const toolsSec = document.getElementById('tools');
    if (toolsSec) {
      toolsSec.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavAnchor = (id: string) => {
    onNavigateHome();
    setMobileMenuOpen(false);
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer select-none group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onNavigateHome();
          }}
          aria-label="BrowserSuite Homepage"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight leading-none">
                Browser<span className="text-sky-600 dark:text-sky-400">Suite</span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80">
                Privacy 1st
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-none mt-0.5 hidden sm:inline">
              Zero Server Uploads • In-Browser Tools
            </span>
          </div>
        </div>

        {/* Desktop Primary Navigation */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm text-slate-600 dark:text-slate-300" aria-label="Main Navigation">
          <button
            type="button"
            onClick={() => handleCategoryClick('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 font-semibold'
                : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Tools
          </button>
          <button
            type="button"
            onClick={() => handleCategoryClick('image')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'image'
                ? 'bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 font-semibold'
                : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Image Tools
          </button>
          <button
            type="button"
            onClick={() => handleCategoryClick('pdf')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'pdf'
                ? 'bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 font-semibold'
                : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            PDF Tools
          </button>
          <button
            type="button"
            onClick={() => handleNavAnchor('architecture')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            Security & Privacy
          </button>
          <button
            type="button"
            onClick={() => handleNavAnchor('faq')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            FAQ
          </button>
        </nav>

        {/* Right Action Controls: Theme Toggle & Admin Portal */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Admin Portal Button */}
          {!adminUser ? (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-300 dark:border-slate-700/80 transition cursor-pointer shadow-xs"
            >
              <KeyRound className="w-3.5 h-3.5 text-sky-500" />
              <span className="hidden sm:inline">Admin Portal</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Admin: {adminUser.username}</span>
            </div>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="md:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 pt-3 pb-5 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 pt-1">
            Tool Categories
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleCategoryClick('all')}
              className={`px-3 py-2 text-xs font-medium rounded-lg text-center ${
                selectedCategory === 'all'
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              All Tools (9)
            </button>
            <button
              type="button"
              onClick={() => handleCategoryClick('image')}
              className={`px-3 py-2 text-xs font-medium rounded-lg text-center ${
                selectedCategory === 'image'
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              Image (5)
            </button>
            <button
              type="button"
              onClick={() => handleCategoryClick('pdf')}
              className={`px-3 py-2 text-xs font-medium rounded-lg text-center ${
                selectedCategory === 'pdf'
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              PDF (4)
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => handleNavAnchor('architecture')}
              className="text-left px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              Security & In-Browser Architecture
            </button>
            <button
              type="button"
              onClick={() => handleNavAnchor('faq')}
              className="text-left px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              Frequently Asked Questions
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
