"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LogOut, Trash2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center px-6">
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>
      <div className="mx-auto max-w-2xl p-6 space-y-6">
        {/* Profile */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold">Profile</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input value="user@example.com" disabled className="mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Display Name</label>
              <Input placeholder="Your name" className="mt-1 text-sm" />
            </div>
          </div>
          <Button size="sm" className="mt-4 bg-amber-600 hover:bg-amber-700 text-xs">Save Changes</Button>
        </Card>

        {/* Preferences */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold">Preferences</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Default Source Language</p>
                <p className="text-xs text-muted-foreground">Language pre-selected in translator</p>
              </div>
              <select className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                <option>Python</option><option>JavaScript</option><option>Java</option>
                <option>C++</option><option>TypeScript</option><option>Go</option><option>Rust</option>
              </select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-muted-foreground">Choose your preferred theme</p>
              </div>
              <select className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                <option>System</option><option>Light</option><option>Dark</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Subscription */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Subscription</h2>
              <p className="mt-1 text-xs text-muted-foreground">Free Plan · 10 translations/day</p>
            </div>
            <Badge variant="secondary" className="text-[10px]">Free</Badge>
          </div>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/20 p-6">
          <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sign Out</p>
              <p className="text-xs text-muted-foreground">Sign out of your account</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <LogOut className="h-3 w-3" /> Sign Out
            </Button>
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete Account</p>
              <p className="text-xs text-muted-foreground">Permanently delete your account and data</p>
            </div>
            <Button variant="destructive" size="sm" className="gap-2 text-xs">
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
