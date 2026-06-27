'use client';

import React, { useRef, useState } from 'react';
import { Camera, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import api from '@/lib/api';

interface Props {
  label: string;
  onUploadComplete: (url: string) => void;
  onUploadStart?: () => void;
  value?: string;
  folderPath?: string;
  docType?: string;
}

export default function MobileCameraCapture({ label, onUploadComplete, onUploadStart, value, folderPath, docType }: Props) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { lang } = useLanguage();

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Max width to keep files tiny but readable
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = height * (MAX_WIDTH / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);
        
        // Export as WebP for hyperfast network transfer
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else resolve(file);
          },
          'image/webp',
          0.85
        );
      };
      img.onerror = (e) => reject(e);
    });
  };

  const uploadToCloudinary = async (blob: Blob): Promise<string> => {
    // We no longer rely on frontend environment variables for Cloudinary.
    // The backend provides the secure signature, cloudName, and API key dynamically!

    // 1. Get signature from backend
    // Map folderPath to one of the allowed enums: ['tenants', 'documents', 'profiles', 'complaints']
    const folderType = folderPath?.includes('tenant') ? 'tenants' : 
                       folderPath?.includes('profile') ? 'profiles' : 
                       folderPath?.includes('complaint') ? 'complaints' : 'documents';

    const sigRes = await api.post('/upload/signature', { folder: folderType });
    const { signature, timestamp, folder, cloudName, apiKey } = sigRes.data.data;

    // 2. Prepare signed payload
    const formData = new FormData()
    formData.append('file', blob)
    formData.append('api_key', apiKey)
    formData.append('timestamp', timestamp.toString())
    formData.append('signature', signature)
    formData.append('folder', folder)
    if (docType) formData.append('public_id', docType)

    // Robust API pattern: Exponential Backoff & Timeout Handling
    const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
        
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);

        // Retry on server errors (5xx) or rate limits (429)
        if (!res.ok && (res.status >= 500 || res.status === 429) && retries > 0) {
          throw new Error(`Server returned ${res.status}`);
        }
        return res;
      } catch (err: any) {
        if (retries > 0 && err.name !== 'AbortError') {
          console.warn(`Upload failed: ${err.message}. Retrying in ${backoff}ms...`);
          await new Promise(r => setTimeout(r, backoff));
          return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw new Error(err.name === 'AbortError' ? 'Upload timed out. Please check your connection.' : err.message);
      }
    };

    const response = await fetchWithRetry(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Cloudinary error detail:', errorBody);
      throw new Error(errorBody?.error?.message || 'Cloudinary upload failed');
    }

    const data = await response.json()
    // Inject auto-optimization flags for hyperfast loading everywhere!
    const secureUrl = data.secure_url as string;
    const optimizedUrl = secureUrl.replace('/upload/', '/upload/f_auto,q_auto,w_1200,c_limit/');
    
    return optimizedUrl;
  }

  const executeUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    onUploadStart?.();
    
    // Show local preview instantly
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setPendingFile(file);

    try {
      const compressedBlob = await compressImage(file);
      const secureUrl = await uploadToCloudinary(compressedBlob);
      onUploadComplete(secureUrl);
      setPreview(secureUrl);
      setPendingFile(null); // Clear pending file on success
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(
        lang === 'te'
          ? 'ఫోటో అప్లోడ్ విఫలమైంది. మీ internet connection చెక్ చేయండి.'
          : 'Photo upload failed. Please check your internet and try again.'
      );
      // Intentionally DO NOT call onUploadComplete with localUrl here.
      // This prevents the parent form from submitting a broken blob URL.
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await executeUpload(file);
  };

  const handleRetry = async () => {
    if (pendingFile) {
      await executeUpload(pendingFile);
    }
  };

  return (
    <div className="flex flex-col items-center p-5 border border-dashed border-slate-300 rounded-2xl bg-slate-50 gap-3 hover:bg-slate-100/50 transition relative">
      <span className="text-sm font-semibold text-slate-700 text-center">{label}</span>
      
      {preview ? (
        <div className="relative w-36 h-36 rounded-2xl overflow-hidden border border-slate-200 group shadow-sm bg-white">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          
          {loading ? (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="text-[10px] font-bold">Uploading...</span>
            </div>
          ) : error ? (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-2">
              <AlertCircle className="h-6 w-6 text-rose-500 mb-1" />
              <button 
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-1 bg-white text-rose-600 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg hover:bg-rose-50 active:scale-95 transition"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          ) : (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-white p-2.5 shadow-md hover:scale-105 active:scale-95 transition text-slate-800"
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>
          )}
          
          {!loading && !error && !pendingFile && (
            <div className="absolute bottom-2 right-2 bg-green-500 text-white rounded-full p-0.5 shadow">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full text-white shadow-lg shadow-blue-500/20 active:scale-95 hover:bg-blue-700 transition"
        >
          <Camera className="h-6 w-6" />
        </button>
      )}

      {error && (
        <div className="flex flex-col items-center">
          <span className="text-[11px] text-amber-600 flex items-center gap-1 text-center leading-tight">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={handleRetry}
            className="text-sm text-blue-600 underline mt-1"
          >
            {lang === 'te' ? 'మళ్ళీ ప్రయత్నించు' : 'Tap to retry'}
          </button>
        </div>
      )}
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCapture}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
    </div>
  );
}
