/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { ConfirmDialog, Toast } from './shared';
import Icon from '@/components/Icon';

interface ContentLibraryProps {
  type: 'cv' | 'art' | 'work' | 'blog';
  onEdit: (item: any) => void;
  refreshTrigger: number; // Increment to force refetch
}

export default function ContentLibrary({ type, onEdit, refreshTrigger }: ContentLibraryProps) {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, refreshTrigger]);

  const fetchItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/content?type=${type}`);
      if (!res.ok) throw new Error('Failed to fetch content');
      const data = await res.json();
      setItems(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/content/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      setToast({ msg: 'Item deleted', type: 'success' });
      fetchItems();
    } catch (err: any) {
      setToast({ msg: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
      setDeleteConfirmId(null);
    }
  };

  const handleToggleStatus = async (item: any) => {
    const newStatus = item.status === 'published' ? 'draft' : 'published';
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/content/${item.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      
      setToast({ msg: `Item ${newStatus}`, type: 'success' });
      fetchItems();
    } catch (err: any) {
      setToast({ msg: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="text-center p-8 text-base text-[#625e56]" role="status">Loading…</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-600" role="alert">
      <p>{error}</p>
      <button type="button" onClick={fetchItems} className="mt-4 min-h-11 px-4 underline underline-offset-4">Try again</button>
    </div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center p-12 text-base border-2 border-dashed border-[#E5E5E5] rounded-xl text-[#625e56] mt-8">
        No {type.toUpperCase()} items found. Create one using the form.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up mt-8">
      {toast && <Toast type={toast.type} message={toast.msg} onClose={() => setToast(null)} />}
      
      <ConfirmDialog 
        isOpen={!!deleteConfirmId}
        title="Delete Content"
        message="Are you sure you want to delete this item? This will permanently remove its database record and all associated uploaded files. This action cannot be undone."
        confirmText={isProcessing ? "Deleting..." : "Delete Permanently"}
        danger={true}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <div className="flex items-center justify-between px-2 mb-4">
        <h3 className="font-bold text-[#1A1A1A]">Library ({items.length})</h3>
      </div>

      <div className="grid gap-3">
        {items.map(item => (
          <div key={item.id} className="flex flex-wrap sm:flex-nowrap gap-4 p-4 border border-[#E5E5E5] rounded-xl bg-white hover:border-[#1A1A1A] transition group">
            
            {/* Thumbnail */}
            <div className="w-16 h-16 bg-[#FAFAFA] rounded-lg shrink-0 overflow-hidden flex items-center justify-center border border-[#E5E5E5]">
              {item.media?.[0] ? (
                item.media[0].kind === 'image' ? (
                  <img src={item.media[0].blob_url} alt="" width={64} height={64} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <Icon name="file" className="text-[#625e56]" />
                )
              ) : (
                <Icon name="file" className="text-[#625e56]" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h4 className="font-semibold text-[#1A1A1A] truncate">{item.title}</h4>
              <div className="flex flex-wrap items-center gap-2 text-base sm:text-xs mt-1">
                <span className={`font-mono px-2 py-0.5 rounded-full ${
                  item.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {item.status}
                </span>
                <span className="text-[#625e56]">
                  {new Date(item.updated_at).toLocaleDateString()}
                </span>
                {item.type === 'art' && (
                  <span className="text-[#625e56]">Order: {item.sort_order}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex w-full sm:w-auto justify-end items-center gap-2">
              <button 
                type="button"
                onClick={() => handleToggleStatus(item)}
                disabled={isProcessing}
                aria-label={`${item.status === 'published' ? 'Unpublish' : 'Publish'} ${item.title}`}
                className="min-h-11 min-w-11 p-2 text-[#525252] hover:text-[#1A1A1A] hover:bg-[#FAFAFA] rounded-lg transition disabled:opacity-50"
                title={item.status === 'published' ? 'Unpublish' : 'Publish'}
              >
                <Icon name="eye" />
              </button>
              
              <button 
                type="button"
                onClick={() => onEdit(item)}
                disabled={isProcessing}
                aria-label={`Edit ${item.title}`}
                className="min-h-11 min-w-11 p-2 text-[#525252] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                title="Edit"
              >
                <Icon name="edit" />
              </button>
              
              <button 
                type="button"
                onClick={() => setDeleteConfirmId(item.id)}
                disabled={isProcessing}
                aria-label={`Delete ${item.title}`}
                className="min-h-11 min-w-11 p-2 text-[#525252] hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                title="Delete"
              >
                <Icon name="trash" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
