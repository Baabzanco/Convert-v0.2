import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { AdminCmsBar } from './components/AdminCmsBar.js';
import { SeoDrawer } from './components/SeoDrawer.js';
import { RevisionsDrawer } from './components/RevisionsDrawer.js';
import { TOOL_REGISTRY, ToolDefinition } from './tools/registry.js';
import { ToolWorkspace } from './components/ToolWorkspace.js';
import { useTheme } from './hooks/useTheme.js';
import { Header } from './components/Header.js';
import { Hero } from './components/Hero.js';
import { ToolCatalog } from './components/ToolCatalog.js';
import { PrivacyArchitecture } from './components/PrivacyArchitecture.js';
import { FaqSection } from './components/FaqSection.js';
import { Footer } from './components/Footer.js';
import { AdminLoginModal } from './components/AdminLoginModal.js';

interface PageData {
  id: string;
  slug: string;
  title: string;
  status: string;
  version: number;
  hasUnpublishedChanges: boolean;
  publishedAt?: string | null;
  structuredContent: any;
  draftContent?: any;
  seoSettings?: any;
  revisions?: any[];
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export default function App() {
  // Theme state
  const { theme, toggleTheme } = useTheme();

  // Public vs Admin State
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState<'draft' | 'published'>('draft');

  // Working draft state (for inline editing)
  const [activeContent, setActiveContent] = useState<any>(null);

  // Category filter state ('all' | 'image' | 'pdf')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'image' | 'pdf'>('all');

  // CMS Modals & Feedback
  const [seoDrawerOpen, setSeoDrawerOpen] = useState(false);
  const [revisionsDrawerOpen, setRevisionsDrawerOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflictData, setConflictData] = useState<any | null>(null);

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('SecureAdminPassword2026!');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Active Tool state (for client-side processing workspace)
  const [activeToolId, setActiveToolId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const match = path.match(/^\/tools\/([a-zA-Z0-9_-]+)$/);
      if (match) {
        const found = TOOL_REGISTRY.find((t) => t.slug === match[1]);
        if (found) return found.id;
      }
    }
    return null;
  });

  // Synchronize browser history (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/tools\/([a-zA-Z0-9_-]+)$/);
      if (match) {
        const found = TOOL_REGISTRY.find((t) => t.slug === match[1]);
        if (found) {
          setActiveToolId(found.id);
          return;
        }
      }
      setActiveToolId(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update URL history when selecting a tool
  const navigateToTool = (toolId: string) => {
    const targetTool = TOOL_REGISTRY.find((t) => t.id === toolId);
    if (targetTool) {
      if (window.location.pathname !== targetTool.canonicalRoute) {
        window.history.pushState({ toolId: targetTool.id }, targetTool.name, targetTool.canonicalRoute);
      }
      setActiveToolId(targetTool.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigateToHome = () => {
    if (window.location.pathname !== '/' && window.location.pathname !== '/home') {
      window.history.pushState({}, 'Home', '/');
    }
    setActiveToolId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. Initial Load: Check Admin Auth & Fetch Page Data
  useEffect(() => {
    checkAdminAuthAndLoad();
  }, []);

  const checkAdminAuthAndLoad = async () => {
    setLoading(true);
    let currentUser: AdminUser | null = null;
    try {
      const authRes = await fetch('/api/admin/auth/me');
      if (authRes.ok) {
        const authData = await authRes.json();
        currentUser = authData.user;
        setAdminUser(currentUser);
      } else {
        setAdminUser(null);
      }
    } catch {
      setAdminUser(null);
    }

    await loadPage(currentUser);
    setLoading(false);
  };

  const loadPage = async (currentUser: AdminUser | null) => {
    try {
      if (currentUser) {
        // Authenticated Admin: Load via preview API to get draft & versions
        const pagesRes = await fetch('/api/admin/pages');
        if (pagesRes.ok) {
          const { pages } = await pagesRes.json();
          const homePageMeta = pages.find((p: any) => p.slug === 'home') || pages[0];
          if (homePageMeta) {
            const previewRes = await fetch(`/api/admin/pages/${homePageMeta.id}/preview`);
            if (previewRes.ok) {
              const { page: fullPage } = await previewRes.json();
              setPage(fullPage);
              const initialContent =
                fullPage.hasUnpublishedChanges && fullPage.draftContent
                  ? fullPage.draftContent
                  : fullPage.structuredContent;
              setActiveContent(initialContent);
              return;
            }
          }
        }
      }

      // Anonymous visitor or fallback: Load strictly through public published endpoint
      const pubRes = await fetch('/api/public/pages/home');
      if (pubRes.ok) {
        const { page: pubPage } = await pubRes.json();
        setPage(pubPage);
        setActiveContent(pubPage.structuredContent);
      }
    } catch (err) {
      console.error('Failed to load page content:', err);
    }
  };

  // 2. Inline Content Modification Handlers
  const handleUpdateHero = (field: string, val: string) => {
    if (!activeContent) return;
    setActiveContent({
      ...activeContent,
      hero: {
        ...activeContent.hero,
        [field]: val,
      },
    });
  };

  const handleUpdateSection = (index: number, field: string, val: string) => {
    if (!activeContent || !activeContent.sections) return;
    const updated = [...activeContent.sections];
    updated[index] = { ...updated[index], [field]: val };
    setActiveContent({ ...activeContent, sections: updated });
  };

  const handleUpdateFaq = (index: number, field: string, val: string) => {
    if (!activeContent || !activeContent.faq) return;
    const updated = [...activeContent.faq];
    updated[index] = { ...updated[index], [field]: val };
    setActiveContent({ ...activeContent, faq: updated });
  };

  const handleUpdateTool = (field: string, val: string) => {
    if (!activeContent) return;
    setActiveContent({
      ...activeContent,
      toolDescription: {
        ...activeContent.toolDescription,
        [field]: val,
      },
    });
  };

  // 3. Save Draft (PUT /api/admin/pages/:id/draft)
  const handleSaveDraft = async () => {
    if (!page || !adminUser) return;
    setIsSaving(true);
    setSaveError(null);
    setConflictData(null);

    try {
      const res = await fetch(`/api/admin/pages/${page.id}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: page.version,
          draftContent: activeContent,
          changeSummary: 'Updated draft via inline editor',
        }),
      });

      const data = await res.json();
      if (res.status === 409) {
        setConflictData(data);
        setSaveError(data.error);
        return;
      }

      if (!res.ok) {
        setSaveError(data.error || 'Failed to save draft');
        return;
      }

      // Update local page version
      setPage(data.page);
    } catch (err: any) {
      setSaveError(err.message || 'Network error saving draft');
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Publish (POST /api/admin/pages/:id/publish)
  const handlePublish = async () => {
    if (!page || !adminUser) return;
    setIsSaving(true);
    setSaveError(null);
    setConflictData(null);

    try {
      const res = await fetch(`/api/admin/pages/${page.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: page.version,
          content: activeContent,
          changeSummary: 'Published live changes via inline editor',
        }),
      });

      const data = await res.json();
      if (res.status === 409) {
        setConflictData(data);
        setSaveError(data.error);
        return;
      }

      if (!res.ok) {
        setSaveError(data.error || 'Failed to publish');
        return;
      }

      setPage(data.page);
      setActiveContent(data.page.structuredContent);
    } catch (err: any) {
      setSaveError(err.message || 'Error publishing');
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Revert Draft
  const handleRevertDraft = async () => {
    if (!page || !adminUser) return;
    if (!confirm('Are you sure you want to discard your draft changes?')) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/pages/${page.id}/revert-draft`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPage(data.page);
        setActiveContent(data.page.structuredContent);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Save SEO
  const handleSaveSeo = async (newSeo: any) => {
    if (!page || !adminUser) return false;
    try {
      const res = await fetch(`/api/admin/pages/${page.id}/seo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSeo),
      });
      if (res.ok) {
        const data = await res.json();
        setPage({ ...page, seoSettings: data.seoSettings });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // 7. Restore Revision
  const handleRestoreRevision = async (revisionId: string, revisionNumber: number) => {
    if (!page || !adminUser) return false;
    const res = await fetch(`/api/admin/pages/${page.id}/revisions/${revisionId}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedPageVersion: page.version,
        changeSummary: `Restored revision #${revisionNumber}`,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setPage(data.page);
      setActiveContent(data.page.structuredContent);
      return true;
    }
    throw new Error(data.error || 'Failed to restore revision');
  };

  // 8. Admin Authentication Handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminUser(data.user);
        setLoginModalOpen(false);
        await loadPage(data.user);
      } else {
        setLoginError(data.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } finally {
      setAdminUser(null);
      await loadPage(null);
    }
  };

  // Determine current display content
  const isEditingEnabled = Boolean(adminUser && previewMode === 'draft');
  const displayContent =
    adminUser && previewMode === 'published' && page?.structuredContent
      ? page.structuredContent
      : activeContent || page?.structuredContent || {};

  const hero = displayContent.hero || {
    headline: 'Free, Privacy-First Online Image & PDF Tools',
    subheadline: 'Process confidential documents and images 100% inside your browser memory. Zero server uploads, zero logs, zero subscriptions.',
    ctaText: 'Browse All 9 Tools',
    ctaLink: '#tools',
  };

  const sections = displayContent.sections || [
    {
      id: 'sec-architecture',
      title: 'Infrastructure Overview',
      content: 'Direct PostgreSQL connectivity without third-party vendor lock-in or Firebase dependencies.',
    },
    {
      id: 'sec-security',
      title: 'Defense in Depth',
      content: 'Argon2id password hashing, HTTP-only SameSite cookies, audit logs, and SQL injection prevention.',
    },
  ];

  const toolDescription = displayContent.toolDescription || {
    name: 'Zero-Upload Browser Processing',
    description: 'All document conversion, audio transcoding, and image manipulation runs 100% locally in your browser memory.',
  };

  const faqList = displayContent.faq || [
    {
      question: 'Are my converted files uploaded or stored on the server?',
      answer: 'No. The application strictly executes all file processing client-side in the browser. The server has zero file storage tables or upload endpoints.',
    },
    {
      question: 'How is application content and metadata managed?',
      answer: 'All content, SEO tags, and page revisions persist in a standalone PostgreSQL database using Prisma ORM with version-controlled migrations.',
    },
    {
      question: 'Is Firebase used anywhere in this architecture?',
      answer: 'No. Firebase is explicitly prohibited. Authentication and session state use Argon2id and HTTP-only SameSite cookies directly on PostgreSQL.',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white transition-colors duration-150">
      {/* 1. Admin CMS Toolbar (Rendered ONLY for Authenticated Administrators) */}
      {adminUser && page && (
        <AdminCmsBar
          adminUser={adminUser}
          pageTitle={page.title}
          version={page.version}
          hasUnpublishedChanges={Boolean(page.hasUnpublishedChanges)}
          isSaving={isSaving}
          saveError={saveError}
          conflictData={conflictData}
          previewMode={previewMode}
          onTogglePreviewMode={() => setPreviewMode(previewMode === 'draft' ? 'published' : 'draft')}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
          onRevertDraft={handleRevertDraft}
          onOpenSeo={() => setSeoDrawerOpen(true)}
          onOpenRevisions={() => setRevisionsDrawerOpen(true)}
          onLogout={handleLogout}
        />
      )}

      {/* 2. Public Navigation Header */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        adminUser={adminUser}
        onOpenLoginModal={() => setLoginModalOpen(true)}
        onNavigateHome={navigateToHome}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* 3. Main Public Page Content */}
      <main className="flex-1">
        {activeToolId ? (
          <div className="py-8 md:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <ToolWorkspace
              tool={TOOL_REGISTRY.find((t) => t.id === activeToolId) || TOOL_REGISTRY[0]}
              onBackToTools={navigateToHome}
              onSelectTool={navigateToTool}
              isEditingEnabled={isEditingEnabled}
            />
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <Hero
              hero={hero}
              onUpdateHero={handleUpdateHero}
              isEditingEnabled={isEditingEnabled}
              onExploreTools={() => {
                const toolsSection = document.getElementById('tools');
                if (toolsSection) {
                  toolsSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            />

            {/* Client-Side Image & PDF Tools Catalog */}
            <ToolCatalog
              onSelectTool={navigateToTool}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Privacy Architecture & How It Works */}
            <PrivacyArchitecture
              sections={sections}
              onUpdateSection={handleUpdateSection}
              isEditingEnabled={isEditingEnabled}
              toolDescription={toolDescription}
              onUpdateToolDesc={handleUpdateTool}
            />

            {/* FAQ Accordion Section */}
            <FaqSection
              faqList={faqList}
              onUpdateFaq={handleUpdateFaq}
              isEditingEnabled={isEditingEnabled}
            />
          </>
        )}
      </main>

      {/* 4. Public Footer */}
      <Footer
        onSelectTool={navigateToTool}
        onOpenLoginModal={() => setLoginModalOpen(true)}
        onNavigateHome={navigateToHome}
        adminUser={adminUser}
      />

      {/* 5. Drawers & Modals */}
      {page && (
        <>
          <SeoDrawer
            isOpen={seoDrawerOpen}
            onClose={() => setSeoDrawerOpen(false)}
            pageId={page.id}
            pageSlug={page.slug}
            initialSeo={page.seoSettings}
            onSaveSeo={handleSaveSeo}
          />

          <RevisionsDrawer
            isOpen={revisionsDrawerOpen}
            onClose={() => setRevisionsDrawerOpen(false)}
            pageId={page.id}
            currentVersion={page.version}
            revisions={page.revisions || []}
            onRestoreRevision={handleRestoreRevision}
          />
        </>
      )}

      {/* Admin Login Dialog */}
      <AdminLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSubmit={handleLoginSubmit}
        username={loginUsername}
        setUsername={setLoginUsername}
        password={loginPassword}
        setPassword={setLoginPassword}
        error={loginError}
        loading={loginLoading}
      />
    </div>
  );
}
