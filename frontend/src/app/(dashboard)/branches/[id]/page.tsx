'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { 
  Building2, 
  MapPin, 
  Bed, 
  Users, 
  Plus, 
  ArrowLeft, 
  Loader2,
  Settings,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Room {
  id: string;
  roomNumber: string;
  roomType: string | null;
  totalCapacity: number;
  occupiedCapacity: number;
  rentAmount: string;
  status: string;
}

interface Branch {
  id: string;
  name: string;
  address: string;
  totalCapacity: number;
  occupiedCapacity: number;
  occupancyPercentage: number;
  rooms: Room[];
}

export default function BranchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params.id as string;

  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBranch = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/branches/${branchId}`);
      if (data.success) {
        setBranch(data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch branch details');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchBranch();
  }, [fetchBranch]);

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  if (error || !branch) return (
    <div className="text-center py-12">
      <p className="text-red-500">{error || 'Branch not found'}</p>
      <Link href="/branches" className="text-blue-600 hover:underline mt-4 inline-block">Back to Branches</Link>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="group flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition">
            <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{branch.name}</h1>
            <div className="flex items-center text-sm text-slate-500 mt-1">
              <MapPin className="h-3.5 w-3.5 mr-1 text-slate-400" />
              {branch.address}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            <Settings className="h-4 w-4" />
            <span>Manage Branch</span>
          </button>
          <Link 
            href="/rooms/create"
            className="flex items-center space-x-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add Room</span>
          </Link>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Rooms</p>
          <p className="text-3xl font-black text-slate-900">{branch.rooms.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Beds</p>
          <p className="text-3xl font-black text-slate-900">{branch.totalCapacity}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Occupied</p>
          <p className="text-3xl font-black text-blue-600">{branch.occupiedCapacity}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Occupancy</p>
          <div className="flex items-center space-x-2">
            <p className="text-3xl font-black text-slate-900">{branch.occupancyPercentage.toFixed(1)}%</p>
            <div className="h-2 w-16 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${branch.occupancyPercentage}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Rooms List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center">
          <Bed className="mr-2 h-5 w-5 text-blue-600" />
          Room Inventory
        </h2>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {branch.rooms.map((room) => (
            <Link 
              key={room.id}
              href={`/rooms/${room.id}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Bed className="h-5 w-5" />
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                  room.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                  {room.status}
                </span>
              </div>
              
              <h3 className="text-xl font-black text-slate-900">Room {room.roomNumber}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{room.roomType ? room.roomType.replace(/_/g, ' ') : '—'}</p>
              
              <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-bold text-slate-700">{room.occupiedCapacity} / {room.totalCapacity} Beds</span>
                </div>
                <div className="flex items-center text-blue-600 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Details</span>
                  <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </Link>
          ))}
          
          {branch.rooms.length === 0 && (
            <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-4">
                <Bed className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No rooms found</h3>
              <p className="text-sm text-slate-500 mt-1">Start by adding rooms to this branch.</p>
              <Link 
                href="/rooms/create"
                className="mt-6 inline-flex items-center space-x-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Add First Room</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
