"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LogOut, Key, Plus, Copy, Check, Trash2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function SettingsPage() {
  const { user, session, isPro, signOut } = useAuth();
  const router = useRouter();
  const { activeWorkspace } = useWorkspace();
  
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      fetchApiKeys();
    }
  }, [session, activeWorkspace]);

  async function fetchApiKeys() {
    if (!session) return;
    try {
      const params = new URLSearchParams();
      if (activeWorkspace) {
        params.set("workspace_id", activeWorkspace.id);
      }

      const res = await fetch(`/api/api-keys?${params.toString()}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setApiKeys(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error fetching API keys:", e);
    }
  }

  async function handleCreateApiKey() {
    if (!session || !newKeyName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/api-keys', {
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function revokeApiKey(id: string) {
    if (!session) return;
    try {
      await fetch(`/api/api-keys/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      fetchApiKeys();
    } catch (e) {
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
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input value={user?.email || ""} disabled className="mt-1 text-sm bg-muted/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Display Name</label>
              <Input placeholder="Your name" defaultValue={user?.user_metadata?.full_name || ""} className="mt-1 text-sm" />
            </div>
          </div>
          <Button size="sm" className="mt-4 bg-amber-600 hover:bg-amber-700 text-xs">Save Changes</Button>
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
                    Please copy this key and save it somewhere secure. For security reasons, you won't be able to see it again.
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
              <label className="text-xs font-medium text-muted-foreground">Key Name</label>
              <Input 
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
          <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sign Out</p>
              <p className="text-xs text-muted-foreground">Sign out of your account on this device</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2 text-xs bg-background" onClick={handleSignOut}>
              <LogOut className="h-3 w-3" /> Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
