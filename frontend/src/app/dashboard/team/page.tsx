"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, Building, Loader2 } from "lucide-react";

export default function TeamPage() {
  const { user, session } = useAuth();
  const { workspaces, activeWorkspace, setActiveWorkspace, refreshWorkspaces } = useWorkspace();
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (activeWorkspace && session) {
      fetchMembers();
    }
  }, [activeWorkspace, session]);

  async function fetchMembers() {
    if (!activeWorkspace || !session) return;
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/members`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) setMembers(await res.json());
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch('/api/workspaces', {
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
    } catch (e) {
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
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/invite`, {
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
    } catch (e) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Team Workspaces</h1>
        <p className="mt-2 text-muted-foreground">
          Collaborate with your team, share translation history, and manage unified billing.
        </p>
      </div>

      {!activeWorkspace ? (
        <Card className="p-8 border-dashed border-2 bg-muted/30">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Building className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium">You are in your Personal Workspace</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Translations and API keys created here are private to you. Switch to a team workspace in the sidebar, or create a new one below.
              </p>
            </div>
            
            <form onSubmit={handleCreateWorkspace} className="flex gap-2 w-full max-w-sm mt-4">
              <Input 
                placeholder="Company Name (e.g., Acme Corp)" 
                value={newWorkspaceName} 
                onChange={e => setNewWorkspaceName(e.target.value)}
                required 
              />
              <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Team"}
              </Button>
            </form>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-4 border-b border-border pb-4 mb-6">
              <div className="h-10 w-10 rounded-md bg-amber-500/20 flex items-center justify-center text-amber-700 font-bold text-lg">
                {activeWorkspace.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold">{activeWorkspace.name}</h2>
                <p className="text-xs text-muted-foreground">Team Workspace</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" /> Team Members ({members.length})
                </h3>
              </div>
              
              <div className="rounded-md border border-border">
                {members.map(m => (
                  <div key={m.user_email} className="flex items-center justify-between p-3 border-b border-border last:border-0 hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {m.user_email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.user_email}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-4">
              <UserPlus className="h-4 w-4" /> Invite Member
            </h3>
            <form onSubmit={handleInvite} className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">Email Address</label>
                <Input 
                  type="email"
                  placeholder="colleague@company.com" 
                  value={inviteEmail} 
                  onChange={e => setInviteEmail(e.target.value)}
                  required 
                />
              </div>
              <Button type="submit" disabled={loading} variant="secondary">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
              </Button>
            </form>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </Card>
        </div>
      )}
    </div>
  );
}
