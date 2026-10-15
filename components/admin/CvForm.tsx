/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { upload } from '@vercel/blob/client';
import { ProgressBar, Toast } from './shared';
import Icon from '@/components/Icon';

interface CvFormProps {
  editItem?: any;
  onSuccess: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

export default function CvForm({ editItem, onSuccess, onDirtyChange }: CvFormProps) {
  const formId = React.useId();
  const [title, setTitle] = useState(editItem?.title || 'CV Document');
  
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
  }, [title, meta, pdfFile, onDirtyChange]);

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
        downloadable: false,
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
          <label htmlFor={`${formId}-title`} className="block text-base sm:text-sm font-semibold text-[#525252] mb-1">Document Title</label>
          <input 
            id={`${formId}-title`}
            name="cv-title"
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)}
            className="w-full min-h-11 p-3 text-base border border-[#E5E5E5] rounded-xl bg-[#FAFAFA] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
            placeholder="e.g. CV 2026 Priyam"
          />
        </div>

        <div>
          <p id={`${formId}-pdf-label`} className="block text-base sm:text-sm font-semibold text-[#525252] mb-1">PDF File (Required)</p>
          {existingPdf && !pdfFile ? (
            <div className="flex items-center justify-between p-4 border border-[#E5E5E5] rounded-xl bg-white">
              <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                <Icon name="file" className="shrink-0 text-red-600" />
                <span className="text-base sm:text-sm font-medium truncate">{existingPdf.blob_pathname.split('/').pop()}</span>
              </div>
              <button 
                type="button"
                onClick={() => setExistingPdf(null)}
                className="min-h-11 px-2 text-base sm:text-sm text-[#525252] hover:text-[#1A1A1A] underline"
              >
                Replace
              </button>
            </div>
          ) : (
            <input 
              id={`${formId}-pdf`}
              name="cv-pdf"
              aria-labelledby={`${formId}-pdf-label`}
              type="file" 
              accept="application/pdf"
              onChange={e => setPdfFile(e.target.files?.[0] || null)}
              className="w-full min-h-11 min-w-0 p-3 text-base border border-[#E5E5E5] rounded-xl bg-[#FAFAFA] text-[#525252]"
            />
          )}
        </div>

        <p className="text-sm leading-relaxed text-[#525252]">Visitors read experience on the website. This source document is not offered as a download.</p>
      </div>

      <div className="space-y-4 pt-6 border-t border-[#E5E5E5]">
        <h3 className="text-lg font-bold text-[#1A1A1A]">Contact Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0"><label htmlFor={`${formId}-name`} className="mb-1 block text-base sm:text-sm font-medium">Full Name</label><input id={`${formId}-name`} name="cv-contact-name" autoComplete="name" type="text" placeholder="Full Name" value={meta.contact?.name || ''} onChange={e => setMeta({...meta, contact: {...meta.contact, name: e.target.value}})} className="w-full min-h-11 p-3 text-base border border-[#E5E5E5] rounded-xl" /></div>
          <div className="min-w-0"><label htmlFor={`${formId}-email`} className="mb-1 block text-base sm:text-sm font-medium">Email</label><input id={`${formId}-email`} name="cv-contact-email" autoComplete="email" spellCheck={false} type="email" placeholder="Email" value={meta.contact?.email || ''} onChange={e => setMeta({...meta, contact: {...meta.contact, email: e.target.value}})} className="w-full min-h-11 p-3 text-base border border-[#E5E5E5] rounded-xl" /></div>
          <div className="min-w-0"><label htmlFor={`${formId}-linkedin`} className="mb-1 block text-base sm:text-sm font-medium">LinkedIn</label><input id={`${formId}-linkedin`} name="cv-contact-linkedin" type="url" spellCheck={false} placeholder="LinkedIn" value={meta.contact?.linkedin || ''} onChange={e => setMeta({...meta, contact: {...meta.contact, linkedin: e.target.value}})} className="w-full min-h-11 p-3 text-base border border-[#E5E5E5] rounded-xl" /></div>
          <div className="min-w-0"><label htmlFor={`${formId}-location`} className="mb-1 block text-base sm:text-sm font-medium">Location</label><input id={`${formId}-location`} name="cv-contact-location" type="text" placeholder="Location" value={meta.contact?.location || ''} onChange={e => setMeta({...meta, contact: {...meta.contact, location: e.target.value}})} className="w-full min-h-11 p-3 text-base border border-[#E5E5E5] rounded-xl" /></div>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-[#E5E5E5]">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-[#1A1A1A]">Experience</h3>
          <button type="button" onClick={addExperience} className="min-h-11 px-2 text-base sm:text-sm font-semibold text-[#1A1A1A] flex items-center gap-2">
            <Icon name="plus" /> Add experience
          </button>
        </div>
        
        {meta.experience?.map((exp: any, i: number) => (
          <div key={i} className="p-4 border border-[#E5E5E5] rounded-xl space-y-3 bg-[#FAFAFA]">
            <div className="flex justify-between">
              <h4 className="font-semibold text-[#525252]">Role {i + 1}</h4>
              <button type="button" aria-label={`Remove experience ${i + 1}${exp.company ? ` at ${exp.company}` : ''}`} onClick={() => removeExperience(i)} className="inline-flex min-h-11 min-w-11 items-center justify-center text-red-600 hover:text-red-700">
                <Icon name="trash" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="min-w-0"><label htmlFor={`${formId}-experience-${i}-company`} className="mb-1 block text-base sm:text-sm font-medium">Company</label><input id={`${formId}-experience-${i}-company`} name={`cv-experience-${i}-company`} type="text" placeholder="Company" value={exp.company} onChange={e => updateExperience(i, 'company', e.target.value)} className="w-full min-h-11 p-2 text-base border border-[#E5E5E5] rounded-lg" /></div>
              <div className="min-w-0"><label htmlFor={`${formId}-experience-${i}-role`} className="mb-1 block text-base sm:text-sm font-medium">Role</label><input id={`${formId}-experience-${i}-role`} name={`cv-experience-${i}-role`} type="text" placeholder="Role" value={exp.role} onChange={e => updateExperience(i, 'role', e.target.value)} className="w-full min-h-11 p-2 text-base border border-[#E5E5E5] rounded-lg" /></div>
              <div className="min-w-0"><label htmlFor={`${formId}-experience-${i}-start`} className="mb-1 block text-base sm:text-sm font-medium">Start Date</label><input id={`${formId}-experience-${i}-start`} name={`cv-experience-${i}-start`} type="text" placeholder="Start Date" value={exp.start} onChange={e => updateExperience(i, 'start', e.target.value)} className="w-full min-h-11 p-2 text-base border border-[#E5E5E5] rounded-lg" /></div>
              <div className="min-w-0"><label htmlFor={`${formId}-experience-${i}-end`} className="mb-1 block text-base sm:text-sm font-medium">End Date</label><input id={`${formId}-experience-${i}-end`} name={`cv-experience-${i}-end`} type="text" placeholder="End Date" value={exp.end} onChange={e => updateExperience(i, 'end', e.target.value)} className="w-full min-h-11 p-2 text-base border border-[#E5E5E5] rounded-lg" /></div>
            </div>
            <div>
              <label htmlFor={`${formId}-experience-${i}-bullets`} className="mb-1 block text-base sm:text-sm font-medium">Bullets (one per line)</label>
              <textarea id={`${formId}-experience-${i}-bullets`} name={`cv-experience-${i}-bullets`} placeholder="Bullets (one per line)" value={exp.bullets?.join('\n')} onChange={e => updateExperience(i, 'bullets', e.target.value.split('\n'))} className="w-full p-2 text-base border border-[#E5E5E5] rounded-lg min-h-[100px]" />
            </div>
          </div>
        ))}
      </div>

      {isUploading && <ProgressBar progress={uploadProgress} message="Saving CV..." />}

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
          Publish CV
        </button>
      </div>
    </div>
  );
}
