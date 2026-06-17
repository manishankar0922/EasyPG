'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { create } from 'zustand';
import api from '@/lib/api';
import { Loader2, Plus, Trash2, Building, Layers, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

// Zustand store for wizard state (no page reloads)
interface FloorConfig {
  floorNumber: number;
  roomCount: number;
  bedsPerRoom: number;
}

interface BranchConfig {
  name: string;
  address: string;
  floors: FloorConfig[];
}

interface SetupState {
  step: number;
  orgName: string;
  branches: BranchConfig[];
  setField: (field: string, value: any) => void;
  nextStep: () => void;
  prevStep: () => void;
  addBranch: () => void;
  updateBranch: (index: number, field: string, value: any) => void;
  addFloor: (branchIndex: number) => void;
  updateFloor: (branchIndex: number, floorIndex: number, field: keyof FloorConfig, value: number) => void;
  removeFloor: (branchIndex: number, floorIndex: number) => void;
}

const useSetupStore = create<SetupState>((set) => ({
  step: 1,
  orgName: '',
  branches: [{ name: '', address: '', floors: [{ floorNumber: 1, roomCount: 5, bedsPerRoom: 3 }] }],
  setField: (field, value) => set({ [field]: value }),
  nextStep: () => set((state) => ({ step: state.step + 1 })),
  prevStep: () => set((state) => ({ step: Math.max(1, state.step - 1) })),
  addBranch: () => set((state) => ({
    branches: [...state.branches, { name: '', address: '', floors: [{ floorNumber: 1, roomCount: 5, bedsPerRoom: 3 }] }]
  })),
  updateBranch: (index, field, value) => set((state) => {
    const newBranches = [...state.branches];
    newBranches[index] = { ...newBranches[index], [field]: value };
    return { branches: newBranches };
  }),
  addFloor: (branchIndex) => set((state) => {
    const newBranches = [...state.branches];
    const currentFloors = newBranches[branchIndex].floors;
    const nextFloorNumber = currentFloors.length > 0 ? Math.max(...currentFloors.map(f => f.floorNumber)) + 1 : 1;
    newBranches[branchIndex].floors.push({ floorNumber: nextFloorNumber, roomCount: 5, bedsPerRoom: 3 });
    return { branches: newBranches };
  }),
  updateFloor: (branchIndex, floorIndex, field, value) => set((state) => {
    const newBranches = [...state.branches];
    newBranches[branchIndex].floors[floorIndex] = { ...newBranches[branchIndex].floors[floorIndex], [field]: value };
    return { branches: newBranches };
  }),
  removeFloor: (branchIndex, floorIndex) => set((state) => {
    const newBranches = [...state.branches];
    newBranches[branchIndex].floors.splice(floorIndex, 1);
    return { branches: newBranches };
  })
}));

export default function SetupWizardPage() {
  const router = useRouter();
  const { step, orgName, branches, setField, nextStep, prevStep, addBranch, updateBranch, addFloor, updateFloor, removeFloor } = useSetupStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/organizations/setup-wizard', { branches });
      if (res.data.success) {
        router.push('/dashboard');
      } else {
        throw new Error(res.data.error || 'Failed to complete setup');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred during setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 min-h-screen pb-24">
      {/* Progress Bar */}
      <div className="mb-8 flex items-center justify-between">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors", 
              step >= i ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
            )}>
              {i}
            </div>
            {i < 3 && <div className={cn("w-12 sm:w-24 h-1 mx-2 transition-colors", step > i ? "bg-blue-600" : "bg-slate-200")} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 min-h-[400px]">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm border border-rose-100">
            {error}
          </div>
        )}

        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Welcome to U9PGs!</h1>
              <p className="text-slate-500 mt-1">Let's set up your organisation infrastructure.</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Organisation / Business Name</label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input 
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition"
                    placeholder="e.g. Urbun9 Hostels"
                    value={orgName}
                    onChange={(e) => setField('orgName', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button onClick={nextStep} className="w-full h-12 text-lg font-bold mt-8" disabled={!orgName}>
              Continue
            </Button>
          </div>
        )}

        {/* STEP 2: Branches & Floors */}
        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Configure Branches</h1>
              <p className="text-slate-500 mt-1">Add your hostel buildings and layout their floors.</p>
            </div>

            <div className="space-y-8">
              {branches.map((branch, bIdx) => (
                <div key={bIdx} className="p-5 rounded-2xl border-2 border-slate-100 bg-slate-50/50 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Branch Name</label>
                    <input 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                      placeholder="e.g. North Campus Hostel"
                      value={branch.name}
                      onChange={(e) => updateBranch(bIdx, 'name', e.target.value)}
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-700 flex items-center"><Layers className="h-4 w-4 mr-2" /> Floors Configuration</h3>
                      <Button variant="outline" size="sm" onClick={() => addFloor(bIdx)}><Plus className="h-4 w-4 mr-1"/> Add Floor</Button>
                    </div>

                    <div className="space-y-4">
                      {branch.floors.map((floor, fIdx) => (
                        <div key={fIdx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex-1 w-full">
                              <label className="text-xs font-bold text-slate-400 uppercase">Floor No.</label>
                              <input type="number" className="w-full mt-1 h-12 px-4 border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-900" value={floor.floorNumber} onChange={(e) => updateFloor(bIdx, fIdx, 'floorNumber', Number(e.target.value))} />
                            </div>
                            <div className="flex-1 w-full">
                              <label className="text-xs font-bold text-slate-400 uppercase">Rooms on Floor</label>
                              <input type="number" className="w-full mt-1 h-12 px-4 border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-900" value={floor.roomCount} onChange={(e) => updateFloor(bIdx, fIdx, 'roomCount', Number(e.target.value))} />
                            </div>
                            {branch.floors.length > 1 && (
                              <button onClick={() => removeFloor(bIdx, fIdx)} className="h-12 w-12 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-xl mt-5 shrink-0 self-end border border-transparent hover:border-rose-100 transition-colors">
                                <Trash2 className="h-5 w-5" />
                              </button>
                            )}
                          </div>

                          {/* Quick-Tap Share Chips */}
                          <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Sharing Type</label>
                            <div className="flex flex-wrap gap-2">
                              {[2, 3, 4, 6].map(share => (
                                <button
                                  key={share}
                                  onClick={() => updateFloor(bIdx, fIdx, 'bedsPerRoom', share)}
                                  className={cn(
                                    "h-12 px-5 rounded-full border-2 text-sm font-bold transition-all active:scale-95",
                                    floor.bedsPerRoom === share 
                                      ? "bg-blue-600 text-white border-blue-600" 
                                      : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                                  )}
                                >
                                  {share}-Share
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              
              <Button variant="secondary" onClick={addBranch} className="w-full border-dashed border-2">
                <Plus className="h-4 w-4 mr-2" /> Add Another Branch
              </Button>
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={prevStep} className="flex-1 h-12">Back</Button>
              <Button onClick={nextStep} className="flex-[2] h-12 font-bold" disabled={!branches[0].name}>Review Configuration</Button>
            </div>
          </div>
        )}

        {/* STEP 3: Review */}
        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Review & Confirm</h1>
              <p className="text-slate-500 mt-1">One tap to automatically generate your entire hostel structure.</p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase">Total Branches</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{branches.length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase">Total Floors</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">
                    {branches.reduce((acc, b) => acc + b.floors.length, 0)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase">Total Rooms</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">
                    {branches.reduce((acc, b) => acc + b.floors.reduce((fAcc, f) => fAcc + f.roomCount, 0), 0)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase">Total Beds</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">
                    {branches.reduce((acc, b) => acc + b.floors.reduce((fAcc, f) => fAcc + (f.roomCount * f.bedsPerRoom), 0), 0)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-blue-600 text-center font-medium mt-4">
                Rooms will automatically be named 1-01, 1-02, 2-01, etc.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={prevStep} className="flex-1 h-12" disabled={loading}>Back</Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-[2] h-12 font-bold bg-emerald-600 hover:bg-emerald-700">
                {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Infrastructure...</> : 'Create Infrastructure'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
