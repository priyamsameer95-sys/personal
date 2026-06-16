/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CvForm from '@/components/admin/CvForm';
import ArtForm from '@/components/admin/ArtForm';
import WorkForm from '@/components/admin/WorkForm';
import BlogForm from '@/components/admin/BlogForm';
import ContentLibrary from '@/components/admin/ContentLibrary';
import { ConfirmDialog } from '@/components/admin/shared';

type TabType = 'cv' | 'art' | 'work' | 'blog';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('cv');
  const [editItem, setEditItem] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabType | null>(null);

  // Unsaved changes warning for tab switch
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleTabClick = (tab: TabType) => {
    if (tab === activeTab) return;
    if (isDirty) {
      setPendingTab(tab);
    } else {
      switchTab(tab);
    }
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setEditItem(null);
    setIsDirty(false);
    setPendingTab(null);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/minforyam/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const handleSuccess = () => {
    setEditItem(null);
    setIsDirty(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const renderForm = () => {
    // We key the forms by editItem?.id or 'new' to force unmount/remount when switching items
    const key = editItem ? editItem.id : 'new';
    switch (activeTab) {
      case 'cv': return <CvForm key={key} editItem={editItem} onSuccess={handleSuccess} onDirtyChange={setIsDirty} />;
      case 'art': return <ArtForm key={key} editItem={editItem} onSuccess={handleSuccess} onDirtyChange={setIsDirty} />;
      case 'work': return <WorkForm key={key} editItem={editItem} onSuccess={handleSuccess} onDirtyChange={setIsDirty} />;
      case 'blog': return <BlogForm key={key} editItem={editItem} onSuccess={handleSuccess} onDirtyChange={setIsDirty} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans pb-16">
      
      <ConfirmDialog 
        isOpen={!!pendingTab}
        title="Unsaved Changes"
        message="You have unsaved changes in the current form. If you switch tabs, these changes will be lost. Do you want to proceed?"
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        danger={true}
        onConfirm={() => pendingTab && switchTab(pendingTab)}
        onCancel={() => setPendingTab(null)}
      />

      <header className="border-b border-[#E5E5E5] bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-mono text-sm font-bold tracking-[0.1em] uppercase text-[#1A1A1A] m-0">
              Priyam Sameer
            </h1>
            <span className="text-xs font-mono py-1 px-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-[#525252]">
              Admin
            </span>
          </div>
          
          <div className="flex gap-1 bg-[#FAFAFA] p-1 rounded-xl border border-[#E5E5E5]">
            {(['cv', 'art', 'work', 'blog'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => handleTabClick(tab)}
                className={`px-6 py-1.5 rounded-lg text-sm font-semibold transition ${
                  activeTab === tab 
                    ? 'bg-white shadow-sm border border-[#E5E5E5] text-[#1A1A1A]' 
                    : 'text-[#8C8C8C] hover:text-[#525252]'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 border border-[#E5E5E5] hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-sm font-semibold rounded-xl transition"
          >
            <span className="material-symbols-rounded text-base select-none">logout</span>
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Column: Form */}
        <section className="bg-white border border-[#E5E5E5] p-8 rounded-2xl shadow-sm relative">
          <div className="flex justify-between items-center mb-6 border-b border-[#E5E5E5] pb-4">
            <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2 font-sans">
              <span className="material-symbols-rounded text-[#8C8C8C]">
                {editItem ? 'edit_document' : 'add_circle'}
              </span>
              {editItem ? `Edit ${activeTab.toUpperCase()}` : `New ${activeTab.toUpperCase()}`}
            </h2>
            {editItem && (
              <button 
                onClick={() => {
                  if (isDirty) {
                    if (confirm('Discard unsaved changes?')) {
                      setEditItem(null);
                      setIsDirty(false);
                    }
                  } else {
                    setEditItem(null);
                  }
                }}
                className="text-sm font-semibold text-[#525252] hover:text-[#1A1A1A] underline"
              >
                Cancel Edit
              </button>
            )}
          </div>
          
          {renderForm()}
        </section>

        {/* Right Column: Library */}
        <section className="sticky top-24">
          <ContentLibrary 
            type={activeTab} 
            onEdit={(item) => {
              if (isDirty) {
                if (confirm('Discard unsaved changes?')) {
                  setEditItem(item);
                  setIsDirty(false);
                }
              } else {
                setEditItem(item);
              }
            }} 
            refreshTrigger={refreshTrigger} 
          />
        </section>
      </main>
    </div>
  );
}
