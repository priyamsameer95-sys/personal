/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { upload } from '@vercel/blob/client';
import { WordCounter, ProgressBar, Toast } from './shared';
import Icon from '@/components/Icon';
import dynamic from 'next/dynamic';
import '@uiw/react-md-editor/markdown-editor.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface WorkFormProps {
  editItem?: any;
  onSuccess: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

interface ImageItem {
  id?: string;
  file?: File;
  previewUrl: string;
  blob_url?: string;
  blob_pathname?: string;
  width?: number;
  height?: number;
  orientation?: string;
  alt_text: string;
  protected: boolean;
  sort_order: number;
}

export default function WorkForm({ editItem, onSuccess, onDirtyChange }: WorkFormProps) {
  const formId = React.useId();
  const [title, setTitle] = useState(editItem?.title || '');
  const [bodyMarkdown, setBodyMarkdown] = useState(editItem?.body_markdown || '');
  
  // Transform existing media or initialize empty
  const [images, setImages] = useState<ImageItem[]>(
    editItem?.media?.map((m: any) => ({
      id: m.id,
      previewUrl: m.blob_url,
      blob_url: m.blob_url,
      blob_pathname: m.blob_pathname,
      width: m.width,
      height: m.height,
      orientation: m.orientation,
      alt_text: m.alt_text || '',
      protected: m.protected,
      sort_order: m.sort_order
    })) || []
  );

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Track dirty state
  useEffect(() => {
    onDirtyChange(true);
  }, [title, bodyMarkdown, images, onDirtyChange]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > 5) {
      setError('Maximum 5 images allowed for Work case studies.');
      return;
    }

    files.forEach(file => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const orientation = img.width > img.height ? 'landscape' : img.width < img.height ? 'portrait' : 'square';
        setImages(prev => [...prev, {
          file,
          previewUrl: objectUrl,
          width: img.width,
          height: img.height,
          orientation,
          alt_text: '',
          protected: false,
          sort_order: prev.length
        }]);
      };
      img.src = objectUrl;
    });
    
    // Reset file input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImgs = [...prev];
      newImgs.splice(index, 1);
      // Re-sort
      return newImgs.map((img, i) => ({ ...img, sort_order: i }));
    });
  };

  const updateImage = (index: number, field: keyof ImageItem, value: any) => {
    setImages(prev => {
      const newImgs = [...prev];
      newImgs[index] = { ...newImgs[index], [field]: value };
      return newImgs;
    });
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= images.length) return;
    setImages(prev => {
      const newImgs = [...prev];
      const temp = newImgs[index];
      newImgs[index] = newImgs[index + direction];
      newImgs[index + direction] = temp;
      // Re-sort
      return newImgs.map((img, i) => ({ ...img, sort_order: i }));
    });
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    try {
      setIsUploading(true);
      setError(null);

      if (!title) throw new Error('Title is required');
      if (images.length === 0) throw new Error('At least 1 image is required for Work');
      if (images.length > 5) throw new Error('Maximum 5 images allowed for Work');

      const mediaPayload = [];
      const totalToUpload = images.filter(img => img.file).length;
      let uploadedCount = 0;

      for (const img of images) {
        if (img.file) {
          // New file upload
          const blob = await upload(img.file.name, img.file, {
            access: 'public',
            handleUploadUrl: '/api/admin/blob-upload',
            clientPayload: JSON.stringify({ type: 'work' }),
          });
          
          mediaPayload.push({
            blob_url: blob.url,
            blob_pathname: blob.pathname,
            kind: 'image',
            mime_type: img.file.type,
            width: img.width,
            height: img.height,
            orientation: img.orientation,
            alt_text: img.alt_text,
            protected: img.protected,
            sort_order: img.sort_order,
          });
          
          uploadedCount++;
          setUploadProgress((uploadedCount / totalToUpload) * 70); // Up to 70% for blobs
        } else {
          // Existing file
          mediaPayload.push({
            id: img.id,
            blob_url: img.blob_url,
            blob_pathname: img.blob_pathname,
            kind: 'image',
            mime_type: 'image/jpeg', // Fake it for existing if missing, API won't validate existing
            width: img.width,
            height: img.height,
            orientation: img.orientation,
            alt_text: img.alt_text,
            protected: img.protected,
            sort_order: img.sort_order,
          });
        }
      }

      setUploadProgress(80);

      const payload = {
        type: 'work',
        title,
        body_markdown: bodyMarkdown,
        status,
        downloadable: false,
        media: mediaPayload
      };

      const url = editItem ? `/api/admin/content/${editItem.id}` : '/api/admin/content';
      const method = editItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save Work case study');
      }

      setUploadProgress(100);
      onDirtyChange(false);
      onSuccess();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {error && <Toast type="error" message={error} onClose={() => setError(null)} />}
      
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#1A1A1A]">Work Case Study</h2>
        
        <div>
          <label htmlFor={`${formId}-title`} className="block text-base sm:text-sm font-semibold text-[#525252] mb-1">Title</label>
          <input 
            id={`${formId}-title`}
            name="work-title"
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)}
            className="w-full min-h-11 p-3 text-base border border-[#E5E5E5] rounded-xl bg-[#FAFAFA] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
            placeholder="Case study title"
          />
        </div>

        <div>
          <p className="text-base sm:text-sm font-semibold text-[#525252] mb-2">
            <span>Images ({images.length}/5)</span>
          </p>
          
          <div className="space-y-3">
            {images.map((img, i) => (
              <div key={img.id || img.previewUrl} className="grid grid-cols-[44px_minmax(0,1fr)_44px] gap-3 p-3 border border-[#E5E5E5] rounded-xl bg-white sm:flex sm:gap-4 sm:items-center">
                <div className="col-start-1 row-start-1 flex flex-col gap-2">
                  <button type="button" aria-label={`Move image ${i + 1} earlier`} onClick={() => moveImage(i, -1)} disabled={i === 0} className="inline-flex min-h-11 min-w-11 items-center justify-center text-[#625e56] hover:text-[#1A1A1A] disabled:opacity-30">
                    <Icon name="arrow-up" />
                  </button>
                  <button type="button" aria-label={`Move image ${i + 1} later`} onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} className="inline-flex min-h-11 min-w-11 items-center justify-center text-[#625e56] hover:text-[#1A1A1A] disabled:opacity-30">
                    <Icon name="arrow-down" />
                  </button>
                </div>
                
                <div className="col-start-2 row-start-1 w-20 h-20 sm:w-24 sm:h-24 bg-[#FAFAFA] rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-[#E5E5E5]">
                  <img src={img.previewUrl} alt={img.alt_text || `Work image ${i + 1} preview`} width={img.width} height={img.height} className="max-w-full max-h-full object-contain" />
                </div>
                
                <div className="col-span-3 row-start-2 min-w-0 flex-1 space-y-2">
                  <label htmlFor={`${formId}-image-${i}-alt`} className="block text-base sm:text-sm font-medium text-[#525252]">Image {i + 1} description</label>
                  <input 
                    id={`${formId}-image-${i}-alt`}
                    name={`work-image-${i}-alt`}
                    type="text" 
                    placeholder="Alt text (for accessibility)" 
                    value={img.alt_text}
                    onChange={e => updateImage(i, 'alt_text', e.target.value)}
                    className="w-full min-h-11 p-2 text-base border border-[#E5E5E5] rounded-lg bg-[#FAFAFA]"
                  />
                  <div className="flex flex-wrap items-center gap-2 text-base sm:text-sm text-[#525252]">
                    <span className="font-mono">{img.width}x{img.height}</span>
                    <label className="flex min-h-11 items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={img.protected} onChange={e => updateImage(i, 'protected', e.target.checked)} className="rounded" />
                      <span>Protected</span>
                    </label>
                  </div>
                </div>
                
                <button type="button" aria-label={`Remove image ${i + 1}`} onClick={() => removeImage(i)} className="col-start-3 row-start-3 inline-flex min-h-11 min-w-11 items-center justify-center text-red-600 hover:text-red-700 shrink-0 p-2">
                  <Icon name="trash" />
                </button>
              </div>
            ))}

            {images.length < 5 && (
              <div className="border-2 border-dashed border-[#E5E5E5] rounded-xl p-6 text-center hover:bg-[#FAFAFA] transition cursor-pointer">
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageSelect}
                  className="sr-only peer"
                  id={`${formId}-image-upload`}
                  name="work-images"
                />
                <label htmlFor={`${formId}-image-upload`} className="cursor-pointer flex min-h-11 flex-col items-center gap-2 rounded-md peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[#1A1A1A]">
                  <Icon name="image" className="text-[#625e56]" />
                  <span className="text-[#1A1A1A] font-semibold text-base">Add Images</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div>
          <label htmlFor={`${formId}-body`} className="mb-2 block text-base sm:text-sm font-semibold text-[#525252]">Case study (Markdown)</label>
          <div className="w-full bg-white rounded-xl overflow-hidden" data-color-mode="light">
            <MDEditor
              value={bodyMarkdown}
              onChange={(val) => setBodyMarkdown(val || '')}
              height={400}
              preview="live"
              hideToolbar={false}
              textareaProps={{ id: `${formId}-body`, name: 'work-body', style: { fontSize: 16 } }}
              className="border border-[#E5E5E5] !shadow-none"
            />
          </div>
          <WordCounter text={bodyMarkdown} limit={1500} />
        </div>

        <p className="pt-2 text-sm leading-relaxed text-[#525252]">Visitors read the case study and view its images on the website.</p>
      </div>

      {isUploading && <ProgressBar progress={uploadProgress} message="Saving Work..." />}

      <div className="flex gap-3 pt-6 border-t border-[#E5E5E5]">
        <button 
          type="button"
          onClick={() => handleSubmit('draft')}
          disabled={isUploading}
          className="min-h-11 px-6 py-3 text-base bg-[#FAFAFA] border border-[#E5E5E5] text-[#1A1A1A] font-semibold rounded-xl hover:bg-[#E5E5E5] transition-colors flex-1 disabled:opacity-50"
        >
          Save Draft
        </button>
        <button 
          type="button"
          onClick={() => handleSubmit('published')}
          disabled={isUploading}
          className="min-h-11 px-6 py-3 text-base bg-[#1A1A1A] text-white font-semibold rounded-xl hover:bg-black transition-colors flex-1 shadow-material-hover disabled:opacity-50"
        >
          Publish Work
        </button>
      </div>
    </div>
  );
}
