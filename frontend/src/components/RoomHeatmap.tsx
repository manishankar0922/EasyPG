'use client';

import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Bed, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface Tenant {
  id: string;
  name: string;
  vacateNotice?: any;
}

interface RoomHeatmapCell {
  roomId: string;
  roomName: string;
  totalBeds: number;
  occupiedBeds: number;
  status: 'FULL' | 'PARTIAL' | 'VACANT' | 'INACTIVE';
  hasAC: boolean;
  tenants: Tenant[];
}

interface FloorHeatmap {
  floor: number;
  rooms: RoomHeatmapCell[];
}

export default function RoomHeatmap({ branchId }: { branchId: string }) {
  const [floors, setFloors] = useState<FloorHeatmap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        const res = await api.get(`/branches/${branchId}/heatmap`);
        if (res.data.success) {
          setFloors(res.data.data);
        }
      } catch (error) {
        console.error('Failed to load heatmap', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHeatmap();
  }, [branchId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (floors.length === 0) {
    return (
      <div className="bg-slate-50 p-8 rounded-3xl border border-dashed border-slate-200 text-center">
        <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No rooms constructed yet.</p>
      </div>
    );
  }

  // Find max rooms on a single floor to ensure the grid aligns properly
  const maxRooms = Math.max(...floors.map(f => f.rooms.length));

  return (
    <div className="w-full bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm overflow-hidden">
      <div className="mb-6 flex flex-wrap gap-4 items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
        <div className="flex items-center"><div className="w-4 h-4 rounded-full bg-emerald-500 mr-2" /> Full</div>
        <div className="flex items-center"><div className="w-4 h-4 rounded-full bg-amber-500 mr-2" /> Partial</div>
        <div className="flex items-center"><div className="w-4 h-4 rounded-full bg-rose-500 mr-2" /> Vacant</div>
        <div className="flex items-center"><div className="w-4 h-4 rounded-full bg-slate-300 mr-2" /> Inactive</div>
      </div>

      <div className="w-full overflow-x-auto scrollbar-hide pb-4">
        <div className="min-w-max space-y-4">
          {floors.map((floor) => (
            <div key={floor.floor} className="flex items-center gap-4">
              {/* Floor Label */}
              <div className="w-16 shrink-0 text-right">
                <p className="text-sm font-black text-slate-400 uppercase">Flr {floor.floor}</p>
              </div>

              {/* Rooms Grid Row */}
              <div 
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${maxRooms}, minmax(48px, 1fr))` }}
              >
                {floor.rooms.map((room) => {
                  // tinted cell + dark ink: white-on-amber/emerald failed contrast,
                  // and the visible bed count carries status without relying on color
                  const cellStyle =
                    room.status === 'FULL' ? 'bg-emerald-100 text-emerald-900 ring-emerald-300'
                    : room.status === 'PARTIAL' ? 'bg-amber-100 text-amber-900 ring-amber-300'
                    : room.status === 'VACANT' ? 'bg-rose-100 text-rose-900 ring-rose-300'
                    : 'bg-slate-100 text-slate-400 ring-slate-200';

                  const pendingNotice = room.tenants?.find(t => t.vacateNotice);

                  return (
                    <Popover key={room.roomId}>
                      <PopoverTrigger asChild>
                        <button
                          aria-label={`Room ${room.roomName}: ${room.occupiedBeds}/${room.totalBeds} beds occupied`}
                          className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center leading-none shadow-sm ring-1 ring-inset transition-transform active:scale-90 ${cellStyle}`}
                        >
                          <span className="text-sm font-black">{room.roomName.split('-')[1]}</span>
                          <span className="mt-0.5 text-[10px] font-bold tabular-nums opacity-70">
                            {room.occupiedBeds}/{room.totalBeds}
                          </span>
                          {pendingNotice && (
                            <span 
                              className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 border-2 border-white"
                              title={`Vacating on ${new Date(pendingNotice.vacateNotice.vacateDate).toLocaleDateString()}`}
                            />
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-4 rounded-2xl" sideOffset={8}>
                        <div className="flex justify-between items-start mb-3 border-b pb-3">
                          <div>
                            <h4 className="font-black text-lg text-slate-900">Room {room.roomName}</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase">Floor {floor.floor} {room.hasAC ? '• AC' : ''}</p>
                          </div>
                          <div className={`px-2 py-1 rounded-md text-xs font-bold tabular-nums ring-1 ring-inset ${cellStyle}`}>
                            {room.occupiedBeds}/{room.totalBeds}
                          </div>
                        </div>

                        <div className="space-y-3">
                          {room.tenants && room.tenants.length > 0 ? (
                            room.tenants.map((t, idx) => (
                              <div key={t.id || idx} className="flex flex-col text-sm font-medium text-slate-700 bg-slate-50 p-2 rounded-lg">
                                <div className="flex items-center">
                                  <Bed className="w-4 h-4 mr-2 text-slate-400" />
                                  {t.name}
                                </div>
                                {t.vacateNotice && (
                                  <div className="text-xs text-orange-600 font-bold mt-1 ml-6">
                                    Vacating: {new Date(t.vacateNotice.vacateDate).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500 italic text-center py-2">No active tenants.</p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                })}
                
                {/* Empty filler cells if this floor has fewer rooms than the max */}
                {Array.from({ length: maxRooms - floor.rooms.length }).map((_, i) => (
                  <div key={`filler-${i}`} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-dashed border-slate-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
