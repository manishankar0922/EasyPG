'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutGrid, List, Plus, Users, User, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export default function MobileRoomsPage() {
  const { user } = useAuthStore();
  const [floors, setFloors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View controls
  const [viewMode, setViewMode] = useState<'heatmap' | 'list'>('heatmap');
  const [activeFilter, setActiveFilter] = useState<string>('ALL'); // ALL, EMPTY, FULL, PARTIAL, FLOOR_1 etc.
  
  // Sheet state
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  useEffect(() => {
    async function fetchRooms() {
      if (!user?.branchId) return;
      try {
        setLoading(true);
        const res = await api.get(`/branches/${user.branchId}/heatmap`);
        if (res.data.success) {
          setFloors(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch rooms', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRooms();
  }, [user]);

  // Derived arrays
  const allRooms = floors.flatMap(f => f.rooms);
  
  // Dynamic filter chips based on available floors
  const floorChips = floors.map(f => ({ id: `FLOOR_${f.floor}`, label: `Floor ${f.floor}` }));
  const filterChips = [
    { id: 'ALL', label: 'All' },
    { id: 'EMPTY', label: 'Empty 🔴' },
    { id: 'FULL', label: 'Full 🟢' },
    { id: 'PARTIAL', label: 'Partial 🟡' },
    ...floorChips
  ];

  // Filtering Logic
  let filteredRooms = allRooms;
  if (activeFilter === 'EMPTY') filteredRooms = allRooms.filter(r => r.occupiedBeds === 0);
  if (activeFilter === 'FULL') filteredRooms = allRooms.filter(r => r.occupiedBeds === r.totalBeds && r.totalBeds > 0);
  if (activeFilter === 'PARTIAL') filteredRooms = allRooms.filter(r => r.occupiedBeds > 0 && r.occupiedBeds < r.totalBeds);
  if (activeFilter.startsWith('FLOOR_')) {
    const fNum = Number(activeFilter.split('_')[1]);
    filteredRooms = allRooms.filter(r => floors.find(f => f.floor === fNum)?.rooms.includes(r));
  }

  // Filtered Floors (for heatmap)
  const filteredFloors = floors.map(f => ({
    ...f,
    rooms: f.rooms.filter((r: any) => filteredRooms.includes(r))
  })).filter(f => f.rooms.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4 sticky top-0 z-10 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Rooms</h1>
          
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('heatmap')}
              className={cn("p-2 rounded-lg transition-colors", viewMode === 'heatmap' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn("p-2 rounded-lg transition-colors", viewMode === 'list' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {filterChips.map(chip => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id)}
              className={cn(
                "h-12 px-5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 border-2",
                activeFilter === chip.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20"
                  : "bg-white text-slate-600 border-slate-200 active:bg-slate-50"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="h-20 w-20 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🛏️</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No rooms found</h3>
            <p className="text-slate-500 font-medium">Try changing your filters.</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            {/* HEATMAP VIEW */}
            {viewMode === 'heatmap' && (
              <div className="space-y-8">
                {filteredFloors.map(floor => (
                  <div key={floor.floor}>
                    <h2 className="text-lg font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Floor {floor.floor}</h2>
                    <div className="grid grid-cols-4 gap-3">
                      {floor.rooms.map((room: any) => {
                        const isFull = room.status === 'FULL';
                        const isEmpty = room.status === 'VACANT';
                        const isPartial = room.status === 'PARTIAL';

                        return (
                          <button
                            key={room.roomId}
                            onClick={() => setSelectedRoom(room)}
                            className={cn(
                              "aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-transform active:scale-90 shadow-sm relative overflow-hidden",
                              isFull ? "bg-emerald-500 border-emerald-600 text-white" :
                              isPartial ? "bg-yellow-400 border-yellow-500 text-slate-900" :
                              "bg-rose-50 border-rose-300 text-rose-600"
                            )}
                          >
                            <span className="text-xl font-black tracking-tighter">{room.roomName}</span>
                            <span className={cn("text-[10px] font-bold mt-0.5 opacity-90", isFull ? "text-emerald-100" : isPartial ? "text-yellow-900" : "text-rose-400")}>
                              {room.occupiedBeds}/{room.totalBeds}
                            </span>
                            
                            {/* Visual indicator bar for partial */}
                            {isPartial && (
                              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-yellow-500/30">
                                <div 
                                  className="h-full bg-slate-900/40" 
                                  style={{ width: `${(room.occupiedBeds / room.totalBeds) * 100}%` }}
                                />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* LIST VIEW */}
            {viewMode === 'list' && (
              <div className="space-y-4">
                {filteredRooms.map(room => (
                  <button 
                    key={room.roomId}
                    onClick={() => setSelectedRoom(room)}
                    className="w-full text-left bg-white rounded-3xl p-5 shadow-sm border border-slate-100 active:scale-95 transition-transform"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-black text-slate-900">Room {room.roomName}</h3>
                        <p className="text-sm font-bold text-slate-400">Floor {room.roomName.split('-')[0] || 'Unknown'}</p>
                      </div>
                      
                      <div className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border-2",
                        room.status === 'FULL' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        room.status === 'PARTIAL' ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                        "bg-rose-50 text-rose-600 border-rose-200"
                      )}>
                        {room.occupiedBeds}/{room.totalBeds} Beds
                      </div>
                    </div>

                    {room.tenants?.length > 0 ? (
                      <div className="flex -space-x-3">
                        {room.tenants.map((t: any, i: number) => (
                          <div key={i} className="h-10 w-10 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center overflow-hidden">
                            {t.photoUrl ? (
                              <Image src={t.photoUrl} alt="T" width={40} height={40} className="object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-slate-500">{t.name.substring(0, 1)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-rose-500">Completely Empty</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Room Details Bottom Sheet */}
      <Sheet open={!!selectedRoom} onOpenChange={(open) => !open && setSelectedRoom(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe px-4 pt-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
          {selectedRoom && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-4xl font-black text-slate-900 mb-1">Room {selectedRoom.roomName}</h2>
                <div className="inline-flex items-center justify-center bg-slate-100 px-4 py-1.5 rounded-full text-sm font-bold text-slate-600">
                  {selectedRoom.totalBeds} beds · {selectedRoom.occupiedBeds} occupied · <span className="text-rose-500 ml-1">{selectedRoom.totalBeds - selectedRoom.occupiedBeds} empty</span>
                </div>
              </div>

              {/* Tenants List */}
              <div className="mb-6 space-y-3">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-1">Current Tenants</h3>
                
                {selectedRoom.tenants?.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-6 text-center border border-dashed border-slate-200">
                    <p className="text-slate-500 font-semibold mb-1">No one is staying here yet.</p>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
                    {selectedRoom.tenants?.map((tenant: any) => (
                      <Link 
                        key={tenant.id} 
                        href={`/tenants/${tenant.id}`}
                        className="flex items-center justify-between p-4 bg-white active:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-slate-100 overflow-hidden relative flex-shrink-0">
                            {tenant.photoUrl ? (
                              <Image src={tenant.photoUrl} alt={tenant.name} fill className="object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center font-bold text-slate-400">
                                {tenant.name.substring(0, 1)}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-base">{tenant.name}</p>
                            <p className="text-sm font-semibold text-slate-500">{tenant.bedName || 'Unassigned Bed'}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-slate-300" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button if vacant */}
              {(selectedRoom.totalBeds - selectedRoom.occupiedBeds) > 0 && (
                <Link
                  href={`/tenants/new?roomId=${selectedRoom.roomId}`}
                  className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-lg active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  <Plus className="h-6 w-6" strokeWidth={3} />
                  Assign Tenant
                </Link>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
