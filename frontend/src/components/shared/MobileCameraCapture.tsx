'use client';

import React, { useRef, useState } from 'react';
import { Camera, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  label: string;
  onUploadComplete: (url: string) => void;
  onUploadStart?: () => void;
  value?: string;
}

export default function MobileCameraCapture({ label, onUploadComplete, onUploadStart, value }: Props) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadToCloudinary = async (blob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('file', blob);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
    formData.append('folder', 'easypg/tenants');

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Cloudinary upload failed: ${errorData.error?.message}`);
    }

    const data = await res.json();
    return data.secure_url;
  };

  const executeUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    onUploadStart?.();
    
    // Show local preview instantly
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setPendingFile(file);

    try {
      const secureUrl = await uploadToCloudinary(file);
      onUploadComplete(secureUrl);
      setPreview(secureUrl);
      setPendingFile(null); // Clear pending file on success
    } catch (err: any) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
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
        <span className="text-[11px] text-amber-600 flex items-center gap-1 text-center leading-tight">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </span>
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
