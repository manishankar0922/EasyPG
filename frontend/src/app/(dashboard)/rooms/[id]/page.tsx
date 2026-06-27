'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { 
  Bed, 
  Building, 
  Users, 
  IndianRupee, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowLeft, 
  Loader2,
  User,
  Phone,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Room {
  id: string;
  roomNumber: string;
  roomType: string;
  totalCapacity: number;
  occupiedCapacity: number;
  rentAmount: string;
  genderType: string;
  status: 'ACTIVE' | 'BLOCKED';
  branch: {
    id: string;
    name: string;
    address: string;
  };
  admissions: Array<{
    id: string;
    tenant: {
      id: string;
      name: string;
      phone: string;
    };
    checkinDate: string;
  }>;
}

export default function RoomDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchRoom = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/rooms/${roomId}`);
      if (data.success) {
        setRoom(data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch room details');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  const toggleStatus = async () => {
    if (!room) return;
    const newStatus = room.status === 'ACTIVE' ? 'block' : 'activate';
    
    setUpdating(true);
    try {
      await api.patch(`/rooms/${roomId}/${newStatus}`);
      fetchRoom();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update room status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  if (error || !room) return (
    <div className="text-center py-12">
      <p className="text-red-500">{error || 'Room not found'}</p>
      <Link href="/rooms" className="text-blue-600 hover:underline mt-4 inline-block">Back to Rooms</Link>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Room {room.roomNumber}</h1>
            <p className="text-sm text-slate-500 font-medium">{room.branch.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={toggleStatus}
            disabled={updating}
            className={cn(
              "flex items-center space-x-2 rounded-xl px-4 py-2 text-sm font-bold transition-all",
              room.status === 'ACTIVE' 
                ? "bg-rose-50 text-rose-600 hover:bg-rose-100" 
                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            )}
          >
            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : room.status === 'ACTIVE' ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            <span>{room.status === 'ACTIVE' ? 'Block Room' : 'Activate Room'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Room Info Cards */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Configuration</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-slate-600">
                  <Bed className="mr-3 h-5 w-5 text-slate-400" />
                  <span className="text-sm font-medium">Type</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{room.roomType.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-slate-600">
                  <IndianRupee className="mr-3 h-5 w-5 text-slate-400" />
                  <span className="text-sm font-medium">Monthly Rent</span>
                </div>
                <span className="text-sm font-bold text-slate-900">₹{Number(room.rentAmount).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-slate-600">
                  <Users className="mr-3 h-5 w-5 text-slate-400" />
                  <span className="text-sm font-medium">Allocation</span>
                </div>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest",
                  room.genderType === 'BOYS' ? "bg-blue-50 text-blue-600" : 
                  room.genderType === 'GIRLS' ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600"
                )}>
                  {room.genderType}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Occupancy Status</h2>
            <div className="relative pt-2">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className="text-3xl font-black text-slate-900">{room.occupiedCapacity}</span>
                  <span className="text-lg font-bold text-slate-400 ml-1">/ {room.totalCapacity}</span>
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase">Beds Occupied</span>
              </div>
              <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    (room.occupiedCapacity / room.totalCapacity) > 0.8 ? "bg-rose-500" : "bg-blue-600"
                  )}
                  style={{ width: `${(room.occupiedCapacity / room.totalCapacity) * 100}%` }}
                />
              </div>
              <p className="mt-4 text-xs text-slate-400 font-medium">
                {room.totalCapacity - room.occupiedCapacity} beds currently available for admission.
              </p>
            </div>
          </div>
        </div>

        {/* Occupants List */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm h-full">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center">
                <Users className="mr-2 h-4 w-4 text-blue-600" />
                Current Occupants
              </h2>
              <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase">
                Live Data
              </span>
            </div>
            
            <div className="divide-y divide-slate-100">
              {room.admissions.length > 0 ? (
                room.admissions.map((adm) => (
                  <div key={adm.id} className="group flex items-center justify-between p-6 hover:bg-slate-50 transition">
                    <div className="flex items-center space-x-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{adm.tenant.name}</h3>
                        <div className="flex items-center text-xs text-slate-500 mt-0.5 font-medium">
                          <Phone className="h-3 w-3 mr-1" />
                          {adm.tenant.phone}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center space-x-6">
                      <div className="hidden sm:block">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Resident Since</p>
                        <p className="text-sm font-bold text-slate-700">{new Date(adm.checkinDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <Link 
                        href={`/tenants/${adm.tenant.id}`}
                        className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                      >
                        <ArrowRight className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-4">
                    <Users className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Room is Vacant</h3>
                  <p className="text-sm text-slate-500 mt-1">No active admissions for this room.</p>
                  <Link 
                    href="/tenants" 
                    className="mt-6 inline-flex items-center space-x-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
                  >
                    <span>Admit a Tenant</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
