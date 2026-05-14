"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Mail, User, Shield, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/context/WorkspaceContext";
import { toast } from "sonner";

export default function WorkspacePage() {
  const { session } = useAuth();
  const { activeWorkspace, refreshWorkspaces, loading: workspaceLoading } = useWorkspace();
  
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [creating, setCreating] = useState(false);
  
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Fetch members when active workspace changes
  useEffect(() => {
    async function fetchMembers() {
      if (!session || !activeWorkspace) return;
      setLoadingMembers(true);
      try {
        const res = await fetch(`/api/workspaces/${activeWorkspace.id}/members`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMembers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch members", err);
      } finally {
        setLoadingMembers(false);
      }
    }
    fetchMembers();
  }, [session, activeWorkspace]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim() || !session) return;
    
    setCreating(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newWorkspaceName.trim() })
      });
      
      if (!res.ok) throw new Error("Failed to create workspace");
      
      toast.success("Workspace created successfully");
      setNewWorkspaceName("");
      await refreshWorkspaces();
    } catch (err: any) {
      toast.error(err.message || "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !session || !activeWorkspace) return;
    
    setInviting(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/invite`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: "member" })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to invite member");
      }
      
      toast.success(`Invited ${inviteEmail} to workspace`);
      setInviteEmail("");
      
      // Refresh members list
      const membersRes = await fetch(`/api/workspaces/${activeWorkspace.id}/members`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (membersRes.ok) {
        setMembers(await membersRes.json());
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  if (workspaceLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // NO WORKSPACE VIEW
  if (!activeWorkspace) {
    return (
      <div className="min-h-screen pb-20">
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
          <div className="flex h-14 items-center px-6">
            <h1 className="text-lg font-semibold">Workspace</h1>
          </div>
        </header>
        <div className="mx-auto max-w-2xl p-6 pt-12">
          <Card className="p-8 text-center border-dashed">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted border border-border shadow-sm mb-6">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-2">Create a Team Workspace</h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
              Collaborate with your team, share translation history, and manage API keys in a unified workspace.
            </p>
            <form onSubmit={handleCreateWorkspace} className="flex max-w-sm mx-auto items-center gap-3">
              <Input
                placeholder="Workspace Name (e.g. Acme Corp)"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="flex-1"
                required
              />
              <Button type="submit" disabled={creating} className="bg-amber-600 hover:bg-amber-700 text-white">
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Create
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // ACTIVE WORKSPACE VIEW
  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">{activeWorkspace.name}</h1>
            <Badge variant="secondary" className="text-[10px]">Team Workspace</Badge>
          </div>
        </div>
      </header>
      
      <div className="mx-auto max-w-5xl p-6 space-y-6">
        
        {/* Invite Member Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-amber-600" />
            <h2 className="text-sm font-semibold">Invite Team Member</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4 max-w-2xl">
            Invite colleagues to join <strong>{activeWorkspace.name}</strong>. They will have access to the shared translation history and API keys.
          </p>
          <form onSubmit={handleInviteMember} className="flex items-end gap-3 max-w-md">
            <div className="flex-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1 block">Email Address</label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>
            <Button type="submit" disabled={inviting} size="sm" className="h-9">
              {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
              Invite
            </Button>
          </form>
        </Card>

        {/* Members List */}
        <Card className="overflow-hidden border-border/60">
          <div className="bg-muted/30 px-6 py-4 border-b border-border/60 flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Workspace Members
            </h2>
            <Badge variant="outline" className="text-xs font-normal">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </Badge>
          </div>
          
          <div className="divide-y divide-border/60">
            {loadingMembers ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No members found.
              </div>
            ) : (
              members.map((member, idx) => {
                const isOwner = member.role === 'owner';
                const isAdmin = member.role === 'admin';
                const initial = member.user_email ? member.user_email.charAt(0).toUpperCase() : '?';
                
                return (
                  <div key={`${member.user_email}-${idx}`} className="flex items-center justify-between p-4 px-6 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 text-amber-700 dark:text-amber-500 font-semibold text-sm">
                        {initial}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{member.user_email}</p>
                        <p className="text-xs text-muted-foreground">Joined {new Date(member.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={isOwner ? "default" : isAdmin ? "secondary" : "outline"} 
                        className="text-[10px] capitalize"
                      >
                        {isOwner && <Shield className="h-3 w-3 mr-1" />}
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}
