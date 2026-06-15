'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Image from 'next/image';
import { Phone, MessageCircle, IndianRupee, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import VacateNoticeSheet from '@/components/shared/VacateNoticeSheet';

export default function TenantDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Payment Sheet State
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Vacate Dialog State
  const [isVacateDialogOpen, setIsVacateDialogOpen] = useState(false);
  const [vacating, setVacating] = useState(false);

  // Vacate Notice State
  const [isVacateNoticeSheetOpen, setIsVacateNoticeSheetOpen] = useState(false);

  const fetchTenant = async () => {
    try {
      const res = await api.get(`/tenants/${id}`);
      if (res.data.success) {
        setTenant(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load tenant', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 pb-20">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Tenant not found</h2>
        <button onClick={() => router.back()} className="text-blue-600 font-bold p-4">Go Back</button>
      </div>
    );
  }

  const activeAdmission = tenant.admissions?.find((a: any) => a.status === 'ACTIVE') || tenant.admissions?.[0];
  const roomNumber = activeAdmission?.room?.roomNumber || 'N/A';
  const bedName = activeAdmission?.bed?.name ? `Bed ${activeAdmission.bed.name}` : '';
  const checkinDate = activeAdmission?.checkinDate ? new Date(activeAdmission.checkinDate) : null;
  const rentAmount = activeAdmission?.monthlyRent || 0;

  // Compute current month's invoice
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const currentMonthInvoice = tenant.invoices?.find((inv: any) => new Date(inv.createdAt) >= currentMonthStart) || null;
  const isPaidThisMonth = currentMonthInvoice?.status === 'PAID';
  
  let paidAmountThisMonth = 0;
  let paidDateThisMonth = null;
  
  if (currentMonthInvoice) {
    paidAmountThisMonth = currentMonthInvoice.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
    if (currentMonthInvoice.payments?.length > 0) {
      paidDateThisMonth = new Date(currentMonthInvoice.payments[0].paymentDate);
    }
  }

  const rentPending = isPaidThisMonth ? 0 : (Number(rentAmount) - paidAmountThisMonth);

  const handleRecordPayment = async () => {
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) return;
    
    setSubmittingPayment(true);
    try {
      const res = await api.post('/payments', {
        tenantId: id,
        amount: Number(paymentAmount),
        mode: paymentMode,
        date: paymentDate,
        note: paymentNote
      });

      if (res.data.success) {
        setIsPaymentSheetOpen(false);
        setPaymentAmount('');
        await fetchTenant(); // Refresh data
      }
    } catch (err) {
      console.error('Payment failed', err);
      alert('Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleVacate = async () => {
    setVacating(true);
    try {
      const res = await api.patch(`/tenants/${id}/vacate`);
      if (res.data.success) {
        setIsVacateDialogOpen(false);
        router.push('/tenants');
      }
    } catch (err) {
      console.error('Vacate failed', err);
      alert('Failed to mark tenant as vacated');
    } finally {
      setVacating(false);
    }
  };

  const paymentModes = ['Cash', 'PhonePe', 'GPay', 'Bank Transfer'];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button onClick={() => router.back()} className="p-2 -ml-2 active:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6 text-slate-700" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 flex-1">Tenant Profile</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center relative">
          <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden mb-4 border-4 border-white shadow-md">
            {tenant.photoUrl ? (
              <Image src={tenant.photoUrl} alt={tenant.name} fill className="object-cover" />
            ) : (
              <span className="text-2xl font-bold text-slate-400">{tenant.name.substring(0, 1)}</span>
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-1">{tenant.name}</h2>
          <p className="text-base font-semibold text-slate-500 mb-2">Room {roomNumber} {bedName ? `· ${bedName}` : ''}</p>
          {checkinDate && (
            <p className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
              Staying since {checkinDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}

          {tenant.vacateNotices?.some((n: any) => n.status === 'PENDING') ? (
            <div className="mt-4 w-full bg-orange-50 border border-orange-200 rounded-xl p-3 flex flex-col items-center">
              <span className="text-orange-600 font-bold text-sm">Vacating on {new Date(tenant.vacateNotices.find((n: any) => n.status === 'PENDING').vacateDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          ) : (
            <button 
              onClick={() => setIsVacateNoticeSheetOpen(true)}
              className="mt-4 w-full h-12 bg-white border-2 border-orange-200 text-orange-600 rounded-xl font-bold text-sm active:bg-orange-50 transition-colors flex items-center justify-center gap-2"
            >
              <span>📅</span> Give Vacate Notice
            </button>
          )}
        </div>

        {/* 3 Quick Action Buttons */}
        <div className="flex items-center gap-3">
          <a href={`tel:+91${tenant.phone}`} className="flex-1 h-14 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-1 active:bg-slate-50 transition-colors shadow-sm">
            <Phone className="h-5 w-5 text-blue-600" />
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Call</span>
          </a>
          <a href={`https://wa.me/91${tenant.phone}`} target="_blank" rel="noopener noreferrer" className="flex-1 h-14 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-1 active:bg-slate-50 transition-colors shadow-sm">
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">WhatsApp</span>
          </a>
          <button 
            onClick={() => {
              setPaymentAmount(rentPending > 0 ? rentPending.toString() : rentAmount.toString());
              setIsPaymentSheetOpen(true);
            }} 
            className="flex-1 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col items-center justify-center gap-1 active:bg-blue-100 transition-colors shadow-sm"
          >
            <IndianRupee className="h-5 w-5 text-blue-600" />
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Payment</span>
          </button>
        </div>

        {/* Payment Status Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">This Month's Rent</h3>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-black text-slate-900 mb-1">
                ₹{Number(rentAmount).toLocaleString()}
              </div>
              {isPaidThisMonth ? (
                <div className="flex flex-col gap-0.5 mt-1">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Paid on {paidDateThisMonth ? paidDateThisMonth.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'recently'}</span>
                  </div>
                  {currentMonthInvoice?.payments?.[0]?.recordedBy && (
                    <div className="text-[11px] font-semibold text-slate-400 ml-5">
                      Accepted by <span className="text-slate-600">{currentMonthInvoice.payments[0].recordedBy.name}</span>
                      <span className="opacity-75">
                        {currentMonthInvoice.payments[0].recordedBy.role === 'OWNER' || currentMonthInvoice.payments[0].recordedBy.role === 'SUPERADMIN'
                          ? ' (Owner)'
                          : ` (${currentMonthInvoice.payments[0].recordedBy.branch?.name || 'Unknown Branch'} Warden)`}
                      </span>
                    </div>
                  )}
                  <a 
                    href={`https://wa.me/91${tenant.phone}?text=${encodeURIComponent(`Hello *${tenant.name}*,\n\nThis is to confirm that we have successfully received your rent payment of *₹${paidAmountThisMonth.toLocaleString()}* for the month of *${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}*.\n\nThank you!\n- EasyPG Management`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-5 mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#25D366] hover:text-[#1ead51] transition-colors bg-[#25D366]/10 px-2 py-1 rounded-md w-fit"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Share WhatsApp Receipt
                  </a>
                </div>
              ) : (
                <div className="text-rose-600 font-bold text-sm">
                  ₹{rentPending.toLocaleString()} due
                </div>
              )}
            </div>

            {!isPaidThisMonth && (
              <button 
                onClick={() => {
                  setPaymentAmount(rentPending.toString());
                  setIsPaymentSheetOpen(true);
                }}
                className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
              >
                Record
              </button>
            )}
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Past Payments</h3>
          
          <div className="space-y-4">
            {tenant.invoices && tenant.invoices.slice(0, 6).map((inv: any) => {
              const invMonth = new Date(inv.createdAt);
              const isInvPaid = inv.status === 'PAID';
              const latestPayment = inv.payments?.[0];
              const recordedBy = latestPayment?.recordedBy;

              return (
                <div key={inv.id} className="flex items-center justify-between border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-11 w-11 rounded-full flex flex-col items-center justify-center font-bold",
                      isInvPaid ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      <span className="text-xs uppercase">{invMonth.toLocaleString('en-IN', { month: 'short' })}</span>
                      <span className="text-[10px] opacity-70 leading-none">{invMonth.getFullYear()}</span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-base">₹{Number(inv.amount).toLocaleString()}</p>
                      {isInvPaid && recordedBy ? (
                        <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                          Accepted by <span className="text-slate-600">{recordedBy.name}</span>
                          <span className="opacity-75">
                            {recordedBy.role === 'OWNER' || recordedBy.role === 'SUPERADMIN' 
                              ? ' (Owner)' 
                              : ` (${recordedBy.branch?.name || 'Unknown Branch'} Warden)`}
                          </span>
                        </p>
                      ) : (
                        <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                          {isInvPaid ? 'Paid' : 'Awaiting payment'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-xs font-bold px-2.5 py-1 rounded-md inline-block",
                      isInvPaid ? "text-emerald-700 bg-emerald-100" : "text-rose-700 bg-rose-100"
                    )}>
                      {isInvPaid ? 'Paid ✅' : 'Pending'}
                    </div>
                    {latestPayment?.paymentMode && (
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                        {latestPayment.paymentMode}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {(!tenant.invoices || tenant.invoices.length === 0) && (
              <p className="text-slate-500 font-medium text-center py-4">No payment history found.</p>
            )}
          </div>
        </div>

        {/* Vacate Button */}
        <div className="pt-6 pb-4">
          <button 
            onClick={() => setIsVacateDialogOpen(true)}
            className="w-full h-14 bg-white border-2 border-rose-100 text-rose-600 rounded-2xl font-bold text-base active:bg-rose-50 transition-colors"
          >
            Mark as Vacated
          </button>
        </div>
      </div>

      {/* Record Payment Bottom Sheet */}
      <Sheet open={isPaymentSheetOpen} onOpenChange={setIsPaymentSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe w-full max-w-md mx-auto bg-white">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl font-black text-slate-900">Record Payment</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 pb-6">
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Amount Received (₹)</label>
              <input 
                type="number" 
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full h-16 bg-slate-50 border-none rounded-2xl text-center text-3xl font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Payment Mode</label>
              <div className="flex flex-wrap gap-2">
                {paymentModes.map(mode => (
                  <button
                    key={mode}
                    onClick={() => setPaymentMode(mode.toUpperCase().replace(' ', '_'))}
                    className={cn(
                      "px-4 py-3 rounded-xl text-sm font-bold border transition-colors",
                      paymentMode === mode.toUpperCase().replace(' ', '_') 
                        ? "bg-slate-900 text-white border-slate-900" 
                        : "bg-white text-slate-600 border-slate-200"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Date</label>
              <input 
                type="date" 
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full h-14 bg-slate-50 border-none rounded-2xl px-4 text-base font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button 
              onClick={handleRecordPayment}
              disabled={submittingPayment}
              className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-black text-lg active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              {submittingPayment ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Save Payment'}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Custom Simple Vacate Dialog */}
      {isVacateDialogOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Vacate Tenant?</h3>
            <p className="text-slate-600 font-medium mb-8">Are you sure {tenant.name} is leaving? This will mark their bed as empty and complete their stay.</p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setIsVacateDialogOpen(false)}
                className="flex-1 h-12 bg-slate-100 text-slate-700 rounded-xl font-bold active:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleVacate}
                disabled={vacating}
                className="flex-1 h-12 bg-rose-600 text-white rounded-xl font-bold active:bg-rose-700 transition-colors flex items-center justify-center"
              >
                {vacating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Yes, Vacate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vacate Notice Sheet */}
      <VacateNoticeSheet 
        tenantId={id as string}
        tenantName={tenant.name}
        isOpen={isVacateNoticeSheetOpen}
        onClose={() => setIsVacateNoticeSheetOpen(false)}
        onSuccess={fetchTenant}
      />
    </div>
  );
}
