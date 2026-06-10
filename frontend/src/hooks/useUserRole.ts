import { useAuthStore } from '@/store/auth-store';

export function useUserRole() {
  const user = useAuthStore((state) => state.user);
  
  // Normalize roles to match clerk-like metadata if needed,
  // or just return our native roles
  const role = user?.role;
  
  const isAdmin = role === 'SUPER_ADMIN';
  const isOwner = role === 'OWNER';
  const isWarden = role === 'WARDEN';
  
  return {
    role,
    isAdmin,
    isOwner,
    isWarden,
    // Provide a normalized string for simpler checks
    normalizedRole: isAdmin ? 'admin' : isOwner ? 'owner' : isWarden ? 'warden' : 'staff'
  };
}
