'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import MobileCameraCapture from '@/components/shared/MobileCameraCapture';
import LoadingScreen from '@/components/shared/LoadingScreen';
import { Loader2, UserPlus, Phone, Calendar, Banknote, BedDouble, AlertCircle, CheckCircle2, MessageCircle, User, CreditCard, School } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

type Bed = { id: string; bedNumber: string; isOccupied: boolean };
type Room = {
  id: string;
  roomNumber: string;
  floor: number;
  rentAmount: number;
  beds: Bed[];
};

export default function AddTenantPage() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [aadhaarLast4, setAadhaarLast4] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [aadhaarPhotoUrl, setAadhaarPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingAadhaar, setIsUploadingAadhaar] = useState(false);
  const [checkinDate, setCheckinDate] = useState(new Date().toISOString().split('T')[0]);
  const [monthlyRent, setMonthlyRent] = useState<number | ''>('');
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  const [hasPreviousDues, setHasPreviousDues] = useState(false);
  const [pastDues, setPastDues] = useState<{month: string, amount: number | ''}[]>([]);
  
  // OTP Verification state
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Bed Assignment State
  const [autoAssign, setAutoAssign] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  
  // Manual Assignment selection
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);

  // Submit State
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdTenantData, setCreatedTenantData] = useState<any>(null);
  const [error, setError] = useState('');

  // Calculate past 6 months for previous dues
  const pastMonths = React.useMemo(() => {
    const options = [];
    const d = new Date();
    for(let i=1; i<=6; i++) {
      const past = new Date(d.getFullYear(), d.getMonth() - i, 1);
      options.push(past.toLocaleString('en-IN', { month: 'long', year: 'numeric' }));
    }
    return options;
  }, []);

  // Fetch rooms with beds
  useEffect(() => {
    async function fetchRooms() {
      try {
        const { data } = await api.get('/rooms?includeBeds=true');
        if (data.success) {
          setRooms(Array.isArray(data.data) ? data.data : data.data?.rooms ?? []);
        } else {
          setRooms([]);
        }
      } catch (err) {
        console.error("Failed to fetch rooms", err);
        setRooms([]); // Ensure rooms stays an array on failure
      } finally {
        setLoadingRooms(false);
      }
    }
    fetchRooms();
  }, []);

  // Compute best bed for auto-assign
  const bestBed = React.useMemo(() => {
    // Defensive programming: safely fallback if rooms is somehow not an array
    if (!Array.isArray(rooms) || !rooms.length) return null;
    const sortedRooms = [...rooms].sort((a, b) => {
      if (a.floor !== b.floor) return a.floor - b.floor;
      return a.roomNumber.localeCompare(b.roomNumber);
    });

    for (const room of sortedRooms) {
      if (!Array.isArray(room.beds)) continue;
      const vacantBeds = room.beds.filter(b => !b.isOccupied).sort((a, b) => a.bedNumber.localeCompare(b.bedNumber));
      if (vacantBeds.length > 0) {
        return { room, bed: vacantBeds[0] };
      }
    }
    return null;
  }, [rooms]);

  // Effect to auto-fill rent when a room is selected (either manually or via auto-assign)
  useEffect(() => {
    if (autoAssign && bestBed) {
      setMonthlyRent(Number(bestBed.room.rentAmount));
    } else if (!autoAssign && selectedRoomId) {
      const room = rooms.find(r => r.id === selectedRoomId);
      if (room) setMonthlyRent(Number(room.rentAmount));
    }
  }, [autoAssign, bestBed, selectedRoomId, rooms]);

  const handleSendOtp = () => {
    if (!phone || phone.length < 10) {
      toast.warning('Please enter a valid 10-digit phone number first.');
      return;
    }
    setVerifyingOtp(true);
    setTimeout(() => {
      setVerifyingOtp(false);
      setOtpSent(true);
      toast.info(`Dummy OTP sent to ${phone}`);
    }, 1000);
  };

  const handleVerifyOtp = () => {
    setVerifyingOtp(true);
    setTimeout(() => {
      setVerifyingOtp(false);
      setOtpVerified(true);
      toast.success('Phone number verified successfully!');
    }, 1000);
  };

  // Derive final selection
  const finalRoomId = autoAssign ? bestBed?.room.id : selectedRoomId;
  const finalBedId = autoAssign ? bestBed?.bed.id : selectedBedId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let isPhoneVerified = otpVerified;
    if (!otpVerified) {
      const confirmBypass = window.confirm(
        "Phone number is not verified with OTP.\n\nDo you want to admit this tenant provisionally? They will be marked as 'Pending Verification'."
      );
      if (!confirmBypass) {
        return;
      }
      isPhoneVerified = false;
    }

    if (!photoUrl) {
      setError('Tenant photo is required.');
      return;
    }
    if (phone.length !== 10) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    if (!finalRoomId || !finalBedId) {
      setError('A bed must be assigned before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/tenants', {
        name,
        phone,
        parentPhone,
        aadhaarLast4,
        collegeName,
        photoUrl,
        aadhaarPhotoUrl,
        roomId: finalRoomId,
        bedId: finalBedId,
        monthlyRent: Number(monthlyRent),
        checkinDate,
        depositAmount: depositAmount ? Number(depositAmount) : 0,
        pastDues: hasPreviousDues ? pastDues.filter(d => d.amount && Number(d.amount) > 0) : [],
        status: 'ACTIVE',
        isVerified: isPhoneVerified
      });

      if (res.data.success) {
        const assignedRoom = Array.isArray(rooms) ? rooms.find(r => r.id === finalRoomId) : null;
        setCreatedTenantData({
          name,
          phone,
          room: assignedRoom?.roomNumber || 'Unknown',
          rent: monthlyRent
        });
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add tenant');
    } finally {
      setSubmitting(false);
    }
  };

  // Group rooms for manual selection
  const floors = Array.isArray(rooms)
    ? Array.from(new Set(rooms.map(r => r.floor))).sort((a, b) => a - b)
    : [];

  const roomsOnSelectedFloor = Array.isArray(rooms)
    ? rooms.filter(r => r.floor === selectedFloor)
    : [];

  const selectedRoom = Array.isArray(rooms)
    ? rooms.find(r => r.id === selectedRoomId)
    : undefined;

  if (loadingRooms) return <LoadingScreen message="Loading rooms..." />;
  if (!Array.isArray(rooms) || rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3 min-h-screen bg-slate-50">
        <span className="text-4xl">🛏️</span>
        <p className="text-gray-500 text-center">
          No rooms found. Ask your admin to set up rooms first.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Add New Tenant</h1>
        <button onClick={() => router.back()} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
          Cancel
        </button>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6">
        {success ? (
          <div className="flex flex-col items-center justify-center pt-8 animate-in zoom-in-95 duration-500">
            <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-6">Profile Created!</h2>
            
            <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full shadow-sm mb-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 bg-slate-100 rounded-full overflow-hidden relative">
                  {photoUrl ? <img src={photoUrl} alt="Photo" className="object-cover w-full h-full" /> : <User className="m-auto mt-4 text-slate-400" />}
                </div>
                <div>
                  <h3 className="font-bold text-xl text-slate-900">{createdTenantData?.name}</h3>
                  <p className="text-slate-500 font-medium">{createdTenantData?.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Room</p>
                  <p className="font-bold text-slate-900">{createdTenantData?.room}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Rent</p>
                  <p className="font-bold text-emerald-600">₹{createdTenantData?.rent}</p>
                </div>
              </div>
            </div>

            <div className="w-full space-y-4">
              <a 
                href={`https://wa.me/91${createdTenantData?.phone}?text=${encodeURIComponent(`Welcome to U9PGs, *${createdTenantData?.name}*!\n\nYour profile has been successfully created.\n*Room:* ${createdTenantData?.room}\n*Rent:* ₹${createdTenantData?.rent}\n\nWe are happy to have you!\n- Management`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-14 bg-[#25D366] text-white rounded-2xl font-bold text-lg active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20"
              >
                <MessageCircle className="h-5 w-5" /> Send Welcome WhatsApp
              </a>
              <button 
                onClick={() => router.push('/tenants')}
                className="w-full h-14 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold text-lg active:bg-slate-50 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Photos */}
          <section className="grid grid-cols-2 gap-4">
            <MobileCameraCapture 
              label="Tenant Photo *" 
              onUploadStart={() => setIsUploadingPhoto(true)}
              onUploadComplete={(url) => { setPhotoUrl(url); setIsUploadingPhoto(false); }} 
            />
            <MobileCameraCapture 
              label="Aadhaar ID" 
              onUploadStart={() => setIsUploadingAadhaar(true)}
              onUploadComplete={(url) => { setAadhaarPhotoUrl(url); setIsUploadingAadhaar(false); }} 
            />
          </section>

          {/* Basic Info */}
          <section className="space-y-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Personal Info</h2>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Full Name</label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text" required 
                  placeholder="Rahul Kumar"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-sm text-sm"
                  value={name} onChange={e => setName(e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input 
                  type="tel"
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  required 
                  placeholder="Enter 10 digit mobile number"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-sm text-sm disabled:opacity-50"
                  value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                  disabled={otpVerified}
                />
              </div>
              
              {!otpVerified && (
                <div className="flex gap-2 mt-2">
                  <a 
                    href={`tel:${phone}`}
                    onClick={() => {
                      if (phone.length >= 10) {
                        setOtpVerified(true);
                      }
                    }}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                      phone.length < 10 
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none" 
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                  >
                    <Phone className="h-3 w-3" />
                    Call to Verify
                  </a>
                </div>
              )}
              {otpVerified && <div className="text-xs font-bold text-emerald-500 mt-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Verified</div>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Parent Phone Number (Optional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input 
                  type="tel"
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  placeholder="Enter parent mobile number"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-sm text-sm"
                  value={parentPhone} onChange={e => setParentPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Aadhaar Last 4 Digits (Optional)</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g. 1234"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-sm text-sm"
                  value={aadhaarLast4} onChange={e => setAadhaarLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">College / Workplace Name (Optional)</label>
              <div className="relative">
                <School className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="e.g. MIT College"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-sm text-sm"
                  value={collegeName} onChange={e => setCollegeName(e.target.value)} 
                />
              </div>
            </div>
          </section>

          {/* Bed Assignment */}
          <section className="space-y-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Bed Assignment</h2>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={autoAssign} 
                  onChange={(e) => setAutoAssign(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Auto Assign
              </label>
            </div>

            {loadingRooms ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : autoAssign ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                {bestBed ? (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                      <BedDouble className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Assigned Bed</p>
                      <p className="text-sm font-bold text-slate-900">Room {bestBed.room.roomNumber} · {bestBed.bed.bedNumber}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-600 font-semibold text-center">No vacant beds available.</p>
                )}
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Floor Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500">Select Floor</label>
                  <div className="flex flex-wrap gap-2">
                    {floors.map(floor => (
                      <button
                        key={floor} type="button"
                        onClick={() => { setSelectedFloor(floor); setSelectedRoomId(null); setSelectedBedId(null); }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                          selectedFloor === floor 
                            ? "bg-slate-800 text-white border-slate-800" 
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                        )}
                      >
                        Floor {floor}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Room Selection */}
                {selectedFloor !== null && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500">Select Room</label>
                    <div className="flex flex-wrap gap-2">
                      {roomsOnSelectedFloor.map(room => {
                        const vacant = room.beds.filter(b => !b.isOccupied).length;
                        return (
                          <button
                            key={room.id} type="button"
                            disabled={vacant === 0}
                            onClick={() => { setSelectedRoomId(room.id); setSelectedBedId(null); }}
                            className={cn(
                              "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                              selectedRoomId === room.id 
                                ? "bg-slate-800 text-white border-slate-800" 
                                : vacant === 0
                                  ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                            )}
                          >
                            {room.roomNumber} <span className="opacity-70 font-normal text-xs ml-1">({vacant})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bed Selection */}
                {selectedRoomId && selectedRoom && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500">Select Bed</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedRoom.beds.map(bed => (
                        <button
                          key={bed.id} type="button"
                          disabled={bed.isOccupied}
                          onClick={() => setSelectedBedId(bed.id)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                            selectedBedId === bed.id 
                              ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20" 
                              : bed.isOccupied
                                ? "bg-red-50 text-red-400 border-red-100 cursor-not-allowed"
                                : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"
                          )}
                        >
                          {bed.bedNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Admission Details */}
          <section className="space-y-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Admission Info</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Move-in Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input 
                    type="date" required 
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-sm text-sm"
                    value={checkinDate} onChange={e => setCheckinDate(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Security Deposit (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-slate-400 font-bold">₹</span>
                  <input 
                    type="number" 
                    placeholder="e.g. 5000"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-8 pr-4 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-sm text-sm"
                    value={depositAmount} onChange={e => setDepositAmount(e.target.value ? Number(e.target.value) : '')} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Monthly Rent (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-slate-400 font-bold">₹</span>
                  <input 
                    type="number" 
                    placeholder="e.g. 4000"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-8 pr-4 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-sm text-sm"
                    value={monthlyRent} onChange={e => setMonthlyRent(e.target.value ? Number(e.target.value) : '')} 
                  />
                </div>
              </div>

            </div>

            {/* FULL WIDTH PAST DUES */}
            <div className="mt-4 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    checked={hasPreviousDues}
                    onChange={(e) => {
                      setHasPreviousDues(e.target.checked);
                      if (!e.target.checked) {
                        setPastDues([]);
                      } else if (pastDues.length === 0) {
                        setPastDues([{ month: pastMonths[0], amount: '' }]);
                      }
                    }}
                  />
                  Carrying Past Dues?
                </label>
                <span className="text-[10px] text-slate-400">If they owe rent for multiple past months</span>
              </div>

              {hasPreviousDues && (
                <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                  {pastDues.map((due, index) => (
                    <div key={index} className="flex gap-3 items-end">
                      <div className="space-y-1.5 flex-1">
                        <label className="text-xs font-semibold text-slate-600">Which Month?</label>
                        <select 
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 px-3 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-sm text-sm"
                          value={due.month}
                          onChange={e => {
                            const newDues = [...pastDues];
                            newDues[index].month = e.target.value;
                            setPastDues(newDues);
                          }}
                        >
                          {pastMonths.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <label className="text-xs font-semibold text-slate-600">Amount (₹)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-3.5 text-slate-400 font-bold">₹</span>
                          <input 
                            type="number" 
                            placeholder="e.g. 2000"
                            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-8 pr-4 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-sm text-sm"
                            value={due.amount} 
                            onChange={e => {
                              const newDues = [...pastDues];
                              newDues[index].amount = e.target.value ? Number(e.target.value) : '';
                              setPastDues(newDues);
                            }} 
                          />
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const newDues = pastDues.filter((_, i) => i !== index);
                          setPastDues(newDues);
                          if (newDues.length === 0) setHasPreviousDues(false);
                        }}
                        className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPastDues([...pastDues, { month: pastMonths[0], amount: '' }])}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    + Add Another Month
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Error & Submit */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={submitting || (!autoAssign && !selectedBedId) || (autoAssign && !bestBed) || isUploadingPhoto || isUploadingAadhaar}
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-lg rounded-2xl transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {(submitting || isUploadingPhoto || isUploadingAadhaar) && <Loader2 className="h-5 w-5 animate-spin" />}
            {submitting ? 'Adding Tenant...' : isUploadingPhoto || isUploadingAadhaar ? 'Waiting for upload...' : 'Add Tenant'}
          </button>
        </form>
        )}
      </main>
    </div>
  );
}
