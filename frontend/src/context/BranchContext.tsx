'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import api from '@/lib/api';

export interface Branch {
  id: string;
  name: string;
  address?: string;
  roomCount?: number;
  totalCapacity?: number;
  occupiedCapacity?: number;
}

interface BranchContextType {
  activeBranchId: string;
  activeBranch: Branch | null;
  branches: Branch[];
  switchBranch: (branchId: string) => void;
  loading: boolean;
  error: string | null;
}

const BranchContext = createContext<BranchContextType>({
  activeBranchId: '',
  activeBranch: null,
  branches: [],
  switchBranch: () => {},
  loading: true,
  error: null
});

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const [activeBranchId, setActiveBranchId] = useState<string>('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const role = user.role?.toLowerCase();

    if (role === 'warden') {
      const bId = user.branchId as string;
      setActiveBranchId(bId);
      // Fetch specifically this branch or just set basic info
      api.get(`/branches/${bId}`).then(res => {
        if (res.data.success) {
          setActiveBranch(res.data.data);
          setBranches([res.data.data]);
        }
      }).finally(() => setLoading(false));
      return;
    }

    if (role === 'owner') {
      api.get('/branches').then(res => {
        if (res.data.success) {
          const fetchedBranches = res.data.data;
          setBranches(fetchedBranches);

          const saved = localStorage.getItem('easypg_branch');
          const defaultBranch = fetchedBranches.find((b: Branch) => b.id === saved) || fetchedBranches[0];

          if (defaultBranch) {
            setActiveBranchId(defaultBranch.id);
            setActiveBranch(defaultBranch);
            if (!saved) localStorage.setItem('easypg_branch', defaultBranch.id);
          }
        }
      }).catch(err => {
        console.error('Failed to fetch branches', err);
        setError(err.message || 'Failed to fetch branches. Network Error.');
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const switchBranch = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (branch) {
      setActiveBranchId(branchId);
      setActiveBranch(branch);
      localStorage.setItem('easypg_branch', branchId);
      // Force reload to fetch fresh data for the new branch if needed
      // window.location.reload(); // Optional depending on how reactive the components are
    }
  };

  return (
    <BranchContext.Provider value={{ activeBranchId, activeBranch, branches, switchBranch, loading, error }}>
      {children}
    </BranchContext.Provider>
  );
}

export const useBranch = () => useContext(BranchContext);
