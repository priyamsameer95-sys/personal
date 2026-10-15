/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { upload } from '@vercel/blob/client';
import { WordCounter, ProgressBar, Toast } from './shared';
import Icon from '@/components/Icon';

interface ArtFormProps {
  editItem?: any;
  onSuccess: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

export default function ArtForm({ editItem, onSuccess, onDirtyChange }: ArtFormProps) {
  const formId = React.useId();
  const [title, setTitle] = useState(editItem?.title || '');
  const [bodyMarkdown, setBodyMarkdown] = useState(editItem?.body_markdown || '');
  const [sortOrder, setSortOrder] = useState(editItem?.sort_order || 0);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState<any>(editItem?.media?.[0] || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImage?.blob_url || null);
  
  const [imageMeta, setImageMeta] = useState<{width: number, height: number, orientation: string} | null>(
    existingImage ? { width: existingImage.width, height: existingImage.height, orientation: existingImage.orientation } : null
  );

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Track dirty state
  useEffect(() => {
    onDirtyChange(true);
  }, [title, bodyMarkdown, sortOrder, imageFile, onDirtyChange]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Compute dimensions and orientation
    const img = new Image();
    img.onload = () => {
      const orientation = img.width > img.height ? 'landscape' : img.width < img.height ? 'portrait' : 'square';
      setImageMeta({ width: img.width, height: img.height, orientation });
    };
    img.src = objectUrl;
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    try {
      setIsUploading(true);
      setError(null);

      if (!title) throw new Error('Title is required');
      if (!imageFile && !existingImage) throw new Error('An image is required for Art');

      let mediaPayload = existingImage ? [existingImage] : [];

      if (imageFile) {
        setUploadProgress(10);
        const blob = await upload(imageFile.name, imageFile, {
          access: 'public',
          handleUploadUrl: '/api/admin/blob-upload',
          clientPayload: JSON.stringify({ type: 'art' }),
        });
        
        mediaPayload = [{
          blob_url: blob.url,
          blob_pathname: blob.pathname,
          kind: 'image',
          mime_type: imageFile.type,
          width: imageMeta?.width,
          height: imageMeta?.height,
          orientation: imageMeta?.orientation,
          protected: true, // Always true for Art
          sort_order: 0,
        }];
        setUploadProgress(50);
      }

      const payload = {
        type: 'art',
        title,
        body_markdown: bodyMarkdown,
        status,
        downloadable: false, // Always false for Art
        sort_order: sortOrder,
        media: mediaPayload
      };

      setUploadProgress(70);

      const url = editItem ? `/api/admin/content/${editItem.id}` : '/api/admin/content';
      const method = editItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save Art');
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
        <h2 className="text-xl font-bold text-[#1A1A1A]">Artwork Details</h2>
        
        <div>
          <label htmlFor={`${formId}-title`} className="block text-base sm:text-sm font-semibold text-[#525252] mb-1">Title</label>
          <input 
            id={`${formId}-title`}
            name="art-title"
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)}
            className="w-full min-h-11 p-3 text-base border border-[#E5E5E5] rounded-xl bg-[#FAFAFA] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
            placeholder="Artwork title"
          />
        </div>

        <div>
          <p className="block text-base sm:text-sm font-semibold text-[#525252] mb-1">Image (Required)</p>
          {previewUrl ? (
            <div className="space-y-3">
              <div className="relative aspect-video bg-[#E5E5E5] rounded-xl overflow-hidden flex items-center justify-center">
                <img src={previewUrl} alt={title ? `${title} preview` : 'Selected artwork preview'} width={imageMeta?.width} height={imageMeta?.height} className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex flex-wrap justify-between items-center gap-2 text-base sm:text-sm text-[#625e56]">
                <span>{imageMeta ? `${imageMeta.width}x${imageMeta.height} (${imageMeta.orientation})` : ''}</span>
                <button 
                  type="button"
                  onClick={() => { setImageFile(null); setPreviewUrl(null); setExistingImage(null); }}
                  className="min-h-11 px-2 text-[#1A1A1A] underline font-medium"
                >
                  Remove & Replace
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-[#E5E5E5] rounded-xl p-8 text-center hover:bg-[#FAFAFA] transition cursor-pointer">
              <input 
                type="file" 
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageSelect}
                className="sr-only peer"
                id={`${formId}-image-upload`}
                  name="art-images"
              />
              <label htmlFor={`${formId}-image-upload`} className="cursor-pointer flex min-h-11 flex-col items-center gap-2 rounded-md peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[#1A1A1A]">
                <Icon name="image" className="text-[#625e56]" />
                <span className="text-[#1A1A1A] font-semibold">Click to upload artwork</span>
                <span className="text-base sm:text-sm text-[#625e56]">JPG, PNG, WEBP up to 25MB</span>
              </label>
            </div>
          )}
        </div>

        <div>
          <label htmlFor={`${formId}-description`} className="block text-base sm:text-sm font-semibold text-[#525252] mb-1">Description (Markdown)</label>
          <textarea 
            id={`${formId}-description`}
            name="art-description"
            value={bodyMarkdown} 
            onChange={e => setBodyMarkdown(e.target.value)}
            className="w-full p-3 text-base border border-[#E5E5E5] rounded-xl bg-[#FAFAFA] text-[#1A1A1A] min-h-[150px] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] font-sans"
            placeholder="Tell the story behind this piece..."
          />
          <WordCounter text={bodyMarkdown} limit={500} />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4">
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor={`${formId}-sort`} className="block text-base sm:text-sm font-semibold text-[#525252] mb-1">Sort Order</label>
            <input 
              id={`${formId}-sort`}
              name="art-sort-order"
              type="number" 
              value={sortOrder} 
              onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
              className="w-full min-h-11 p-3 text-base border border-[#E5E5E5] rounded-xl bg-[#FAFAFA] text-[#1A1A1A]"
            />
          </div>
        </div>

        <div className="pt-4 space-y-2 opacity-70">
          <p className="text-sm leading-relaxed text-[#525252]">Artwork is viewed in the website gallery.</p>
        </div>
      </div>

      {isUploading && <ProgressBar progress={uploadProgress} message="Saving Artwork..." />}

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
          Publish Art
        </button>
      </div>
    </div>
  );
}
