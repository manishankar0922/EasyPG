'use client';

import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  label: string;
  onUploadComplete: (url: string) => void;
  value?: string;
}

export default function MobileCameraCapture({ label, onUploadComplete, value }: Props) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview instantly
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setLoading(true);
    setError(null);

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'easypg-media';
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'easypg_preset';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Cloudinary upload failed: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.secure_url) {
        onUploadComplete(data.secure_url);
        setPreview(data.secure_url);
      } else {
        throw new Error('No secure URL returned from Cloudinary');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError('Upload failed. Using local preview temporarily.');
      // Keep the local preview for UX so the form can still be filled out
      onUploadComplete(localUrl);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-5 border border-dashed border-slate-300 rounded-2xl bg-slate-50 gap-3 hover:bg-slate-100/50 transition">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      
      {preview ? (
        <div className="relative w-36 h-36 rounded-2xl overflow-hidden border border-slate-200 group shadow-sm bg-white">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          {loading ? (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="text-[10px] font-bold">Uploading...</span>
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
          {!loading && !error && (
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
        <span className="text-[11px] text-amber-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
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
