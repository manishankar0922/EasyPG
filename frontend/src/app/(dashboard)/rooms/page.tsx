'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Users, IndianRupee, LayoutGrid, List, Map } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import RoomHeatmap from '@/components/RoomHeatmap';
import RoomDirectory from '@/components/RoomDirectory';

interface Room {
  id: string;
  roomNumber: string;
  roomType: string;
  totalCapacity: number;
  occupiedCapacity: number;
  rentAmount: number;
  genderType: string;
  status: string;
  branch: { name: string, id?: string };
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'heatmap' | 'directory'>('heatmap'); // Default to heatmap!
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [roomsRes, branchesRes] = await Promise.all([
          api.get('/rooms'),
          api.get('/branches')
        ]);
        if (roomsRes.data.success) {
          setRooms(roomsRes.data.data);
        }
        if (branchesRes.data.success && branchesRes.data.data.length > 0) {
          setBranches(branchesRes.data.data);
          setSelectedBranchId(branchesRes.data.data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch rooms', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="h-12 w-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rooms & Capacity</h1>
          {branches.length > 0 && view !== 'list' && (
            <select 
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="mt-2 h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold bg-white outline-none focus:border-blue-500"
            >
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>
        
        <div className="flex items-center space-x-3 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            <button 
              onClick={() => setView('heatmap')}
              className={cn("px-4 py-2 h-10 text-sm font-bold rounded-lg flex items-center transition-all", view === 'heatmap' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              <Map className="h-4 w-4 mr-2" />
              Heatmap
            </button>
            <button 
              onClick={() => setView('directory')}
              className={cn("px-4 py-2 h-10 text-sm font-bold rounded-lg flex items-center transition-all", view === 'directory' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Directory
            </button>
            <button 
              onClick={() => setView('list')}
              className={cn("px-4 py-2 h-10 text-sm font-bold rounded-lg flex items-center transition-all", view === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              <List className="h-4 w-4 mr-2" />
              All
            </button>
          </div>

          <Link 
            href="/rooms/create" 
            className="flex items-center shrink-0 space-x-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 transition h-12"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Room</span>
          </Link>
        </div>
      </div>

      <div className="animate-in fade-in duration-300">
        {view === 'heatmap' && selectedBranchId && (
          <RoomHeatmap branchId={selectedBranchId} />
        )}

        {view === 'directory' && selectedBranchId && (
          <RoomDirectory branchId={selectedBranchId} />
        )}

        {view === 'list' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rooms.map((room) => (
              <div key={room.id} className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {room.branch?.name || 'Unknown'}
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">Room {room.roomNumber}</h3>
                    <p className="text-sm text-slate-500">{room.roomType.replace('_', ' ')}</p>
                  </div>
                  <div className={cn(
                    "rounded-lg px-2 py-1 text-xs font-bold uppercase",
                    room.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {room.status}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-slate-500">
                      <Users className="mr-2 h-4 w-4" />
                      Capacity
                    </div>
                    <span className="font-semibold text-slate-900">{room.occupiedCapacity} / {room.totalCapacity}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-slate-500">
                      <IndianRupee className="mr-2 h-4 w-4" />
                      Rent
                    </div>
                    <span className="font-semibold text-slate-900">₹{Number(room.rentAmount).toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between">
                  <button className="text-sm font-medium text-blue-600 hover:text-blue-700">Edit Details</button>
                  <button className="text-sm font-medium text-slate-600 hover:text-slate-900">View History</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
