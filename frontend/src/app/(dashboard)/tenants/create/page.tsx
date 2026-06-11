'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { User, Phone, School, CreditCard, Loader2, ArrowLeft, Bed, Calendar, Coins } from 'lucide-react';
import Link from 'next/link';
import MobileCameraCapture from '@/components/shared/MobileCameraCapture';
import { format } from 'date-fns';

interface Room {
  id: string;
  roomNumber: string;
  rentAmount: string;
  totalCapacity: number;
  occupiedCapacity: number;
  branch: {
    id: string;
    name: string;
  };
}

export default function CreateTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Available Rooms state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    parentPhone: '',
    collegeName: '',
    aadhaarLast4: '',
    photoUrl: '',
    aadhaarPhotoUrl: '',
    // Room Assignment Fields
    roomId: '',
    monthlyRent: '',
    depositAmount: '0',
    checkinDate: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    async function fetchAvailableRooms() {
      try {
        const { data } = await api.get('/rooms/availability');
        if (data.success) {
          setRooms(data.data);
        }
      } catch (err) {
        console.error('Failed to load rooms:', err);
      } finally {
        setLoadingRooms(false);
      }
    }
    fetchAvailableRooms();
  }, []);

  const handleRoomChange = (roomId: string) => {
    const selectedRoom = rooms.find(r => r.id === roomId);
    setFormData(prev => ({
      ...prev,
      roomId,
      monthlyRent: selectedRoom ? selectedRoom.rentAmount : ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.roomId) {
      setError('Please assign a room/bed.');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Create the Tenant
      const tenantPayload = {
        name: formData.name,
        phone: formData.phone,
        parentPhone: formData.parentPhone || null,
        collegeName: formData.collegeName || null,
        aadhaarLast4: formData.aadhaarLast4 || null,
        photoUrl: formData.photoUrl || null,
        aadhaarPhotoUrl: formData.aadhaarPhotoUrl || null
      };

      const tenantRes = await api.post('/tenants', tenantPayload);
      if (!tenantRes.data.success) {
        throw new Error(tenantRes.data.error || 'Failed to create tenant profile.');
      }

      const tenantId = tenantRes.data.data.id;

      // Step 2: Create Admission (Check-In)
      const admissionPayload = {
        tenantId,
        roomId: formData.roomId,
        checkinDate: formData.checkinDate,
        monthlyRent: Number(formData.monthlyRent),
        depositAmount: Number(formData.depositAmount)
      };

      const admissionRes = await api.post('/admissions/checkin', admissionPayload);
      if (!admissionRes.data.success) {
        throw new Error(admissionRes.data.error || 'Tenant created but room assignment failed.');
      }

      router.push('/tenants');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Onboarding failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center space-x-4">
        <Link href="/tenants" className="p-2 hover:bg-slate-100 rounded-full transition">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add & Onboard Tenant</h1>
          <p className="text-sm text-slate-500">Fast onboarding and room assignment</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Photos Capture */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-md font-bold text-slate-900 border-b pb-2">1. Capture Photos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MobileCameraCapture 
              label="Tenant Photo"
              value={formData.photoUrl}
              onUploadComplete={(url) => setFormData(prev => ({ ...prev, photoUrl: url }))}
            />
            <MobileCameraCapture 
              label="Aadhaar Card Photo"
              value={formData.aadhaarPhotoUrl}
              onUploadComplete={(url) => setFormData(prev => ({ ...prev, aadhaarPhotoUrl: url }))}
            />
          </div>
        </div>

        {/* Step 2: Profile details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <h2 className="text-md font-bold text-slate-900 border-b pb-2">2. Profile Details</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  required
                  placeholder="Enter 10 digit mobile number"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Parent/Guardian Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  placeholder="e.g. 9876543211"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">College / Company Name</label>
              <div className="relative">
                <School className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. IIT Delhi"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.collegeName}
                  onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Aadhaar Last 4 Digits</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. 1234"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.aadhaarLast4}
                  onChange={(e) => setFormData({ ...formData, aadhaarLast4: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Bed Assignment */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <h2 className="text-md font-bold text-slate-900 border-b pb-2">3. Bed Assignment</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Select Room</label>
              <div className="relative">
                <Bed className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <select
                  required
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.roomId}
                  onChange={(e) => handleRoomChange(e.target.value)}
                >
                  <option value="">-- Choose a Vacant Bed --</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.roomNumber} - {room.branch.name} ({room.totalCapacity - room.occupiedCapacity} left)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Monthly Rent Amount (₹)</label>
              <div className="relative">
                <Coins className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  required
                  placeholder="e.g. 8500"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.monthlyRent}
                  onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Deposit Paid (₹)</label>
              <div className="relative">
                <Coins className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.depositAmount}
                  onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Check-in Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  required
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                  value={formData.checkinDate}
                  onChange={(e) => setFormData({ ...formData, checkinDate: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}

        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition disabled:opacity-50 shadow-md shadow-blue-500/20"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Onboarding Tenant...</span>
              </div>
            ) : 'Save & Onboard'}
          </button>
        </div>
      </form>
    </div>
  );
}
