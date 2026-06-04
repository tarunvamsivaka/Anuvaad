"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Mail, Shield, Users, Crown, Building2, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/context/WorkspaceContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WorkspaceMember {
  user_email: string;
  role: string;
  created_at: string;
  workspace_id: string;
}

function MemberAvatar({ email, role }: { email: string; role: string }) {
  const letter = email ? email[0].toUpperCase() : "?";
  const colorMap: Record<string, string> = {
    owner: "from-amber-500 to-orange-500",
    admin: "from-violet-500 to-purple-500",
    member: "from-blue-500 to-indigo-500",
  };
  const gradient = colorMap[role] || colorMap.member;
  return (
    <div className={cn(
      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-md",
      gradient
    )}>
      {letter}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
    owner: {
      icon: <Crown className="h-2.5 w-2.5" />,
      cls: "bg-amber-500 text-slate-950 border-amber-600",
      label: "Owner",
    },
    admin: {
      icon: <Shield className="h-2.5 w-2.5" />,
      cls: "bg-violet-500/15 text-violet-400 border-violet-500/25",
      label: "Admin",
    },
    member: {
      icon: <Users className="h-2.5 w-2.5" />,
      cls: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      label: "Member",
    },
  };
  const config = map[role] || map.member;
  return (
    <Badge className={cn("flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-lg", config.cls)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

export default function WorkspacePage() {
  const { session } = useAuth();
  const { activeWorkspace, refreshWorkspaces, loading: workspaceLoading } = useWorkspace();

  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function fetchMembers() {
      if (!session || !activeWorkspace) return;
      setLoadingMembers(true);
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${API}/api/workspaces/${activeWorkspace.id}/members`, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (active) setMembers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      } finally {
        if (active) setLoadingMembers(false);
      }
    }
    fetchMembers();
    return () => { active = false; controller.abort(); };
  }, [session, activeWorkspace]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim() || !session) return;
    setCreating(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/workspaces`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create workspace");
      toast.success("Workspace created successfully");
      setNewWorkspaceName("");
      await refreshWorkspaces();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !session || !activeWorkspace) return;
    setInviting(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/workspaces/${activeWorkspace.id}/invite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: "member" }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to invite member");
      }
      toast.success(`Invited ${inviteEmail} to workspace`);
      setInviteEmail("");
      const membersRes = await fetch(`${API}/api/workspaces/${activeWorkspace.id}/members`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (membersRes.ok) setMembers(await membersRes.json());
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  if (workspaceLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // No workspace — creation UI
  if (!activeWorkspace) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] text-slate-800 dark:text-slate-100">
        <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-amber-500/8 bg-white/80 dark:bg-[#080c14]/90 backdrop-blur-md">
          <div className="flex h-14 items-center px-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-500" />
              <h1 className="text-sm font-bold text-slate-800 dark:text-slate-200">Workspace</h1>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[calc(100vh-56px)] p-6 md:p-12">
          <div className="w-full max-w-5xl bg-white dark:bg-[#0c0c0f]/80 border border-slate-200 dark:border-amber-600/10 rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
            
            {/* Left side: Create form and features */}
            <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center space-y-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Create your workspace</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-md">
                  Collaborate with your team, share translation history logs, manage role access control layers, and generate unified developer API credentials.
                </p>
              </div>

              <form onSubmit={handleCreateWorkspace} className="space-y-3.5 max-w-md">
                <div className="space-y-1.5">
                  <label htmlFor="creation-workspace-name" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Workspace Name</label>
                  <Input
                    id="creation-workspace-name"
                    placeholder="e.g. Acme Engineering, Delta Core"
                    value={newWorkspaceName}
                    onChange={e => setNewWorkspaceName(e.target.value)}
                    className="h-11 rounded-xl bg-white dark:bg-[#080c14]/50 border border-slate-200 dark:border-amber-600/10 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-amber-500/40"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={creating}
                  className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl gap-2 shadow-lg shadow-amber-500/25"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Deploy Workspace Core
                </Button>
              </form>

              <div className="border-t border-slate-100 dark:border-amber-600/10 pt-6">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-550 dark:text-slate-500 mb-4">Included Features</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: Users, label: "Team Access", desc: "Co-author translations" },
                    { icon: Sparkles, label: "Shared History", desc: "Unified query logs" },
                    { icon: Shield, label: "Role Controls", desc: "Fine-grained permissions" },
                  ].map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="flex flex-col gap-1 rounded-xl border border-slate-100 dark:border-amber-600/5 bg-slate-50/50 dark:bg-amber-500/3 p-3">
                      <Icon className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-none">{label}</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-550 leading-tight">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side: Large Showcase Banner */}
            <div className="md:col-span-5 bg-slate-50/50 dark:bg-slate-950/20 border-l border-slate-200 dark:border-amber-600/10 relative flex items-center justify-center p-6 sm:p-8 min-h-[300px] md:min-h-full">
              {/* Grid overlay for a tech style background */}
              <div
                className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-30"
                style={{
                  backgroundImage: `linear-gradient(rgba(245,158,11,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.1) 1px, transparent 1px)`,
                  backgroundSize: "24px 24px",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 to-transparent pointer-events-none" />

              {/* Showcase Container */}
              <div className="relative z-10 w-full max-w-[320px] md:max-w-none aspect-square md:aspect-auto md:h-full flex items-center justify-center">
                <div className="relative rounded-2xl border border-amber-500/15 bg-white dark:bg-[#0c0f1a] p-2 shadow-2xl dark:shadow-amber-500/5 overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:border-amber-500/30 group">
                  <img 
                    src="/team_working.png" 
                    alt="Team Collaboration Showcase" 
                    className="w-full h-full object-cover rounded-xl"
                  />
                  {/* Subtle dark layout gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // Active workspace view
  const memberCount = members.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c14]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-amber-500/8 bg-white/80 dark:bg-[#080c14]/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-amber-500" />
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-200">{activeWorkspace.name}</h1>
            <Badge className="text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2">
              Active
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-600">
              <Users className="h-3.5 w-3.5" />
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </div>
          </div>
        </div>
      </header>

      <div className="p-5 lg:p-6 max-w-4xl mx-auto space-y-5">


        {/* Invite form */}
        <Card className="dark:bg-[#0c0f1a] border border-slate-100 dark:border-amber-500/8 overflow-hidden">
          <div className="relative p-5">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/4 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/15">
                  <Mail className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Invite Team Member</h2>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-600 mb-5 ml-9">
                Invite colleagues to collaborate in <strong className="text-slate-600 dark:text-slate-400">{activeWorkspace.name}</strong>.
              </p>

              <form onSubmit={handleInviteMember} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label htmlFor="invite-email" className="sr-only">Email address</label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    required
                    className="h-10 rounded-xl bg-white dark:bg-white/4 border-slate-200 dark:border-amber-500/10 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-amber-500/40"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={inviting}
                  className="h-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl gap-2 px-5 shadow-md shadow-amber-500/15"
                >
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Send Invite
                </Button>
              </form>
            </div>
          </div>
        </Card>

        {/* Members list */}
        <Card className="dark:bg-[#0c0f1a] border border-slate-100 dark:border-amber-500/8 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-amber-500/8">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Members</h2>
            </div>
            <Badge className="text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-500 border-0 px-2">
              {memberCount} total
            </Badge>
          </div>

          <div className="divide-y divide-slate-50 dark:divide-amber-500/5">
            {loadingMembers ? (
              <div className="flex justify-center p-10">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Users className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm font-medium text-slate-400 dark:text-slate-600">No members yet</p>
                <p className="text-xs text-slate-300 dark:text-slate-700 mt-1">Invite someone above to get started.</p>
              </div>
            ) : (
              members.map((member, idx) => (
                <div
                  key={`${member.user_email}-${idx}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MemberAvatar email={member.user_email} role={member.role} />
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 font-mono">{member.user_email}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">
                        Joined {new Date(member.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <RoleBadge role={member.role} />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
