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
import { LogOut, Key, Plus, Copy, Check, Trash2, ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { toast } from "sonner";
import { useTheme } from "next-themes";

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
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center px-6">
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>
      <div className="mx-auto max-w-3xl p-6 space-y-6">
        
        {/* Profile */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold">Profile</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="settings-email" className="text-xs font-medium text-muted-foreground">Email</label>
              <Input id="settings-email" value={user?.email || ""} disabled className="mt-1 text-sm bg-muted/50" />
            </div>
            <div>
              <label htmlFor="settings-display-name" className="text-xs font-medium text-muted-foreground">Display Name</label>
              <Input
                id="settings-display-name"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
          </div>
          <Button
            size="sm"
            className="mt-4 bg-amber-600 hover:bg-amber-700 text-xs gap-1.5"
            onClick={handleSaveProfile}
            disabled={saving}
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </Card>

        {/* Appearance */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold">Appearance</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Customize the look and feel of your Anuvaad dashboard.</p>
          <div className="max-w-xs mt-2">
            <select
              value={theme || "system"}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full rounded-md border border-border/60 bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="system" className="bg-background text-foreground">System</option>
              <option value="light" className="bg-background text-foreground">Light</option>
              <option value="dark" className="bg-background text-foreground">Dark</option>
            </select>
          </div>
        </Card>

        {/* Developer / API Keys */}
        <Card className="p-6 border-amber-600/20">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-5 w-5 text-amber-600" />
            <h2 className="text-sm font-semibold">Developer API Keys</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-6">
            Generate Bearer tokens to access the Anuvaad API programmatically from your CI/CD pipelines or internal tools.
          </p>

          {generatedKey && (
            <div className="mb-6 p-4 border border-amber-600/30 bg-amber-600/5 rounded-lg">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-foreground">Save your new API key</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Please copy this key and save it somewhere secure. For security reasons, you won&apos;t be able to see it again.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <code className="text-xs bg-background border border-border px-3 py-1.5 rounded flex-1 font-mono break-all">
                      {generatedKey}
                    </code>
                    <Button size="sm" variant="secondary" onClick={handleCopy} className="shrink-0 h-8">
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button size="sm" variant="ghost" className="mt-3 text-xs h-7" onClick={() => setGeneratedKey("")}>
                    I have saved this key
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-end gap-3 mb-6">
            <div className="flex-1">
              <label htmlFor="settings-key-name" className="text-xs font-medium text-muted-foreground">Key Name</label>
              <Input 
                id="settings-key-name"
                placeholder="e.g. CI Pipeline, Backend Script" 
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="mt-1 text-sm" 
              />
            </div>
            <Button size="sm" onClick={handleCreateApiKey} disabled={loading || !newKeyName.trim()} className="bg-foreground text-background hover:bg-foreground/90 h-9">
              <Plus className="h-4 w-4 mr-1.5" /> Create Key
            </Button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Prefix</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Created</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {apiKeys.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No API keys generated yet.
                    </td>
                  </tr>
                ) : (
                  apiKeys.map(key => (
                    <tr key={key.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{key.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{key.key_prefix}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(key.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => revokeApiKey(key.id)} className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Subscription */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Subscription</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {isPro ? "Pro Plan · Unlimited translations" : "Free Plan · 10 translations/day"}
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px]">{isPro ? "✦ Pro" : "Free"}</Badge>
          </div>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/20 p-6 bg-destructive/5">
          <h2 className="text-sm font-semibold text-destructive mb-4">Danger Zone</h2>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Sign Out</p>
              <p className="text-xs text-muted-foreground">Sign out of your account on this device</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2 text-xs bg-background" onClick={handleSignOut}>
              <LogOut className="h-3 w-3" /> Sign Out
            </Button>
          </div>
          
          <Separator className="my-4 bg-destructive/10" />
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-destructive">Delete Account</p>
              <p className="text-xs text-muted-foreground">Permanently remove your account and all data</p>
            </div>
            
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger render={<Button variant="destructive" size="sm" className="gap-2 text-xs" />}>
                  <Trash2 className="h-3 w-3" /> Delete
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you absolutely sure?</DialogTitle>
                  <DialogDescription>
                    This permanently deletes your account and all translations. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleting}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
                    {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete Account
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
          </div>
        </Card>
      </div>
    </div>
  );
}
