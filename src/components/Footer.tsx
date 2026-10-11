import React from 'react';
import { Shield, Lock, KeyRound, ExternalLink, Heart } from 'lucide-react';
import { TOOL_REGISTRY } from '../tools/registry.js';

interface FooterProps {
  onSelectTool: (toolId: string) => void;
  onOpenLoginModal: () => void;
  onNavigateHome: () => void;
  adminUser: { id: string; username: string; role: string } | null;
}

export function Footer({
  onSelectTool,
  onOpenLoginModal,
  onNavigateHome,
  adminUser,
}: FooterProps) {
  const imageTools = TOOL_REGISTRY.filter((t) => t.category === 'image');
  const pdfTools = TOOL_REGISTRY.filter((t) => t.category === 'pdf');

  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <div
              onClick={onNavigateHome}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-md">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                Browser<span className="text-sky-600 dark:text-sky-400">Suite</span>
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              High-performance, privacy-first image and PDF tools running 100% in your browser.
              Your confidential files never leave your computer or touch our servers.
            </p>

            <div className="flex items-center gap-2 pt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>Zero server file transmission guaranteed</span>
            </div>
          </div>

          {/* Image Tools Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Image Tools
            </h4>
            <ul className="space-y-2">
              {imageTools.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onSelectTool(t.id)}
                    className="hover:text-sky-600 dark:hover:text-sky-400 transition text-left cursor-pointer"
                  >
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* PDF Tools Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              PDF Tools
            </h4>
            <ul className="space-y-2">
              {pdfTools.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onSelectTool(t.id)}
                    className="hover:text-sky-600 dark:hover:text-sky-400 transition text-left cursor-pointer"
                  >
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Architecture & Administration Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              System & Admin
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#architecture" className="hover:text-sky-600 dark:hover:text-sky-400 transition">
                  In-Browser Architecture
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-sky-600 dark:hover:text-sky-400 transition">
                  FAQ & Security
                </a>
              </li>
              <li>
                <a href="/sitemap.xml" className="hover:text-sky-600 dark:hover:text-sky-400 transition" target="_blank" rel="noreferrer">
                  XML Sitemap
                </a>
              </li>
              <li>
                <a href="/robots.txt" className="hover:text-sky-600 dark:hover:text-sky-400 transition" target="_blank" rel="noreferrer">
                  Robots.txt
                </a>
              </li>
              <li className="pt-2">
                {!adminUser ? (
                  <button
                    type="button"
                    onClick={onOpenLoginModal}
                    className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400 hover:underline font-medium cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Administrator Sign-In</span>
                  </button>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Authenticated: {adminUser.username}
                  </span>
                )}
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>
            © {new Date().getFullYear()} BrowserSuite. Free &amp; Open Client-Side Utilities.
          </div>
          <div className="flex items-center gap-4">
            <span>Client-Side Processing (v1.0.0)</span>
            <span>·</span>
            <span>PostgreSQL &amp; Prisma CMS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
