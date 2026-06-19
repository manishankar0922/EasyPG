import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <AlertTriangle className="h-16 w-16 text-slate-300 mb-4" />
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Page Not Found</h2>
      <p className="text-slate-500 mb-6">Could not find the requested resource.</p>
      <Link 
        href="/" 
        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
      >
        Return Home
      </Link>
    </div>
  );
}
