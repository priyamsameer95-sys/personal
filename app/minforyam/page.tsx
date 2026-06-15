'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ContentItem {
  id: string;
  title: string;
  description: string;
  category: 'art' | 'product' | 'blog' | 'cv';
  file_path: string | null;
  file_type: string | null;
  is_public: number;
  is_downloadable: number;
  created_at: number;
}

export default function AdminDashboard() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'art' | 'product' | 'blog' | 'cv'>('art');
  const [isPublic, setIsPublic] = useState(false);
  const [isDownloadable, setIsDownloadable] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const [uploadLoading, setUploadLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const router = useRouter();

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/content');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      } else if (res.status === 401) {
        router.push('/minforyam/login');
      }
    } catch (err) {
      console.error('Failed to fetch items', err);
    } finally {
      setFetchLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setUploadLoading(true);

    if (category === 'art' && !file) {
      setError('An image file is required for paintings.');
      setUploadLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('is_public', String(isPublic));
    formData.append('is_downloadable', String(isDownloadable));
    if (file) {
      formData.append('file', file);
    }

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg('Content uploaded successfully!');
        setTitle('');
        setDescription('');
        setIsPublic(false);
        setIsDownloadable(false);
        setFile(null);
        // Reset file input element manually
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        await fetchItems();
      } else {
        setError(data.error || 'Failed to upload content.');
      }
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleToggle = async (id: string, field: 'is_public' | 'is_downloadable', currentValue: number) => {
    const newValue = currentValue === 1 ? 0 : 1;
    try {
      const res = await fetch('/api/admin/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field, value: newValue === 1 }),
      });

      if (res.ok) {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: newValue } : item));
      } else {
        alert('Failed to update item status');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item? This action is permanent and deletes the stored file.')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
      } else {
        alert('Failed to delete item');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/minforyam/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans pb-16">
      <header className="border-b border-[#E5E5E5] bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-mono text-xs font-bold tracking-[0.15em] uppercase text-[#1A1A1A] m-0">
              Priyam Sameer
            </h1>
            <span className="text-xs font-mono py-1 px-2.5 bg-[#FAFAFA] border border-border rounded text-[#525252]">
              Admin Panel
            </span>
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

      <main className="max-w-7xl mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Upload Form */}
        <section className="lg:col-span-4 bg-white border border-[#E5E5E5] p-8 rounded-2xl shadow-sm h-fit">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-6 flex items-center gap-2 font-sans">
            <span className="material-symbols-rounded text-xl text-[#8C8C8C] select-none">upload_file</span>
            Upload New Content
          </h2>

          <form onSubmit={handleUpload} className="space-y-6">
            {error && (
              <div className="p-3 text-sm rounded-lg bg-red-50 border border-red-200 text-red-600 font-medium" role="alert">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-3 text-sm rounded-lg bg-green-50 border border-green-200 text-green-700 font-medium" role="alert">
                {successMsg}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="title" className="block text-xs font-bold font-mono tracking-wider uppercase text-[#525252]">
                Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => { setTitle(e.target.value); setError(''); }}
                disabled={uploadLoading}
                className="w-full min-h-[48px] px-4 text-base bg-white border border-[#CCCCCC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent transition"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="block text-xs font-bold font-mono tracking-wider uppercase text-[#525252]">
                Description / Text Content
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => { setDescription(e.target.value); setError(''); }}
                disabled={uploadLoading}
                className="w-full p-4 text-base bg-white border border-[#CCCCCC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent transition resize-y"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="category" className="block text-xs font-bold font-mono tracking-wider uppercase text-[#525252]">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => { setCategory(e.target.value as 'art' | 'product' | 'blog' | 'cv'); setError(''); }}
                disabled={uploadLoading}
                className="w-full min-h-[48px] px-4 text-base bg-white border border-[#CCCCCC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent transition"
              >
                <option value="art">Painting (Art Gallery)</option>
                <option value="product">Product Work</option>
                <option value="blog">Blog Post</option>
                <option value="cv">CV Document</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="file-input" className="block text-xs font-bold font-mono tracking-wider uppercase text-[#525252]">
                File Upload {category === 'art' ? '(Required - Image)' : '(Optional)'}
              </label>
              <input
                id="file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                disabled={uploadLoading}
                className="w-full text-sm file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#FAFAFA] file:text-[#1A1A1A] hover:file:bg-[#F0F0F0] file:cursor-pointer border border-[#CCCCCC] rounded-xl p-2.5 bg-white transition"
              />
              <span className="block text-[11px] text-[#8C8C8C] leading-normal mt-1">
                Accepted formats: JPG, PNG, WEBP, PDF (Max size: 20MB)
              </span>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <input
                  id="is_public"
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  disabled={uploadLoading}
                  className="w-5 h-5 accent-[#1A1A1A] rounded border-[#CCCCCC] cursor-pointer"
                />
                <label htmlFor="is_public" className="text-sm font-medium text-[#1A1A1A] cursor-pointer select-none">
                  Make content public immediately (Visibility)
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="is_downloadable"
                  type="checkbox"
                  checked={isDownloadable}
                  onChange={(e) => setIsDownloadable(e.target.checked)}
                  disabled={uploadLoading}
                  className="w-5 h-5 accent-[#1A1A1A] rounded border-[#CCCCCC] cursor-pointer"
                />
                <label htmlFor="is_downloadable" className="text-sm font-medium text-[#1A1A1A] cursor-pointer select-none">
                  Allow visitors to download file (Downloadable)
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={uploadLoading}
              className="w-full min-h-[48px] flex items-center justify-center bg-[#1A1A1A] text-white hover:bg-black font-semibold rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadLoading ? 'Uploading...' : 'Publish Content'}
            </button>
          </form>
        </section>

        {/* Right Column: Uploaded Content List */}
        <section className="lg:col-span-8 bg-white border border-[#E5E5E5] p-8 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-6 flex items-center gap-2 font-sans">
            <span className="material-symbols-rounded text-xl text-[#8C8C8C] select-none">list_alt</span>
            Content Library ({items.length} items)
          </h2>

          {fetchLoading ? (
            <div className="text-center py-12 text-[#8C8C8C] text-sm">
              Loading library content...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-[#8C8C8C] border-2 border-dashed border-[#E5E5E5] rounded-xl text-sm">
              No uploads found. Add items using the form to populate your portfolio.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E5E5E5]">
                    <th className="py-4 text-xs font-bold font-mono tracking-wider uppercase text-[#8C8C8C] w-2/5">Title</th>
                    <th className="py-4 text-xs font-bold font-mono tracking-wider uppercase text-[#8C8C8C] w-1/5">Category</th>
                    <th className="py-4 text-xs font-bold font-mono tracking-wider uppercase text-[#8C8C8C] w-1/5 text-center">Status</th>
                    <th className="py-4 text-xs font-bold font-mono tracking-wider uppercase text-[#8C8C8C] w-1/5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F5]">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FAFAFA] transition">
                      <td className="py-4 pr-4 align-top">
                        <div className="font-semibold text-sm text-[#1A1A1A] mb-1">{item.title}</div>
                        <div className="text-xs text-[#8C8C8C] max-w-[320px] truncate mb-1" title={item.description}>
                          {item.description || <span className="italic">No description text</span>}
                        </div>
                        {item.file_path && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-mono text-[#8C8C8C] bg-[#FAFAFA] border border-border px-1.5 py-0.5 rounded">
                            <span className="material-symbols-rounded text-xs select-none">attachment</span>
                            {item.file_type?.split('/')[1].toUpperCase()} file
                          </div>
                        )}
                      </td>
                      <td className="py-4 align-top">
                        <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#525252] px-2.5 py-1 bg-[#FAFAFA] border border-border rounded-lg">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-4 align-top text-center">
                        <div className="flex flex-col gap-2.5 items-center justify-center">
                          {/* Visibility toggle button */}
                          <button
                            onClick={() => handleToggle(item.id, 'is_public', item.is_public)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                              item.is_public === 1
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                : 'bg-[#FAFAFA] text-[#8C8C8C] border-border hover:bg-neutral-100'
                            }`}
                          >
                            <span className="material-symbols-rounded text-sm select-none">
                              {item.is_public === 1 ? 'visibility' : 'visibility_off'}
                            </span>
                            {item.is_public === 1 ? 'Public' : 'Draft'}
                          </button>

                          {/* Download toggle button (only enabled if file exists) */}
                          {item.file_path ? (
                            <button
                              onClick={() => handleToggle(item.id, 'is_downloadable', item.is_downloadable)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                item.is_downloadable === 1
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                  : 'bg-[#FAFAFA] text-[#8C8C8C] border-border hover:bg-neutral-100'
                              }`}
                            >
                              <span className="material-symbols-rounded text-sm select-none">
                                {item.is_downloadable === 1 ? 'download_done' : 'downloading'}
                              </span>
                              {item.is_downloadable === 1 ? 'Download Yes' : 'Download No'}
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono text-[#8C8C8C] italic">No File</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 align-top text-right">
                        <button
                          onClick={() => handleDelete(item.id)}
                          aria-label="Delete item"
                          className="p-2 border border-[#E5E5E5] text-[#8C8C8C] hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-xl transition"
                        >
                          <span className="material-symbols-rounded block text-base select-none">
                            delete
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
