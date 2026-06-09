'use client';

import { useEffect, useState, useCallback, use } from 'react';
import api from '@/lib/api';
import { 
  User, 
  Phone, 
  School, 
  CreditCard, 
  Calendar, 
  Bed, 
  Building, 
  History, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowLeft,
  ArrowLeftRight,
  LogOut,
  Plus,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Tenant {
  id: string;
  name: string;
  phone: string;
  parentPhone: string | null;
  collegeName: string | null;
  aadhaarLast4: string | null;
  status: string;
  admissions: Array<{
    id: string;
    roomId: string;
    room: {
      roomNumber: string;
      branch: { name: string };
    };
    checkinDate: string;
    checkoutDate: string | null;
    monthlyRent: string;
    depositAmount: string;
    status: 'ACTIVE' | 'COMPLETED';
  }>;
  invoices: Array<{
    id: string;
    month: string;
    amount: string;
    dueDate: string;
    status: string;
  }>;
}

interface Room {
  id: string;
  roomNumber: string;
  branch: { name: string };
  occupiedCapacity: number;
  totalCapacity: number;
  rentAmount: string;
}

export default function TenantDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Admission Modal State
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [admissionData, setAdmissionData] = useState({
    roomId: '',
    checkinDate: format(new Date(), 'yyyy-MM-dd'),
    monthlyRent: '',
    depositAmount: '0',
  });
  const [submittingAdmission, setSubmittingAdmission] = useState(false);

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutDate, setCheckoutDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkingOut, setCheckingOut] = useState(false);

  const fetchTenant = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/tenants/${tenantId}`);
      if (data.success) {
        setTenant(data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch tenant details');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  const openAdmissionModal = async () => {
    try {
      const { data } = await api.get('/rooms/availability');
      if (data.success) {
        setAvailableRooms(data.data);
        setShowAdmissionModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    }
  };

  const handleAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAdmission(true);
    try {
      const { data } = await api.post('/admissions/checkin', {
        tenantId,
        ...admissionData,
        monthlyRent: Number(admissionData.monthlyRent),
        depositAmount: Number(admissionData.depositAmount),
      });
      if (data.success) {
        setShowAdmissionModal(false);
        fetchTenant();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Admission failed');
    } finally {
      setSubmittingAdmission(false);
    }
  };

  const handleTransfer = async () => {
    const activeAdmission = tenant?.admissions.find(a => a.status === 'ACTIVE');
    if (!activeAdmission || !newRoomId) return;

    setTransferring(true);
    try {
      const { data } = await api.post(`/admissions/transfer/${activeAdmission.id}`, {
        newRoomId,
        transferDate: new Date().toISOString()
      });
      if (data.success) {
        setShowTransferModal(false);
        fetchTenant();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const handleCheckout = async () => {
    const activeAdmission = tenant?.admissions.find(a => a.status === 'ACTIVE');
    if (!activeAdmission) return;

    setCheckingOut(true);
    try {
      const { data } = await api.post(`/admissions/checkout/${activeAdmission.id}`, {
        checkoutDate
      });
      if (data.success) {
        setShowCheckoutModal(false);
        fetchTenant();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  if (error || !tenant) return (
    <div className="text-center py-12">
      <p className="text-red-500">{error || 'Tenant not found'}</p>
      <Link href="/tenants" className="text-blue-600 hover:underline mt-4 inline-block">Back to Tenants</Link>
    </div>
  );

  const activeAdmission = tenant.admissions.find(a => a.status === 'ACTIVE');
  const admissionHistory = tenant.admissions.filter(a => a.status === 'COMPLETED');

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center space-x-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{tenant.name}</h1>
        <span className={cn(
          "rounded-full px-2.5 py-0.5 text-xs font-medium",
          tenant.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
        )}>
          {tenant.status}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center text-lg font-bold text-slate-900 mb-6">
              <User className="mr-2 h-5 w-5 text-blue-600" />
              Tenant Profile
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500">Phone</span>
                <span className="text-sm font-semibold text-slate-900">{tenant.phone}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500">Parent Phone</span>
                <span className="text-sm font-semibold text-slate-900">{tenant.parentPhone || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500">College/Company</span>
                <span className="text-sm font-semibold text-slate-900">{tenant.collegeName || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500">Aadhaar (Last 4)</span>
                <span className="text-sm font-semibold text-slate-900">{tenant.aadhaarLast4 || 'N/A'}</span>
              </div>
            </div>
            <button className="w-full mt-6 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
              Edit Profile
            </button>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 text-center">Lifecycle Actions</h2>
            <div className="space-y-3">
              {activeAdmission ? (
                <>
                  <button 
                    onClick={async () => {
                      const { data } = await api.get('/rooms/availability');
                      setAvailableRooms(data.data);
                      setShowTransferModal(true);
                    }}
                    className="flex w-full items-center justify-center space-x-2 rounded-xl bg-blue-50 py-3 text-sm font-bold text-blue-600 hover:bg-blue-100 transition"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    <span>Room Transfer</span>
                  </button>
                  <button 
                    onClick={() => setShowCheckoutModal(true)}
                    className="flex w-full items-center justify-center space-x-2 rounded-xl bg-rose-50 py-3 text-sm font-bold text-rose-600 hover:bg-rose-100 transition"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Checkout Tenant</span>
                  </button>
                </>
              ) : (
                <button 
                  onClick={openAdmissionModal}
                  className="flex w-full items-center justify-center space-x-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Admission</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Center Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Admission Status */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="flex items-center font-bold text-slate-900 uppercase tracking-wider text-xs">
                <Bed className="mr-2 h-4 w-4 text-blue-600" />
                Current Assignment
              </h2>
              {activeAdmission && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                  Active Stay
                </span>
              )}
            </div>
            
            <div className="p-6">
              {activeAdmission ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Room Details</p>
                      <p className="text-2xl font-black text-slate-900">Room {activeAdmission.room.roomNumber}</p>
                      <p className="text-sm font-medium text-slate-500 flex items-center mt-1">
                        <Building className="h-3 w-3 mr-1" />
                        {activeAdmission.room.branch.name}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Rent</p>
                        <p className="text-lg font-bold text-slate-900">₹{Number(activeAdmission.monthlyRent).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Deposit</p>
                        <p className="text-lg font-bold text-slate-900">₹{Number(activeAdmission.depositAmount).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center rounded-2xl bg-blue-50/50 p-6 border border-blue-100/50">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="rounded-full bg-blue-600 p-2 text-white">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Checked In On</p>
                        <p className="text-lg font-bold text-blue-900">{format(new Date(activeAdmission.checkinDate), 'dd MMMM yyyy')}</p>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600/70 font-medium">
                      Duration of stay: {Math.floor((new Date().getTime() - new Date(activeAdmission.checkinDate).getTime()) / (1000 * 60 * 60 * 24))} Days
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                    <Bed className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">No Active Admission</h3>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">
                      This tenant is currently not assigned to any room.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Invoices */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h2 className="flex items-center font-bold text-slate-900 uppercase tracking-wider text-xs">
                <FileText className="mr-2 h-4 w-4 text-blue-600" />
                Financial Records
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/50 text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                  <tr>
                    <th className="px-6 py-3">Month</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Due Date</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenant.invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900">{inv.month}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">₹{Number(inv.amount).toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-500">{format(new Date(inv.dueDate), 'dd MMM yyyy')}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter",
                          inv.status === 'PAID' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {inv.status !== 'PAID' ? (
                          <button className="text-xs font-bold text-blue-600 hover:text-blue-700">Pay Now</button>
                        ) : (
                          <button className="text-xs font-bold text-slate-400">Receipt</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {tenant.invoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">No invoices generated yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* History */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h2 className="flex items-center font-bold text-slate-900 uppercase tracking-wider text-xs">
                <History className="mr-2 h-4 w-4 text-blue-600" />
                Stay History
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {admissionHistory.length > 0 ? (
                  admissionHistory.map((adm) => (
                    <div key={adm.id} className="flex items-start space-x-4">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                        <CheckCircle2 className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="flex-1 border-b border-slate-100 pb-4">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900">Room {adm.room.roomNumber}</p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {format(new Date(adm.checkinDate), 'MMM yyyy')} - {adm.checkoutDate ? format(new Date(adm.checkoutDate), 'MMM yyyy') : 'Now'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{adm.room.branch.name}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-sm text-slate-400 italic">No historical records.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admission Modal */}
      {showAdmissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Assign Room</h2>
              <p className="text-sm text-slate-500">Admitting {tenant.name} to a new room.</p>
            </div>
            <form onSubmit={handleAdmission} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Select Room</label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {availableRooms.map(room => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setAdmissionData({ 
                        ...admissionData, 
                        roomId: room.id,
                        monthlyRent: room.rentAmount
                      })}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                        admissionData.roomId === room.id ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20" : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Room {room.roomNumber}</p>
                        <p className="text-[10px] text-slate-500">{room.branch.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">₹{Number(room.rentAmount).toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{room.totalCapacity - room.occupiedCapacity} left</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Check-in Date</label>
                  <input
                    type="date"
                    required
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-sm focus:border-blue-500 outline-none"
                    value={admissionData.checkinDate}
                    onChange={(e) => setAdmissionData({ ...admissionData, checkinDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Monthly Rent</label>
                  <input
                    type="number"
                    required
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-sm focus:border-blue-500 outline-none"
                    value={admissionData.monthlyRent}
                    onChange={(e) => setAdmissionData({ ...admissionData, monthlyRent: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Security Deposit</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-sm focus:border-blue-500 outline-none"
                  value={admissionData.depositAmount}
                  onChange={(e) => setAdmissionData({ ...admissionData, depositAmount: e.target.value })}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdmissionModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdmission || !admissionData.roomId}
                  className="flex-[2] rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {submittingAdmission ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Confirm Admission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Room Transfer</h2>
              <p className="text-sm text-slate-500">Moving {tenant.name} to a different room.</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Select New Room</label>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {availableRooms
                    .filter(r => r.id !== activeAdmission?.roomId)
                    .map(room => (
                    <button
                      key={room.id}
                      onClick={() => setNewRoomId(room.id)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border text-left transition-all",
                        newRoomId === room.id ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20" : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Room {room.roomNumber}</p>
                        <p className="text-[10px] text-slate-500">{room.branch.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">₹{Number(room.rentAmount).toLocaleString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={transferring || !newRoomId}
                  className="flex-[2] rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {transferring ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Confirm Transfer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Confirm Checkout</h2>
              <p className="text-sm text-slate-500">End admission for {tenant.name}.</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="rounded-xl bg-amber-50 p-4 border border-amber-100 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Checkout will mark the room as vacant and complete this admission period. Ensure all pending dues are cleared.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Checkout Date</label>
                <input
                  type="date"
                  required
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-sm focus:border-blue-500 outline-none"
                  value={checkoutDate}
                  onChange={(e) => setCheckoutDate(e.target.value)}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  className="flex-[2] rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700 transition disabled:opacity-50"
                >
                  {checkingOut ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Finalize Checkout'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
