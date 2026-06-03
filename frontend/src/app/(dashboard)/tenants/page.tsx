'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  School, 
  MoreVertical,
  ChevronRight,
  ArrowLeftRight,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Tenant {
  id: string;
  name: string;
  phone: string;
  collegeName: string;
  status: string;
  admissions: any[];
}

interface Room {
  id: string;
  roomNumber: string;
  branch: { name: string };
  occupiedCapacity: number;
  totalCapacity: number;
  rentAmount: string;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Transfer State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [newRoomId, setNewRoomId] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/tenants?search=${search}`);
      if (data.success) {
        setTenants(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch tenants', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchTenants, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openTransferModal = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setNewRoomId('');
    setTransferError('');
    try {
      const { data } = await api.get('/rooms/availability');
      if (data.success) {
        setAvailableRooms(data.data);
        setShowTransferModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch available rooms', err);
    }
  };

  const handleTransfer = async () => {
    if (!selectedTenant || !newRoomId) return;
    const admissionId = selectedTenant.admissions[0]?.id;
    if (!admissionId) return;

    try {
      setTransferring(true);
      setTransferError('');
      const { data } = await api.post(`/admissions/transfer/${admissionId}`, {
        newRoomId,
        transferDate: new Date().toISOString()
      });
      if (data.success) {
        setShowTransferModal(false);
        fetchTenants();
      }
    } catch (err: any) {
      setTransferError(err.response?.data?.error || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
        <Link 
          href="/tenants/create" 
          className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add Tenant</span>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-6 py-4">Tenant Name</th>
              <th className="px-6 py-4">College / Organization</th>
              <th className="px-6 py-4">Current Room</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">{tenant.name}</p>
                    <p className="flex items-center text-xs text-slate-500">
                      <Phone className="mr-1 h-3 w-3" />
                      {tenant.phone}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center text-slate-600">
                    <School className="mr-2 h-4 w-4 text-slate-400" />
                    {tenant.collegeName || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {tenant.admissions?.[0]?.room 
                    ? `Room ${tenant.admissions[0].room.roomNumber} (${tenant.admissions[0].room.branch.name})`
                    : 'Unassigned'}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    tenant.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                  )}>
                    {tenant.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  {tenant.status === 'ACTIVE' && (
                    <button 
                      onClick={() => openTransferModal(tenant)}
                      className="inline-flex items-center p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Room Transfer"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                  )}
                  <Link 
                    href={`/tenants/${tenant.id}`}
                    className="inline-flex items-center p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="View Profile"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Room Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Room Transfer</h2>
                <p className="text-sm text-slate-500">Transferring {selectedTenant?.name}</p>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="rounded-full p-2 hover:bg-slate-100 transition">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Room Info */}
              <div className="rounded-xl bg-blue-50 p-4 border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Current Room</p>
                  <p className="text-lg font-bold text-blue-900">
                    Room {selectedTenant?.admissions?.[0]?.room?.roomNumber}
                  </p>
                  <p className="text-xs text-blue-700">
                    {selectedTenant?.admissions?.[0]?.room?.branch?.name}
                  </p>
                </div>
                <ArrowLeftRight className="h-8 w-8 text-blue-200" />
              </div>

              {/* Room Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Select New Room</label>
                <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {availableRooms
                    .filter(r => r.id !== selectedTenant?.admissions?.[0]?.roomId)
                    .map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setNewRoomId(room.id)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                        newRoomId === room.id 
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20" 
                          : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                      )}
                    >
                      <div>
                        <p className="font-bold text-slate-900">Room {room.roomNumber}</p>
                        <p className="text-xs text-slate-500">{room.branch.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">₹{Number(room.rentAmount).toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 uppercase">
                          {room.totalCapacity - room.occupiedCapacity} Beds left
                        </p>
                      </div>
                    </button>
                  ))}
                  {availableRooms.length === 0 && (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">No other rooms available</p>
                    </div>
                  )}
                </div>
              </div>

              {transferError && (
                <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertCircle className="h-4 w-4" />
                  <span>{transferError}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-6 flex space-x-3 bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                disabled={!newRoomId || transferring}
                onClick={handleTransfer}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 flex items-center justify-center space-x-2"
              >
                {transferring ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm Transfer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
