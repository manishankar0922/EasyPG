'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Loader2, Users, Receipt, FilterX } from 'lucide-react';
import api from '@/lib/api';

interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  totalCapacity: number;
  occupiedCapacity: number;
  rentAmount: number;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'MAINTENANCE';
  hasAC: boolean;
}

export default function RoomDirectory({ branchId }: { branchId: string }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  useEffect(() => {
    fetchRooms();
  }, [branchId, selectedFloor, selectedStatus]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedFloor !== null) params.append('floor', selectedFloor.toString());
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get(`/branches/${branchId}/rooms?${params.toString()}`);
      if (res.data.success) {
        setRooms(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch rooms', error);
    } finally {
      setLoading(false);
    }
  };

  const floors = Array.from(new Set(rooms.map(r => r.floor))).sort((a, b) => a - b);

  return (
    <div className="w-full space-y-4">
      {/* Horizontally scrollable filter chips */}
      <div className="flex overflow-x-auto pb-2 gap-2 snap-x scrollbar-hide">
        <Button 
          variant={selectedFloor === null && selectedStatus === null ? "default" : "outline"} 
          className="rounded-full h-12 px-4 text-base min-w-[80px] snap-start shrink-0"
          onClick={() => { setSelectedFloor(null); setSelectedStatus(null); }}
        >
          All
        </Button>
        
        {/* Floor Filters */}
        {floors.map(f => (
          <Button 
            key={`floor-${f}`}
            variant={selectedFloor === f ? "default" : "outline"} 
            className="rounded-full h-12 px-4 text-base shrink-0 snap-start"
            onClick={() => { setSelectedFloor(f); setSelectedStatus(null); }}
          >
            Floor {f}
          </Button>
        ))}

        {/* Status Filters */}
        {['VACANT', 'PARTIAL', 'FULL'].map(status => (
          <Button 
            key={status}
            variant={selectedStatus === status ? "default" : "outline"} 
            className="rounded-full h-12 px-4 text-base shrink-0 snap-start capitalize"
            onClick={() => { setSelectedStatus(status); setSelectedFloor(null); }}
          >
            {status.toLowerCase()}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <FilterX className="h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No rooms found</h3>
          <p className="text-slate-500 mb-4">Try adjusting your filters.</p>
          <Button variant="outline" onClick={() => { setSelectedFloor(null); setSelectedStatus(null); }}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {rooms.map(room => {
            const isFull = room.occupiedCapacity === room.totalCapacity;
            const isVacant = room.occupiedCapacity === 0;

            return (
              <div 
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm active:scale-95 transition-transform cursor-pointer"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{room.roomNumber}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Floor {room.floor}</p>
                  </div>
                  <Badge variant="outline" className={
                    isFull ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    isVacant ? "bg-rose-50 text-rose-700 border-rose-200" :
                    "bg-amber-50 text-amber-700 border-amber-200"
                  }>
                    {isFull ? 'Full' : isVacant ? 'Vacant' : 'Partial'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between mt-4 text-sm font-medium">
                  <div className="flex items-center text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{room.occupiedCapacity} / {room.totalCapacity} Beds</span>
                  </div>
                  {room.hasAC && (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700">AC</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile-friendly Bottom Drawer for Room Details */}
      <Sheet open={!!selectedRoom} onOpenChange={(open) => !open && setSelectedRoom(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl h-[60vh] w-full max-w-md mx-auto bg-white">
          <SheetHeader className="text-left">
            <SheetTitle className="text-2xl font-black flex items-center justify-between">
              Room {selectedRoom?.roomNumber}
              {selectedRoom?.hasAC && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">AC Room</Badge>}
            </SheetTitle>
            <SheetDescription>
              Floor {selectedRoom?.floor} • Total Beds: {selectedRoom?.totalCapacity}
            </SheetDescription>
          </SheetHeader>
          
          {selectedRoom && (
            <div className="mt-8 space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-white p-3 rounded-xl shadow-sm mr-4">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Occupancy</p>
                    <p className="text-2xl font-black text-slate-900">{selectedRoom.occupiedCapacity} <span className="text-lg text-slate-400">/ {selectedRoom.totalCapacity}</span></p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-white p-3 rounded-xl shadow-sm mr-4">
                    <Receipt className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Base Rent (per bed)</p>
                    <p className="text-2xl font-black text-slate-900">₹{Number(selectedRoom.rentAmount)}</p>
                  </div>
                </div>
              </div>

              <Button className="w-full h-14 text-lg font-bold rounded-xl mt-4">
                View Analytics
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
