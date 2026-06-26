'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export interface Workspace {
  id: string;
  name: string;
  owner_email: string;
  created_at: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  refreshWorkspaces: () => Promise<void>;
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshWorkspaces = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) {
        setLoading(false);
        return;
      }

      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API}/api/workspaces`, {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silently fail — workspace list defaults to empty on network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // M-5: Removed requestAnimationFrame() wrapper — rAF is for paint callbacks,
    // not async data fetching. Direct call loads workspace data one frame sooner.
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const value = useMemo(() => ({
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    refreshWorkspaces,
    loading
  }), [workspaces, activeWorkspace, refreshWorkspaces, loading]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
