import Link from 'next/link';

export default function UnauthorizedPage({ searchParams }: { searchParams: { reason?: string } }) {
  const reason = searchParams.reason;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white rounded-3xl p-8 shadow-xl max-w-sm w-full border border-slate-100">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🚫</span>
        </div>
        
        <h1 className="text-2xl font-black text-slate-900 mb-2">Access Denied</h1>
        
        <p className="text-slate-600 font-medium mb-8">
          {reason === 'deactivated' 
            ? "Your account has been deactivated. Contact your owner." 
            : reason === 'no_branch'
            ? "No branch assigned. Contact your admin."
            : "You do not have permission to view this page."}
        </p>

        <Link 
          href="/" 
          className="block w-full bg-slate-900 text-white rounded-xl py-3 font-bold hover:bg-slate-800 transition-colors"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
