import React, { useState } from 'react';
import { X, Check, Search, AlertCircle } from 'lucide-react';

interface SeoData {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  robots?: string;
  preferredH1?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  structuredData?: any;
}

interface SeoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  pageSlug: string;
  initialSeo: SeoData | null;
  onSaveSeo: (newSeo: SeoData) => Promise<boolean>;
}

export function SeoDrawer({
  isOpen,
  onClose,
  pageSlug,
  initialSeo,
  onSaveSeo,
}: SeoDrawerProps) {
  const [formData, setFormData] = useState<SeoData>({
    metaTitle: initialSeo?.metaTitle || '',
    metaDescription: initialSeo?.metaDescription || '',
    canonicalUrl: initialSeo?.canonicalUrl || '',
    robots: initialSeo?.robots || 'index, follow',
    preferredH1: initialSeo?.preferredH1 || '',
    ogTitle: initialSeo?.ogTitle || '',
    ogDescription: initialSeo?.ogDescription || '',
    ogImage: initialSeo?.ogImage || '',
    twitterCard: initialSeo?.twitterCard || 'summary_large_image',
    structuredData: initialSeo?.structuredData || null,
  });

  const [jsonString, setJsonString] = useState(
    initialSeo?.structuredData ? JSON.stringify(initialSeo.structuredData, null, 2) : ''
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (initialSeo) {
      setFormData({
        metaTitle: initialSeo.metaTitle || '',
        metaDescription: initialSeo.metaDescription || '',
        canonicalUrl: initialSeo.canonicalUrl || '',
        robots: initialSeo.robots || 'index, follow',
        preferredH1: initialSeo.preferredH1 || '',
        ogTitle: initialSeo.ogTitle || '',
        ogDescription: initialSeo.ogDescription || '',
        ogImage: initialSeo.ogImage || '',
        twitterCard: initialSeo.twitterCard || 'summary_large_image',
        structuredData: initialSeo.structuredData || null,
      });
      setJsonString(
        initialSeo.structuredData ? JSON.stringify(initialSeo.structuredData, null, 2) : ''
      );
    }
  }, [initialSeo]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError(null);
    setUrlError(null);

    // Validate Canonical URL if present
    if (formData.canonicalUrl && formData.canonicalUrl.trim() !== '') {
      try {
        const u = new URL(formData.canonicalUrl);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          setUrlError('Canonical URL must use http:// or https://');
          return;
        }
      } catch {
        setUrlError('Canonical URL is not a valid absolute URL');
        return;
      }
    }

    // Validate Structured Data JSON
    let parsedJson = null;
    if (jsonString.trim()) {
      try {
        parsedJson = JSON.parse(jsonString);
        if (typeof parsedJson !== 'object' || parsedJson === null) {
          throw new Error('Structured data must be a JSON object');
        }
      } catch (err: any) {
        setJsonError(`Invalid JSON-LD schema: ${err.message}`);
        return;
      }
    }

    setIsSubmitting(true);
    const success = await onSaveSeo({
      ...formData,
      structuredData: parsedJson,
    });
    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-700 h-full overflow-y-auto text-slate-100 p-6 flex flex-col justify-between shadow-2xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-base font-semibold text-white">Per-Page SEO & Metadata Settings</h3>
                <p className="text-xs text-slate-400">Page Slug: /{pageSlug}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form id="seo-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Preferred H1 */}
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Preferred H1 (Semantic Content Structure)
              </label>
              <input
                type="text"
                value={formData.preferredH1 || ''}
                onChange={(e) => setFormData({ ...formData, preferredH1: e.target.value })}
                placeholder="Target Primary H1 Heading"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            {/* Meta Title */}
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                SEO Title ({formData.metaTitle?.length || 0}/60 recommended)
              </label>
              <input
                type="text"
                value={formData.metaTitle || ''}
                onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                maxLength={200}
                placeholder="High Performance Content Platform"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            {/* Meta Description */}
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Meta Description ({formData.metaDescription?.length || 0}/160 recommended)
              </label>
              <textarea
                rows={3}
                value={formData.metaDescription || ''}
                onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                maxLength={500}
                placeholder="Brief summary for search engine snippet..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            {/* Canonical URL */}
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Canonical URL
              </label>
              <input
                type="url"
                value={formData.canonicalUrl || ''}
                onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                placeholder="https://example.com/canonical-page"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white font-mono text-[11px] focus:border-sky-500 focus:outline-none"
              />
              {urlError && <p className="text-rose-400 mt-1">{urlError}</p>}
            </div>

            {/* Robots Directive */}
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Robots Directives
              </label>
              <select
                value={formData.robots || 'index, follow'}
                onChange={(e) => setFormData({ ...formData, robots: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="index, follow">index, follow (Default Public Indexing)</option>
                <option value="noindex, follow">noindex, follow (Exclude from Search, Follow Links)</option>
                <option value="noindex, nofollow">noindex, nofollow (Complete Exclusion)</option>
              </select>
            </div>

            {/* Open Graph Title & Description */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block font-medium text-slate-300 mb-1">OG Title</label>
                <input
                  type="text"
                  value={formData.ogTitle || ''}
                  onChange={(e) => setFormData({ ...formData, ogTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-white"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Twitter Card</label>
                <select
                  value={formData.twitterCard || 'summary_large_image'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      twitterCard: e.target.value as 'summary' | 'summary_large_image',
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-white"
                >
                  <option value="summary_large_image">summary_large_image</option>
                  <option value="summary">summary</option>
                </select>
              </div>
            </div>

            {/* Structured Data (JSON-LD) */}
            <div className="pt-2 border-t border-slate-800">
              <label className="block font-medium text-slate-300 mb-1">
                Structured Data (Schema.org JSON-LD)
              </label>
              <textarea
                rows={5}
                value={jsonString}
                onChange={(e) => {
                  setJsonString(e.target.value);
                  setJsonError(null);
                }}
                placeholder='{ "@context": "https://schema.org", "@type": "WebSite", ... }'
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white font-mono text-[11px] focus:border-sky-500 focus:outline-none"
              />
              {jsonError && (
                <div className="p-2 mt-1 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {jsonError}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="seo-form"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            {isSubmitting ? 'Saving SEO...' : 'Save SEO Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
