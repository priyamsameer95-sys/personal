/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { upload } from '@vercel/blob/client';
import { ProgressBar, Toast } from './shared';

interface CvFormProps {
  editItem?: any;
  onSuccess: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

export default function CvForm({ editItem, onSuccess, onDirtyChange }: CvFormProps) {
  const [title, setTitle] = useState(editItem?.title || 'CV Document');
  const [downloadable, setDownloadable] = useState(editItem?.downloadable ?? true);
  
  // Meta fields
  const [meta, setMeta] = useState<any>(editItem?.meta || {
    contact: { name: '', email: '', linkedin: '', location: '' },
    experience: [],
    education: []
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [existingPdf, setExistingPdf] = useState<any>(editItem?.media?.[0] || null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Track dirty state
  useEffect(() => {
    onDirtyChange(true);
  }, [title, downloadable, meta, pdfFile, onDirtyChange]);

  const handleSubmit = async (status: 'draft' | 'published') => {
    try {
      setIsUploading(true);
      setError(null);

      if (!title) throw new Error('Title is required');
      if (!pdfFile && !existingPdf) throw new Error('A PDF file is required for CV');

      let mediaPayload = existingPdf ? [existingPdf] : [];

      if (pdfFile) {
        setUploadProgress(10);
        const blob = await upload(pdfFile.name, pdfFile, {
          access: 'public',
          handleUploadUrl: '/api/admin/blob-upload',
          clientPayload: JSON.stringify({ type: 'cv' }),
        });
        
        mediaPayload = [{
          blob_url: blob.url,
          blob_pathname: blob.pathname,
          kind: 'pdf',
          mime_type: pdfFile.type,
          protected: false,
          sort_order: 0,
        }];
        setUploadProgress(50);
      }

      const payload = {
        type: 'cv',
        title,
        status,
        downloadable,
        meta,
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
        throw new Error(data.error || 'Failed to save CV');
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

  const addExperience = () => {
    setMeta({
      ...meta,
      experience: [...(meta.experience || []), { company: '', role: '', start: '', end: '', bullets: [''] }]
    });
  };

  const updateExperience = (index: number, field: string, value: any) => {
    const newExp = [...meta.experience];
    newExp[index][field] = value;
    setMeta({ ...meta, experience: newExp });
  };

  const removeExperience = (index: number) => {
    const newExp = [...meta.experience];
    newExp.splice(index, 1);
    setMeta({ ...meta, experience: newExp });
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {error && <Toast type="error" message={error} onClose={() => setError(null)} />}
      
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#1A1A1A]">CV Details</h2>
        
        <div>
          <label className="block text-sm font-semibold text-[#525252] mb-1">Document Title</label>
          <input 
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)}
            className="w-full p-3 border border-[#E5E5E5] rounded-xl bg-[#FAFAFA] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
            placeholder="e.g. CV 2026 Priyam"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#525252] mb-1">PDF File (Required)</label>
          {existingPdf && !pdfFile ? (
            <div className="flex items-center justify-between p-4 border border-[#E5E5E5] rounded-xl bg-white">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="material-symbols-rounded text-red-500">picture_as_pdf</span>
                <span className="text-sm font-medium truncate">{existingPdf.blob_pathname.split('/').pop()}</span>
              </div>
              <button 
                onClick={() => setExistingPdf(null)}
                className="text-sm text-[#525252] hover:text-[#1A1A1A] underline"
              >
                Replace
              </button>
            </div>
          ) : (
            <input 
              type="file" 
              accept="application/pdf"
              onChange={e => setPdfFile(e.target.files?.[0] || null)}
              className="w-full p-3 border border-[#E5E5E5] rounded-xl bg-[#FAFAFA] text-[#525252]"
            />
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={downloadable} 
            onChange={e => setDownloadable(e.target.checked)}
            className="w-4 h-4 text-[#1A1A1A] bg-[#FAFAFA] border-[#E5E5E5] rounded"
          />
          <span className="text-sm font-medium text-[#525252]">Allow visitors to download PDF</span>
        </label>
      </div>

      <div className="space-y-4 pt-6 border-t border-[#E5E5E5]">
        <h3 className="text-lg font-bold text-[#1A1A1A]">Contact Info</h3>
        <div className="grid grid-cols-2 gap-4">
          <input type="text" placeholder="Full Name" value={meta.contact?.name || ''} onChange={e => setMeta({...meta, contact: {...meta.contact, name: e.target.value}})} className="p-3 border border-[#E5E5E5] rounded-xl" />
          <input type="email" placeholder="Email" value={meta.contact?.email || ''} onChange={e => setMeta({...meta, contact: {...meta.contact, email: e.target.value}})} className="p-3 border border-[#E5E5E5] rounded-xl" />
          <input type="text" placeholder="LinkedIn" value={meta.contact?.linkedin || ''} onChange={e => setMeta({...meta, contact: {...meta.contact, linkedin: e.target.value}})} className="p-3 border border-[#E5E5E5] rounded-xl" />
          <input type="text" placeholder="Location" value={meta.contact?.location || ''} onChange={e => setMeta({...meta, contact: {...meta.contact, location: e.target.value}})} className="p-3 border border-[#E5E5E5] rounded-xl" />
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-[#E5E5E5]">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-[#1A1A1A]">Experience</h3>
          <button onClick={addExperience} className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-1">
            <span className="material-symbols-rounded text-lg">add</span> Add
          </button>
        </div>
        
        {meta.experience?.map((exp: any, i: number) => (
          <div key={i} className="p-4 border border-[#E5E5E5] rounded-xl space-y-3 bg-[#FAFAFA]">
            <div className="flex justify-between">
              <h4 className="font-semibold text-[#525252]">Role {i + 1}</h4>
              <button onClick={() => removeExperience(i)} className="text-red-500 hover:text-red-700">
                <span className="material-symbols-rounded text-lg">delete</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Company" value={exp.company} onChange={e => updateExperience(i, 'company', e.target.value)} className="p-2 border border-[#E5E5E5] rounded-lg" />
              <input type="text" placeholder="Role" value={exp.role} onChange={e => updateExperience(i, 'role', e.target.value)} className="p-2 border border-[#E5E5E5] rounded-lg" />
              <input type="text" placeholder="Start Date" value={exp.start} onChange={e => updateExperience(i, 'start', e.target.value)} className="p-2 border border-[#E5E5E5] rounded-lg" />
              <input type="text" placeholder="End Date" value={exp.end} onChange={e => updateExperience(i, 'end', e.target.value)} className="p-2 border border-[#E5E5E5] rounded-lg" />
            </div>
            <div>
              <textarea placeholder="Bullets (one per line)" value={exp.bullets?.join('\n')} onChange={e => updateExperience(i, 'bullets', e.target.value.split('\n'))} className="w-full p-2 border border-[#E5E5E5] rounded-lg min-h-[100px]" />
            </div>
          </div>
        ))}
      </div>

      {isUploading && <ProgressBar progress={uploadProgress} message="Saving CV..." />}

      <div className="flex gap-3 pt-6 border-t border-[#E5E5E5]">
        <button 
          onClick={() => handleSubmit('draft')}
          disabled={isUploading}
          className="px-6 py-3 bg-[#FAFAFA] border border-[#E5E5E5] text-[#1A1A1A] font-semibold rounded-xl hover:bg-[#E5E5E5] transition flex-1 disabled:opacity-50"
        >
          Save Draft
        </button>
        <button 
          onClick={() => handleSubmit('published')}
          disabled={isUploading}
          className="px-6 py-3 bg-[#1A1A1A] text-white font-semibold rounded-xl hover:bg-black transition flex-1 shadow-material-hover disabled:opacity-50"
        >
          Publish CV
        </button>
      </div>
    </div>
  );
}
