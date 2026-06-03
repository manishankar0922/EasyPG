'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Bed, Home, UserCheck, Activity, Plus } from 'lucide-react';
import Link from 'next/link';

interface Room {
  id: string;
  roomNumber: string;
  roomType: string;
  totalCapacity: number;
  occupiedCapacity: number;
  rentAmount: number;
  genderType: string;
  status: string;
  branch: { name: string };
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRooms() {
      try {
        const { data } = await api.get('/rooms');
        if (data.success) {
          setRooms(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch rooms', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRooms();
  }, []);

  if (loading) return <div>Loading rooms...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Rooms</h1>
        <Link 
          href="/rooms/create" 
          className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add Room</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rooms.map((room) => (
          <div key={room.id} className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {room.branch.name}
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
                  <IndianRupeeIcon className="mr-2 h-4 w-4" />
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
    </div>
  );
}

import { cn } from '@/lib/utils';

function IndianRupeeIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3h12" />
      <path d="M6 8h12" />
      <path d="m6 13 8.5 8" />
      <path d="M6 13h3" />
      <path d="M9 13c6.667 0 6.667-10 0-10" />
    </svg>
  );
}
