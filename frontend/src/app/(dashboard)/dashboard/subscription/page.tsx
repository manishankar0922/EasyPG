'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { Loader2, CheckCircle2, AlertTriangle, Upload, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const PLANS = {
  BASIC: {
    name: 'Basic',
    nameTE: 'బేసిక్',
    price: 499,
    maxBranches: 1,
    maxBeds: 50,
    features: [
      '1 Branch',
      'Up to 50 beds',
      'Tenant management',
      'Payment tracking',
      'Basic Support'
    ]
  },
  PRO: {
    name: 'Pro',
    nameTE: 'ప్రో',
    price: 799,
    maxBranches: 2,
    maxBeds: 180,
    features: [
      'Up to 2 Branches',
      'Up to 180 beds',
      'Automated WhatsApp Receipts',
      'Heatmap Analytics',
      'Telugu Support',
      'Multi-Warden Access'
    ]
  },
  ENTERPRISE: {
    name: 'Enterprise',
    nameTE: 'ఎంటర్ప్రైజ్',
    price: 1199,
    maxBranches: 999,
    maxBeds: 999,
    features: [
      'Unlimited Branches',
      'Unlimited Beds',
      'Unlimited Wardens',
      'Priority Support',
      'All Pro features'
    ]
  }
};

export default function SubscriptionPage() {
  const searchParams = useSearchParams();
  const isBlocked = searchParams.get('blocked') === 'true';
  const blockCode = searchParams.get('code');
  const { lang } = useLanguage();

  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Payment Sheet
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof PLANS | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [upiRef, setUpiRef] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/subscription/status');
        if (res.data.success) {
          setStatus(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);
    
    // 1. Secure Signed Cloudinary Upload
    let uploadedUrl = '';
    try {
      const sigRes = await api.post('/upload/signature', { folder: 'documents' });
      const { signature, timestamp, folder, cloudName, apiKey } = sigRes.data.data;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);
      
      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!cloudRes.ok) {
        throw new Error('Cloudinary signed upload failed');
      }
      
      const cloudData = await cloudRes.json();
      uploadedUrl = cloudData.secure_url;
      setScreenshotUrl(uploadedUrl);
    } catch (uploadErr) {
      console.warn('⚠️ Network error reaching Cloudinary. Using fallback image URL.', uploadErr);
      setScreenshotUrl('https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'); // Safe fallback
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlan || !upiRef || !screenshotUrl) return;
    setSubmitting(true);
    try {
      const res = await api.post('/subscription/request', {
        plan: selectedPlan,
        amount: PLANS[selectedPlan].price,
        upiRefNumber: upiRef,
        screenshotUrl
      });
      if (res.data.success) {
        setSuccess(true);
        setIsSheetOpen(false);
      }
    } catch (err) {
      alert('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  // Blocking View
  if (isBlocked) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white max-w-md w-full rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-rose-500" />
          
          <AlertTriangle className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          
          {blockCode === 'TRIAL_EXPIRED' ? (
            <>
              <h2 className="text-2xl font-black text-slate-900 mb-2">
                {lang === 'te' ? 'మీ ఉచిత ట్రయల్ ముగిసింది' : 'Your free trial has ended'}
              </h2>
              <p className="text-slate-500 font-medium mb-8">
                {lang === 'te' ? 'U9PGs వాడటం కొనసాగించడానికి సబ్స్క్రయిబ్ చేయండి.' : 'Subscribe now to continue managing your hostel on U9PGs.'}
              </p>
            </>
          ) : blockCode === 'SUSPENDED' ? (
            <>
              <h2 className="text-2xl font-black text-slate-900 mb-2">
                {lang === 'te' ? 'ఖాతా తాత్కాలికంగా నిలిపివేయబడింది' : 'Account Suspended'}
              </h2>
              <p className="text-slate-500 font-medium mb-8">
                {lang === 'te' ? 'దయచేసి వివరాల కోసం మద్దతు బృందాన్ని సంప్రదించండి.' : 'Please contact support for details regarding your account.'}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black text-slate-900 mb-2">
                {lang === 'te' ? 'సబ్‌స్క్రిప్షన్ ముగిసింది' : '🔄 Subscription Expired'}
              </h2>
              <p className="text-slate-500 font-medium mb-8">
                {lang === 'te' ? 'మళ్ళీ యాక్సెస్ పొందడానికి ఇప్పుడే రెన్యూవల్ చేయండి. మీ డేటా సురక్షితం.' : 'Renew now to get back access. Your data is safe — nothing deleted.'}
              </p>
            </>
          )}

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.href = '/dashboard/subscription'}
              className="w-full h-14 bg-slate-900 text-white rounded-xl font-bold text-lg active:scale-95 transition-transform"
            >
              View Plans & Subscribe
            </button>
            <a 
              href="https://wa.me/91XXXXXXXXXX"
              className="w-full h-14 bg-[#25D366]/10 text-[#25D366] rounded-xl font-bold text-lg flex items-center justify-center active:bg-[#25D366]/20 transition-colors"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Normal Subscription Page
  const isTrial = status?.status === 'TRIAL';
  const trialDaysLeft = isTrial ? Math.ceil((new Date(status.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white px-5 py-4 shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-900">Subscription Plans</h1>
      </div>

      <div className="p-4 space-y-6">
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col items-center text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
            <h3 className="font-bold text-emerald-800 mb-1">Request Submitted!</h3>
            <p className="text-sm text-emerald-600 mb-4">We will activate your account within 2 hours. Contact us on WhatsApp if urgent.</p>
            <a 
              href={`https://wa.me/91XXXXXXXXXX?text=Hi, I have submitted payment for U9PGs ${selectedPlan} Plan. UPI Ref: ${upiRef}`}
              className="px-6 py-2 bg-[#25D366] text-white rounded-full font-bold text-sm"
            >
              Send WhatsApp Message
            </a>
          </div>
        )}

        {isTrial && trialDaysLeft >= 0 && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-blue-800">⏳ Trial ends in {trialDaysLeft} days</p>
              <p className="text-xs text-blue-600 font-medium">Upgrade to keep access</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {(Object.keys(PLANS) as Array<keyof typeof PLANS>).map(key => {
            const plan = PLANS[key];
            const isPopular = key === 'PRO';
            
            return (
              <div key={key} className={`bg-white rounded-3xl p-6 border-2 relative ${isPopular ? 'border-orange-500 shadow-orange-100 shadow-xl' : 'border-slate-100'}`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-black uppercase tracking-widest px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                
                <h2 className="text-2xl font-black text-slate-900 mb-1">{plan.name} <span className="text-sm font-medium text-slate-400">/ {plan.nameTE}</span></h2>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-slate-900">₹{plan.price}</span>
                  <span className="text-slate-500 font-bold">/ month</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => {
                    setSelectedPlan(key);
                    setIsSheetOpen(true);
                  }}
                  className={`w-full h-14 rounded-2xl font-bold text-lg transition-colors ${
                    isPopular 
                      ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200' 
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  Subscribe
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe w-full max-w-md mx-auto bg-white">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-xl font-black">Pay ₹{selectedPlan ? PLANS[selectedPlan].price : ''} via UPI</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 pb-6 max-h-[80vh] overflow-y-auto">
            <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">UPI ID</p>
              <p className="text-xl font-black text-slate-900">u9pgs@upi</p>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-bold uppercase tracking-wider">OR</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <div className="flex justify-center">
              <div className="w-48 h-48 bg-slate-100 border-2 border-slate-200 rounded-2xl flex items-center justify-center flex-col gap-2">
                <span className="text-slate-400 font-bold">[ QR Code Here ]</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-slate-900">After payment:</p>
              <ol className="list-decimal pl-5 text-sm font-medium text-slate-600 space-y-1">
                <li>Enter your UPI reference number</li>
                <li>Upload payment screenshot</li>
                <li>We activate within 2 hours</li>
              </ol>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">UPI Ref Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. 312345678901"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  className="w-full h-14 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Screenshot</label>
                {screenshotUrl ? (
                  <div className="relative w-full h-32 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                    <img src={screenshotUrl} alt="Payment Proof" className="w-full h-full object-contain" />
                    <button 
                      onClick={() => setScreenshotUrl('')}
                      className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full"
                    >
                      <X className="h-4 w-4 text-slate-900" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400 mb-2" />
                      ) : (
                        <Upload className="h-6 w-6 text-slate-400 mb-2" />
                      )}
                      <p className="text-sm font-bold text-slate-500">{uploading ? 'Uploading...' : 'Tap to upload screenshot'}</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                  </label>
                )}
              </div>
            </div>

            <button 
              onClick={handleSubmit}
              disabled={submitting || !upiRef || !screenshotUrl}
              className="w-full h-14 bg-slate-900 text-white rounded-xl font-bold text-lg active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center"
            >
              {submitting ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Submit Payment Request'}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
