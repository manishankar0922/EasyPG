'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Wand2, Bed, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

interface AutoAssignResult {
  bedId: string;
  roomId: string;
  roomName: string;
  floorNumber: number;
}

export default function TenantCheckInForm({ branchId }: { branchId: string }) {
  const [autoAssign, setAutoAssign] = useState(true);
  const [loading, setLoading] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignedBed, setAssignedBed] = useState<AutoAssignResult | null>(null);

  // State for manual selection
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [selectedBed, setSelectedBed] = useState<any | null>(null);

  // Fetch rooms when switching to manual mode
  useEffect(() => {
    if (!autoAssign && rooms.length === 0) {
      api.get(`/branches/${branchId}/rooms`).then(res => {
        if (res.data.success) setRooms(res.data.data);
      }).catch(err => console.error("Failed to load rooms", err));
    }
  }, [branchId, autoAssign, rooms.length]);

  const floors = Array.from(new Set(rooms.map(r => r.floor))).sort((a, b) => a - b);
  const roomsInFloor = rooms.filter(r => r.floor === selectedFloor);

  const handleFloorSelect = (floor: number) => {
    setSelectedFloor(floor);
    setSelectedRoom(null);
    setSelectedBed(null);
  };

  const handleRoomSelect = (room: any) => {
    if (room.occupiedCapacity >= room.totalCapacity) return; // Ignore full rooms
    setSelectedRoom(room);
    setSelectedBed(null);
  };

  const handleBedSelect = (bed: any) => {
    if (bed.isOccupied) return;
    setSelectedBed(bed);
  };

  const handleAutoAssign = async () => {
    setLoading(true);
    setAssignError('');
    setAssignedBed(null);
    try {
      const res = await api.post('/tenants/auto-assign', { branchId });
      if (res.data.success) {
        setAssignedBed(res.data.data);
      }
    } catch (error: any) {
      setAssignError(error.response?.data?.error || 'Failed to auto-assign bed');
      setAutoAssign(false); // Fallback to manual mode if no beds exist
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
      <h2 className="text-2xl font-black text-slate-900 mb-6">Assign Bed</h2>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-slate-900 flex items-center">
            <Wand2 className="h-4 w-4 mr-2 text-blue-600" />
            Auto-Assign Bed
          </h4>
          <p className="text-xs text-slate-500 mt-1">Automatically picks the lowest floor & room.</p>
        </div>
        <Switch 
          checked={autoAssign} 
          onCheckedChange={(checked) => {
            setAutoAssign(checked);
            if (checked && !assignedBed) handleAutoAssign();
          }} 
        />
      </div>

      {assignError && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start">
          <AlertTriangle className="h-5 w-5 text-rose-600 mr-3 mt-0.5 shrink-0" />
          <p className="text-sm font-bold text-rose-700">{assignError}</p>
        </div>
      )}

      {autoAssign ? (
        <div className="space-y-4">
          {!assignedBed && !loading && !assignError && (
            <Button 
              onClick={handleAutoAssign} 
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold"
            >
              Generate Bed Assignment
            </Button>
          )}

          {loading && (
            <div className="h-24 bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          )}

          {assignedBed && !loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center animate-in zoom-in duration-300">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Locked Assignment</p>
              <div className="flex justify-center items-center space-x-4">
                <div>
                  <p className="text-xs text-slate-500">Floor</p>
                  <p className="text-2xl font-black text-slate-900">{assignedBed.floorNumber}</p>
                </div>
                <div className="w-px h-8 bg-blue-200"></div>
                <div>
                  <p className="text-xs text-slate-500">Room</p>
                  <p className="text-2xl font-black text-slate-900">{assignedBed.roomName}</p>
                </div>
                <div className="w-px h-8 bg-blue-200"></div>
                <div>
                  <p className="text-xs text-slate-500">Bed ID</p>
                  <p className="text-2xl font-black text-blue-700">{assignedBed.bedId.slice(0, 4).toUpperCase()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          {/* STEP A: Floor Selection */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">1. Select Floor</label>
            <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide snap-x">
              {floors.map(floor => (
                <button
                  key={floor}
                  onClick={() => handleFloorSelect(floor)}
                  className={`h-12 px-6 rounded-full border-2 text-sm font-bold shrink-0 snap-start transition-all active:scale-95 ${
                    selectedFloor === floor 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  Floor {floor}
                </button>
              ))}
              {floors.length === 0 && <p className="text-sm text-slate-500 italic">Loading floors...</p>}
            </div>
          </div>

          {/* STEP B: Room Selection */}
          {selectedFloor !== null && (
            <div className="animate-in fade-in duration-200">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">2. Select Room</label>
              <div className="grid grid-cols-3 gap-3">
                {roomsInFloor.map(room => {
                  const isFull = room.occupiedCapacity >= room.totalCapacity;
                  const isSelected = selectedRoom?.id === room.id;

                  return (
                    <button
                      key={room.id}
                      onClick={() => handleRoomSelect(room)}
                      disabled={isFull}
                      className={`h-14 w-full rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                        isFull 
                          ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                          : isSelected 
                            ? 'bg-blue-600 border-blue-600 text-white active:scale-95 shadow-md'
                            : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400 active:scale-95'
                      }`}
                    >
                      <span className="font-black text-lg">{room.roomNumber.split('-')[1] || room.roomNumber}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        {room.occupiedCapacity}/{room.totalCapacity} beds
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP C: Bed Selection */}
          {selectedRoom !== null && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">3. Select Bed</label>
              <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide snap-x">
                {selectedRoom.beds?.map((bed: any, idx: number) => {
                  const isTaken = bed.isOccupied;
                  const isSelected = selectedBed?.id === bed.id;
                  const bedLabel = `Bed ${String.fromCharCode(65 + idx)}`; // Bed A, Bed B...

                  return (
                    <button
                      key={bed.id}
                      onClick={() => handleBedSelect(bed)}
                      disabled={isTaken}
                      className={`h-12 px-6 rounded-full border-2 text-sm font-bold shrink-0 snap-start flex items-center transition-all ${
                        isTaken 
                          ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                          : isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md active:scale-95'
                            : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400 active:scale-95'
                      }`}
                    >
                      {bedLabel}
                      {isTaken && <span className="ml-2 text-[10px] uppercase tracking-wider bg-slate-200 px-2 py-0.5 rounded text-slate-500">Taken</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Final Action */}
          <Button 
            disabled={!selectedBed}
            className="w-full h-14 mt-4 bg-emerald-600 hover:bg-emerald-700 text-lg font-bold disabled:opacity-50 disabled:bg-slate-300"
          >
            Save Tenant Assignment
          </Button>
        </div>
      )}
    </div>
  );
}
