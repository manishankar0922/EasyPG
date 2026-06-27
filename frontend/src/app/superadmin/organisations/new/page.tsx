'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Building2, User, Phone, MapPin, Layers, Loader2, CheckCircle2, Copy, Send, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import DevLoader from '@/components/superadmin/DevLoader';

type RoomConfig = {
  roomName: string;
  bedCount: number;
  rentPerBed: number;
};

type FloorConfig = {
  floorNumber: number;
  roomCount: number;
  rooms: RoomConfig[];
};

type BranchConfig = {
  name: string;
  address: string;
  floors: FloorConfig[];
};

export default function NewOrganisationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  const [orgName, setOrgName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [plan, setPlan] = useState('PRO');

  // OTP Verification state for Owner
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [branchCount, setBranchCount] = useState<number | ''>('');
  const [branches, setBranches] = useState<BranchConfig[]>([]);

  const handleBranchCountChange = (val: string) => {
    if (val === '') {
      setBranchCount('');
      setBranches([]);
      return;
    }
    const count = parseInt(val, 10);
    if (isNaN(count) || count < 0) return;
    
    setBranchCount(count);
    setBranches(prev => {
      const newBranches = [...prev];
      if (count > newBranches.length) {
        for (let i = newBranches.length + 1; i <= count; i++) {
          newBranches.push({ name: `Branch ${i}`, address: '', floors: [] });
        }
      } else if (count < newBranches.length) {
        newBranches.splice(count);
      }
      return newBranches;
    });
  };

  const handleBranchChange = (bIdx: number, field: keyof BranchConfig, value: string) => {
    setBranches(prev => {
      const newBranches = [...prev];
      newBranches[bIdx] = { ...newBranches[bIdx], [field]: value };
      return newBranches;
    });
  };

  const handleFloorCountChange = (bIdx: number, val: string) => {
    const count = val === '' ? 0 : parseInt(val, 10);
    if (isNaN(count) || count < 0) return;

    setBranches(prev => {
      const newBranches = [...prev];
      const branch = { ...newBranches[bIdx] };
      const newFloors = [...branch.floors];
      
      if (count > newFloors.length) {
        for (let i = newFloors.length + 1; i <= count; i++) {
          newFloors.push({ floorNumber: i, roomCount: 0, rooms: [] });
        }
      } else if (count < newFloors.length) {
        newFloors.splice(count);
      }
      
      branch.floors = newFloors;
      newBranches[bIdx] = branch;
      return newBranches;
    });
  };

  const handleRoomCountChange = (bIdx: number, fIdx: number, val: string) => {
    const count = val === '' ? 0 : parseInt(val, 10);
    if (isNaN(count) || count < 0) return;

    setBranches(prev => {
      const newBranches = [...prev];
      const branch = { ...newBranches[bIdx] };
      const newFloors = [...branch.floors];
      const floor = { ...newFloors[fIdx] };
      
      floor.roomCount = count;
      const newRooms = [...floor.rooms];
      
      if (count > newRooms.length) {
        for (let i = newRooms.length + 1; i <= count; i++) {
          const roomName = `${floor.floorNumber}${i.toString().padStart(2, '0')}`;
          newRooms.push({ roomName, bedCount: 3, rentPerBed: 5000 });
        }
      } else if (count < newRooms.length) {
        newRooms.splice(count);
      }
      
      floor.rooms = newRooms;
      newFloors[fIdx] = floor;
      branch.floors = newFloors;
      newBranches[bIdx] = branch;
      return newBranches;
    });
  };

  const handleRoomChange = (bIdx: number, fIdx: number, rIdx: number, field: keyof RoomConfig, value: number) => {
    setBranches(prev => {
      const newBranches = [...prev];
      const branch = { ...newBranches[bIdx] };
      const newFloors = [...branch.floors];
      const floor = { ...newFloors[fIdx] };
      const newRooms = [...floor.rooms];
      
      newRooms[rIdx] = { ...newRooms[rIdx], [field]: value };
      
      floor.rooms = newRooms;
      newFloors[fIdx] = floor;
      branch.floors = newFloors;
      newBranches[bIdx] = branch;
      return newBranches;
    });
  };

  const handleSendOtp = () => {
    if (!ownerPhone || ownerPhone.length < 10) {
      alert('Please enter a valid 10-digit phone number first.');
      return;
    }
    setVerifyingOtp(true);
    setTimeout(() => {
      setVerifyingOtp(false);
      setOtpSent(true);
      alert(`Dummy OTP sent to ${ownerPhone}`);
    }, 1000);
  };

  const handleVerifyOtp = () => {
    setVerifyingOtp(true);
    setTimeout(() => {
      setVerifyingOtp(false);
      setOtpVerified(true);
      alert('Owner phone verified successfully!');
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    setLoading(true);
    try {
      const { data } = await api.post('/superadmin/organisations', {
        orgName, ownerName, ownerPhone, ownerEmail, ownerAddress, branches, plan
      });

      if (data.success) {
        setSuccessData({
          email: data.data.ownerCredentials?.email || ownerEmail,
          password: data.data.ownerCredentials?.tempPassword || data.data.tempPassword
        });
        window.scrollTo(0, 0);
      }
    } catch (err: any) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        const errorMsg = Object.entries(serverErrors)
          .map(([_, msg]) => `${msg}`)
          .join(', ');
        setError(errorMsg);
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to create organisation');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyDetails = () => {
    if (!successData) return;
    const text = `Welcome to U9PGs!\nYour login:\nEmail: ${successData.email}\nPassword: ${successData.password}\nLogin at: app.u9pgs.in`;
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading) {
    return <DevLoader message="Provisioning database structures & generating seed values..." />;
  }

  if (successData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white max-w-md w-full rounded-3xl p-8 shadow-xl border border-slate-100 text-center">
          <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Organisation Created!</h2>
          <p className="text-slate-500 font-medium mb-8">The owner has been provisioned.</p>

          <div className="bg-slate-50 rounded-2xl p-5 text-left border border-slate-200 mb-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Owner Login Details</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 font-medium">Email</p>
                <p className="font-bold text-slate-900">{successData.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Temporary Password</p>
                <p className="font-mono font-bold text-lg tracking-wider text-slate-900 bg-white inline-block px-3 py-1 rounded border mt-1">{successData.password}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={copyDetails}
              className="w-full flex items-center justify-center gap-2 h-14 bg-white text-slate-700 border border-slate-300 rounded-xl font-bold hover:bg-slate-50 transition-colors"
            >
              <Copy className="h-5 w-5" /> Copy Details
            </button>
            <a 
              href={`https://wa.me/91${ownerPhone}?text=${encodeURIComponent(`Welcome to U9PGs!\nYour login:\nEmail: ${successData.email}\nPassword: ${successData.password}\nLogin at: app.u9pgs.in`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 h-14 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#20b858] transition-colors shadow-lg shadow-[#25D366]/20"
            >
              <Send className="h-5 w-5" /> Send via WhatsApp
            </a>
            <button 
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center h-14 bg-transparent text-blue-600 font-bold hover:bg-blue-50 rounded-xl transition-colors mt-2"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalBranches = branches.length;
  const totalRooms = branches.reduce((acc, b) => acc + b.floors.reduce((fAcc, f) => fAcc + f.rooms.length, 0), 0);
  const totalBeds = branches.reduce((acc, b) => acc + b.floors.reduce((fAcc, f) => fAcc + f.rooms.reduce((rAcc, r) => rAcc + r.bedCount, 0), 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-32">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-4">
            <Link href="/superadmin/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-700 transition text-slate-300">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">Create Organisation</h1>
              <p className="text-xs text-slate-400">Super Admin · Multi-Branch Setup</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* SECTION 1: Owner Details */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 overflow-hidden shadow-sm">
            <div className="border-b border-slate-700/50 bg-slate-800/30 px-6 py-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Section 1: Owner Details</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Organisation Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                  <input type="text" required placeholder="e.g. Skyline Luxury Hostels"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-medium"
                    value={orgName} onChange={e => setOrgName(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Owner Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                    <input type="text" required placeholder="Vikram Sethi"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-medium"
                      value={ownerName} onChange={e => setOwnerName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Owner Phone (OTP Verified)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                    <input type="tel" required placeholder="9876511111" pattern="[0-9]{10}" maxLength={10}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-medium disabled:opacity-50"
                      value={ownerPhone} onChange={e => setOwnerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} disabled={otpVerified} />
                  </div>
                  
                  {!otpVerified && (
                    <div className="flex gap-2 mt-2">
                      {otpSent ? (
                        <>
                          <input 
                            type="text" 
                            maxLength={6} 
                            placeholder="OTP" 
                            className="flex-1 max-w-[120px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none tracking-widest"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                          />
                          <button 
                            type="button" 
                            onClick={handleVerifyOtp}
                            disabled={verifyingOtp || otpCode.length < 4}
                            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                          >
                            {verifyingOtp ? 'Verifying...' : 'Verify'}
                          </button>
                        </>
                      ) : (
                        <button 
                          type="button" 
                          onClick={handleSendOtp}
                          disabled={verifyingOtp || ownerPhone.length < 10}
                          className="rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 px-4 py-1.5 text-xs font-bold hover:bg-blue-600/40 transition disabled:opacity-50"
                        >
                          {verifyingOtp ? <Loader2 className="h-4 w-4 animate-spin inline" /> : 'Send OTP'}
                        </button>
                      )}
                    </div>
                  )}
                  {otpVerified && <div className="text-xs font-bold text-emerald-500 mt-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Verified</div>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Owner Email</label>
                <input type="email" required placeholder="owner@domain.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 px-4 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-medium"
                  value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Owner Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                    <textarea rows={3} placeholder="Complete postal address..." required
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-medium resize-none"
                      value={ownerAddress} onChange={e => setOwnerAddress(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Initial Trial Plan</label>
                  <div className="relative">
                    <select
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 px-4 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-bold appearance-none cursor-pointer"
                      value={plan}
                      onChange={e => setPlan(e.target.value)}
                    >
                      <option value="BASIC">Basic Pro Trial (14 Days Pro &gt; Auto-Downgrades to Basic)</option>
                      <option value="STRICT_BASIC">Strictly Basic (Free limits immediately, no Pro trial)</option>
                      <option value="PRO">PRO Trial (14 Days Free &gt; Locks if unpaid)</option>
                      <option value="ENTERPRISE">ENTERPRISE (Custom limits &gt; Locks if unpaid)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">This will be granted as a 14-day trial.</p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Branches */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 overflow-hidden shadow-sm">
            <div className="border-b border-slate-700/50 bg-slate-800/30 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Section 2: Branches</h2>
              <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm">
                <label className="text-xs font-bold text-slate-400">How many branches?</label>
                <input type="number" min="0" max="10" required placeholder="e.g. 2"
                  className="w-16 rounded border border-slate-700 bg-slate-900 py-1 px-2 text-white text-sm font-bold focus:border-blue-500 focus:outline-none"
                  value={branchCount} onChange={e => handleBranchCountChange(e.target.value)} />
              </div>
            </div>

            <div className="p-6 space-y-8">
              {branches.length === 0 && (
                <div className="text-center py-8 text-slate-400 font-medium">
                  Enter the number of branches to start setup.
                </div>
              )}

              {branches.map((branch, bIdx) => (
                <div key={bIdx} className="rounded-xl border border-slate-700/50 bg-slate-800/40 overflow-hidden relative">
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-500" />
                  <div className="p-5 pl-7 border-b border-slate-700/50 bg-slate-900/50">
                    <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                      <Layers className="h-5 w-5 text-blue-500" />
                      Branch {bIdx + 1}
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400">Branch Name</label>
                        <input type="text" required placeholder="e.g. Main Branch"
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 px-3 text-white text-sm focus:border-blue-500 focus:outline-none"
                          value={branch.name} onChange={e => handleBranchChange(bIdx, 'name', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400">Branch Address</label>
                        <input type="text" required placeholder="Address for this branch"
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 px-3 text-white text-sm focus:border-blue-500 focus:outline-none"
                          value={branch.address} onChange={e => handleBranchChange(bIdx, 'address', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pl-7 space-y-6">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-bold text-slate-300">Number of Floors in {branch.name || `Branch ${bIdx + 1}`}</label>
                      <input type="number" min="0" max="20" required placeholder="0"
                        className="w-20 rounded-lg border border-slate-700 bg-slate-950 py-2 px-3 text-white text-sm font-bold focus:border-blue-500 focus:outline-none shadow-sm"
                        value={branch.floors.length === 0 ? '' : branch.floors.length} 
                        onChange={e => handleFloorCountChange(bIdx, e.target.value)} />
                    </div>

                    <div className="space-y-4">
                      {branch.floors.map((floor, fIdx) => (
                        <div key={fIdx} className="rounded-xl border border-slate-700/50 bg-slate-900/50 overflow-hidden shadow-sm">
                          <div className="bg-slate-800/60 px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-700 text-slate-300 text-xs">F{floor.floorNumber}</span>
                              Floor {floor.floorNumber}
                            </h4>
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-bold text-slate-400">Rooms:</label>
                              <input type="number" min="0" max="50" required
                                className="w-16 rounded border border-slate-700 bg-slate-950 py-1 px-2 text-white text-sm font-bold focus:border-blue-500 focus:outline-none"
                                value={floor.roomCount === 0 ? '' : floor.roomCount} 
                                onChange={e => handleRoomCountChange(bIdx, fIdx, e.target.value)} />
                            </div>
                          </div>

                          {floor.rooms.length > 0 && (
                            <div className="p-4 space-y-3">
                              {floor.rooms.map((room, rIdx) => (
                                <div key={rIdx} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 rounded-lg bg-slate-800/40 p-3 border border-slate-700/50">
                                  <div className="w-24 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Room</span>
                                    <span className="inline-block bg-slate-950 text-white px-3 py-1.5 rounded-md text-sm font-bold border border-slate-700 shadow-sm">
                                      {room.roomName}
                                    </span>
                                  </div>

                                  <div className="flex-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Beds</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {[1, 2, 3, 4, 5, 6, 8].map(num => (
                                        <button
                                          key={num} type="button"
                                          onClick={() => handleRoomChange(bIdx, fIdx, rIdx, 'bedCount', num)}
                                          className={cn(
                                            "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all border",
                                            room.bedCount === num 
                                              ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20" 
                                              : "bg-slate-950 text-slate-400 border-slate-700 hover:border-slate-500"
                                          )}
                                        >
                                          {num}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="w-full sm:w-32 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Rent / Bed (₹)</span>
                                    <input type="number" min="0" required
                                      className="w-full rounded-lg border border-slate-700 bg-slate-950 py-1.5 px-3 text-right text-white font-bold focus:border-blue-500 focus:outline-none shadow-sm"
                                      value={room.rentPerBed} 
                                      onChange={e => handleRoomChange(bIdx, fIdx, rIdx, 'rentPerBed', Number(e.target.value))} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Branch Live Summary */}
                  {branch.floors.length > 0 && (
                    <div className="bg-slate-900 px-5 pl-7 py-3 text-xs font-bold text-slate-500 flex gap-2">
                      <span className="text-slate-300">{branch.name || `Branch ${bIdx + 1}`} Summary:</span>
                      <span>{branch.floors.length} floors</span>
                      <span>·</span>
                      <span>{branch.floors.reduce((acc, f) => acc + f.rooms.length, 0)} rooms</span>
                      <span>·</span>
                      <span className="text-emerald-500">{branch.floors.reduce((acc, f) => acc + f.rooms.reduce((r, rm) => r + rm.bedCount, 0), 0)} beds</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-600 flex items-center gap-2 shadow-sm">
              <ShieldAlert className="h-5 w-5" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-4 pt-4 border-t border-slate-800">
            <Link href="/superadmin/dashboard"
              className="flex-1 text-center rounded-xl border border-slate-700 bg-slate-900 py-4 text-sm font-bold text-slate-300 hover:bg-slate-800 transition-all shadow-sm">
              Cancel
            </Link>
            <button type="submit" disabled={loading || branches.length === 0}
              className="flex-[2] rounded-xl bg-blue-600 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading
                ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Provisioning Entire Setup...</span>
                : 'Create Organisation & Provision Setup'}
            </button>
          </div>

        </form>
      </main>

      {/* Live Total Summary Footer */}
      {branches.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950/90 backdrop-blur-md p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="mx-auto max-w-4xl flex flex-wrap items-center justify-center sm:justify-between gap-4">
            <div className="text-sm font-bold text-white">
              Total across all branches:
            </div>
            <div className="flex items-center gap-3 text-slate-400 text-sm font-bold bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
              <span className="text-blue-400"><span className="text-lg">{totalBranches}</span> branches</span>
              <span className="text-slate-700">|</span>
              <span className="text-indigo-400"><span className="text-lg">{totalRooms}</span> rooms</span>
              <span className="text-slate-700">|</span>
              <span className="text-emerald-400"><span className="text-lg">{totalBeds}</span> beds</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
