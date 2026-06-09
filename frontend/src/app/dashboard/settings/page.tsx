"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  LogOut, 
  Key, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  ShieldAlert, 
  Loader2,
  User,
  Palette
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export default function SettingsPage() {
  const { user, session, isPro, signOut } = useAuth();
  const router = useRouter();
  const { activeWorkspace } = useWorkspace();
  const { theme, setTheme } = useTheme();
  
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);



  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setDisplayName(user.user_metadata.full_name);
    }
  }, [user]);

  const fetchApiKeys = useCallback(async (signal?: AbortSignal, activeRef?: { active: boolean }) => {
    if (!session) return;
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const params = new URLSearchParams();
      if (activeWorkspace) {
        params.set("workspace_id", activeWorkspace.id);
      }

      const res = await fetch(`${API}/api/api-keys?${params.toString()}`, {
        signal,
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (!activeRef || activeRef.active) {
          setApiKeys(Array.isArray(data) ? data : []);
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return;
      }
      console.error("Error fetching API keys:", e);
    }
  }, [session, activeWorkspace]);

  useEffect(() => {
    const activeRef = { active: true };
    const controller = new AbortController();

    fetchApiKeys(controller.signal, activeRef);

    return () => {
      activeRef.active = false;
      controller.abort();
    };
  }, [fetchApiKeys]);

  async function handleSaveProfile() {
    if (!displayName.trim()) {
      toast.error("Display name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName.trim() },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Profile updated successfully.");
      }
    } catch {
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateApiKey() {
    if (!session || !newKeyName.trim()) return;
    setLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/api-keys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newKeyName,
          workspace_id: activeWorkspace ? activeWorkspace.id : null,
        }),
      });

      if (!res.ok) throw new Error("Failed to create API key");

      const data = await res.json();
      setGeneratedKey(data.raw_key);
      setNewKeyName("");
      fetchApiKeys();
      toast.success("API key created successfully.");
    } catch (e) {
      toast.error("Failed to create API key.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function revokeApiKey(id: string) {
    if (!session) return;
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      await fetch(`${API}/api/api-keys/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      fetchApiKeys();
      toast.success("API key revoked.");
    } catch (e) {
      toast.error("Failed to revoke API key.");
      console.error(e);
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  async function handleDeleteAccount() {
    if (!session) return;
    setDeleting(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/account`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });
      
      if (res.ok || res.status === 204) {
        toast.success("Account deleted successfully.");
        await signOut();
        router.push("/");
      } else {
        toast.error("Failed to delete account.");
      }
    } catch {
      toast.error("Failed to delete account. Please try again.");
    } finally {
      setDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  }



  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] text-slate-800 dark:text-slate-100 pb-20">
      
      {/* Premium Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-amber-600/10 bg-white/80 dark:bg-[#080c14]/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <h1 className="text-base font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              System Settings
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-8 py-8">
        
        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Main Configurations (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            


            {/* Developer API Keys */}
            <Card className="p-6 bg-white dark:bg-[#0c0c0f]/80 border border-slate-200 dark:border-amber-600/10 rounded-xl shadow-md dark:shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-amber-500" />
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500">
                      Developer Credentials
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Integrate Anuvaad directly with CLI routines, scripts, or continuous deployment pipelines.
                    </p>
                  </div>
                </div>
              </div>

              {generatedKey && (
                <div className="mb-6 p-4 border border-amber-500/30 bg-amber-500/5 rounded-lg shadow-inner">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                        Capture API Key
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        For system protection, this bearer secret is displayed once. Retain this credentials packet in a secure secrets manager.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <code className="text-xs bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-amber-600/20 px-3 py-2 rounded flex-1 font-mono break-all text-amber-600 dark:text-amber-200">
                          {generatedKey}
                        </code>
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={handleCopy} 
                          className="shrink-0 h-9 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700/50"
                        >
                          {copied ? <Check className="h-4 w-4 text-emerald-500 animate-scale" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="mt-3 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 h-8" 
                        onClick={() => setGeneratedKey("")}
                      >
                        I have archived this secret safely
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row items-end gap-3 mb-6">
                <div className="flex-1 w-full">
                  <label htmlFor="settings-key-name" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Key Name / Scope
                  </label>
                  <Input 
                    id="settings-key-name"
                    placeholder="e.g. CI Deployment, Local Dev Client" 
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="mt-1.5 text-sm bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-amber-600/10 focus:border-amber-500/40 focus:ring-0 focus:ring-offset-0 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" 
                  />
                </div>
                <Button 
                  size="sm" 
                  onClick={handleCreateApiKey} 
                  disabled={loading || !newKeyName.trim()} 
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 hover:text-slate-950 h-10 px-5 font-bold uppercase tracking-wider text-xs gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)] shrink-0 w-full md:w-auto"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Generate Key
                </Button>
              </div>

              <div className="border border-slate-200 dark:border-amber-600/10 rounded-lg overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-[#0c0c0f] border-b border-slate-200 dark:border-amber-600/10">
                      <tr>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Scope Prefix</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Created At</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-amber-600/10 text-slate-700 dark:text-slate-300">
                      {apiKeys.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500 italic">
                            No credentials generated. Create a key scope to query the translation engine.
                          </td>
                        </tr>
                      ) : (
                        apiKeys.map(key => (
                          <tr key={key.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/20">
                            <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200">{key.name}</td>
                            <td className="px-4 py-3.5 font-mono text-[11px] text-amber-600 dark:text-amber-500/80">{key.key_prefix}</td>
                            <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                              {new Date(key.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => revokeApiKey(key.id)} 
                                className="h-7 px-2.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30 text-xs font-bold uppercase tracking-wider"
                              >
                                Revoke
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            {/* Profile Credentials */}
            <Card className="p-6 bg-white dark:bg-[#0c0c0f]/80 border border-slate-200 dark:border-amber-600/10 rounded-xl shadow-md dark:shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                <User className="h-5 w-5 text-amber-500" />
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500">
                    User Profile Settings
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Modify parameters relating to your personal display configuration.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="space-y-1">
                  <label htmlFor="settings-email" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Primary Email
                  </label>
                  <Input 
                    id="settings-email" 
                    value={user?.email || ""} 
                    disabled 
                    className="mt-1.5 text-sm bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-amber-600/5 text-slate-500 dark:text-slate-400 cursor-not-allowed select-all" 
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="settings-display-name" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Display Title / Name
                  </label>
                  <Input
                    id="settings-display-name"
                    placeholder="Your Full Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1.5 text-sm bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-amber-600/10 focus:border-amber-500/40 focus:ring-0 focus:ring-offset-0 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  />
                </div>
              </div>

              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 hover:text-slate-950 font-bold uppercase tracking-wider text-xs gap-1.5 h-9"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {saving ? "Saving Changes..." : "Update Profile"}
              </Button>
            </Card>

          </div>

          {/* RIGHT COLUMN: Settings Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-8">
            


            {/* Visual Identity Selection (Appearance) */}
            <Card className="p-6 bg-white dark:bg-[#0c0c0f]/80 border border-slate-200 dark:border-amber-600/10 rounded-xl shadow-md dark:shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <Palette className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500">
                    Dashboard Skin
                  </h3>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Choose a visual mode to align your translation dashboard appearance.
              </p>
              <div className="relative">
                <select
                  value={theme || "system"}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-amber-600/10 rounded-lg text-xs font-medium py-2.5 px-3 focus:outline-none focus:border-amber-500/40 focus:ring-0 text-slate-800 dark:text-slate-200 cursor-pointer appearance-none"
                >
                  <option value="system" className="bg-[#0c0c0f] text-slate-200">System Adaptive</option>
                  <option value="light" className="bg-white text-slate-800 dark:bg-[#0c0c0f] dark:text-slate-200">High Contrast Light</option>
                  <option value="dark" className="bg-[#0c0c0f] text-slate-200">Cinematic Dark Void</option>
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-450 dark:text-slate-400 text-xs">▼</span>
              </div>
            </Card>

            {/* Subscription status */}
            <Card className="p-6 bg-white dark:bg-[#0c0c0f]/80 border border-slate-200 dark:border-amber-600/10 rounded-xl shadow-md dark:shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Active License
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {isPro ? "Pro Subscription Pack · Unlimited weight runs" : "Developer Sandbox Tier · 10 runs/day"}
                  </p>
                </div>
                <Badge className={cn("text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 shrink-0 ml-3", isPro ? "bg-amber-500 text-slate-950" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300")}>
                  {isPro ? "✦ Pro Level" : "Sandbox"}
                </Badge>
              </div>
            </Card>

            {/* Danger zone / Account Actions */}
            <Card className="border border-red-200 dark:border-red-950/20 p-6 bg-red-50/50 dark:bg-red-950/5 rounded-xl shadow-md dark:shadow-lg relative overflow-hidden">
              <h3 className="text-xs font-bold uppercase tracking-widest text-red-600 dark:text-red-500 mb-4">
                Danger Zone Operations
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">Revoke Session</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Sign out of active account on this client.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1.5 text-[10px] uppercase font-bold tracking-wider h-8 border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 bg-white hover:bg-slate-50 dark:bg-slate-950/50 dark:hover:bg-slate-950" 
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-3 w-3" /> Exit
                  </Button>
                </div>
                
                <Separator className="bg-red-200 dark:bg-red-500/10" />
                
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-red-600 dark:text-red-400">Purge Data & Account</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Irreversibly delete profile records and vector weight structures.</p>
                  </div>
                  
                  <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DialogTrigger
                      render={
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="gap-1.5 text-[10px] uppercase font-bold tracking-wider h-8 bg-red-100 border border-red-300 text-red-600 hover:bg-red-200 dark:bg-red-950/20 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                        />
                      }
                    >
                      <Trash2 className="h-3 w-3" /> Purge
                    </DialogTrigger>
                    <DialogContent className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-amber-600/10 text-slate-900 dark:text-slate-100 rounded-lg">
                      <DialogHeader>
                        <DialogTitle className="text-base font-bold uppercase tracking-wider text-red-500 dark:text-red-400">
                          Confirm Total Account Purge
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-2">
                          This operation permanently destroys all developer profiles, generated client credentials, database vectors, and active settings files. This transaction is non-reversible.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
                        <Button 
                          variant="outline" 
                          className="border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
                          onClick={() => setIsDeleteDialogOpen(false)} 
                          disabled={deleting}
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="destructive" 
                          className="bg-red-600 hover:bg-red-700 text-white font-bold"
                          onClick={handleDeleteAccount} 
                          disabled={deleting}
                        >
                          {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Purge Everything
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </ Dialog>
                </div>
              </div>
            </Card>



          </div>

        </div>

      </div>

    </div>
  );
}
