"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, Building, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WorkspaceMember {
  user_email: string;
  role: string;
  created_at: string;
}

export default function TeamPage() {
  const { session } = useAuth();
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchMembers = useCallback(async (signal?: AbortSignal, activeRef?: { active: boolean }) => {
    if (!activeWorkspace || !session) return;
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/workspaces/${activeWorkspace.id}/members`, {
        signal,
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (!activeRef || activeRef.active) {
          setMembers(data);
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return;
      }
      console.error(e);
    }
  }, [activeWorkspace, session]);

  useEffect(() => {
    const activeRef = { active: true };
    const controller = new AbortController();

    fetchMembers(controller.signal, activeRef);

    return () => {
      activeRef.active = false;
      controller.abort();
    };
  }, [fetchMembers]);

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/workspaces`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newWorkspaceName })
      });
      if (res.ok) {
        setNewWorkspaceName("");
        await refreshWorkspaces();
      } else {
        const err = await res.json();
        setError(err.detail || "Failed to create workspace");
      }
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!activeWorkspace || !session) return;
    setLoading(true);
    setError("");
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/workspaces/${activeWorkspace.id}/invite`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: inviteEmail, role: "member" })
      });
      if (res.ok) {
        setInviteEmail("");
        fetchMembers();
      } else {
        const err = await res.json();
        setError(err.detail || "Failed to invite user");
      }
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] text-slate-800 dark:text-slate-100 pb-20">
      <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-amber-600/10 bg-white/80 dark:bg-[#080c14]/80 backdrop-blur-md">
        <div className="flex h-16 items-center px-8 max-w-4xl mx-auto">
          <h1 className="text-base font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Team Workspaces Hub
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-8 py-8 space-y-8">
        <div>
          <h2 className="text-xl font-extrabold uppercase tracking-tight text-slate-800 dark:text-slate-200">Team Clusters</h2>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Collaborate with your team, share translation history logs, and manage unified developer keys.
          </p>
        </div>

        {!activeWorkspace ? (
          <Card className="p-8 border border-dashed border-slate-200 dark:border-amber-600/10 bg-white dark:bg-amber-500/5 rounded-xl shadow-md dark:shadow-lg">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-amber-600/15 flex items-center justify-center">
                <Building className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Personal Sandbox Workspace</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md leading-relaxed">
                  Translations and scope keys created here are locked to your profile. Provision a team workspace below to share vectors.
                </p>
              </div>
              
              <form onSubmit={handleCreateWorkspace} className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-6">
                <Input 
                  placeholder="Team Name (e.g., Acme Devs)" 
                  value={newWorkspaceName} 
                  onChange={e => setNewWorkspaceName(e.target.value)}
                  required 
                  className="flex-1 text-xs uppercase tracking-wider font-semibold bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-amber-600/10 focus:border-amber-500/40 focus:ring-0 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 h-10"
                />
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 hover:text-slate-950 font-bold uppercase tracking-wider text-xs gap-1.5 h-10 shadow-[0_0_12px_rgba(245,158,11,0.2)] shrink-0"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deploy Team"}
                </Button>
              </form>
              {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
            </div>
          </Card>
        ) : (
          <div className="space-y-8">
            <Card className="p-6 bg-white dark:bg-[#0c0c0f]/80 border border-slate-200 dark:border-amber-600/10 rounded-xl shadow-md dark:shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-4 border-b border-slate-200 dark:border-amber-600/10 pb-4 mb-6">
                <div className="h-10 w-10 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-base">
                  {activeWorkspace.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">{activeWorkspace.name}</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Active Team Core</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-500" /> Active Operators ({members.length})
                </h3>
                
                <div className="rounded-lg border border-slate-200 dark:border-amber-600/10 divide-y divide-slate-200 dark:divide-amber-600/10 overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
                  {members.map(m => (
                    <div key={m.user_email} className="flex items-center justify-between p-3.5 px-5 hover:bg-slate-100/50 dark:hover:bg-slate-900/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-500">
                          {m.user_email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{m.user_email}</p>
                        </div>
                      </div>
                      <Badge className="text-[9px] uppercase tracking-wider font-extrabold bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-amber-600/5 text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded">
                        {m.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white dark:bg-[#0c0c0f]/80 border border-slate-200 dark:border-amber-600/10 rounded-xl shadow-md dark:shadow-lg relative overflow-hidden">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2.5 mb-4">
                <UserPlus className="h-4 w-4" /> Invite Workspace Operator
              </h3>
              <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 items-end max-w-lg">
                <div className="flex-1 w-full space-y-2">
                  <label htmlFor="invite-email-team" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Operator Email Address</label>
                  <Input 
                    id="invite-email-team"
                    type="email"
                    placeholder="operator@company.com" 
                    value={inviteEmail} 
                    onChange={e => setInviteEmail(e.target.value)}
                    required 
                    className="h-10 text-xs bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-amber-600/10 focus:border-amber-500/40 focus:ring-0 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 hover:text-slate-950 font-bold uppercase tracking-wider text-xs gap-1.5 h-10 w-full sm:w-auto shadow-[0_0_12px_rgba(245,158,11,0.2)] shrink-0"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite Operator"}
                </Button>
              </form>
              {error && <p className="text-xs text-red-400 font-medium mt-2">{error}</p>}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
