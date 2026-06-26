import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, FileCode, Check, Loader2 } from "lucide-react";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface RepositorySelectorProps {
  repositoryName: string;
  setRepositoryName: (name: string) => void;
  filePath: string;
  setFilePath: (path: string) => void;
}

export function RepositorySelector({
  repositoryName,
  setRepositoryName,
  filePath,
  setFilePath,
}: RepositorySelectorProps) {
  const [localRepo, setLocalRepo] = useState(repositoryName);
  const [localPath, setLocalPath] = useState(filePath);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const { session } = useAuth();
  
  const fetcher = (url: string) => 
    fetch(url, {
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    }).then(res => {
      if (res.status === 404) return null; // Not connected
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    });

  const { data: repos, error, isLoading } = useSWR(
    open && session?.access_token ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/github/repos` : null,
    fetcher
  );

  const handleSave = () => {
    setRepositoryName(localRepo);
    setFilePath(localPath);
    setOpen(false);
  };
  
  const handleConnect = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/oauth/github/login`);
      const data = await res.json();
      window.location.href = data.auth_url;
    } catch (e) {
      console.error(e);
    }
  };

  const filteredRepos = repos?.filter((r: any) => 
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 shrink-0 border-slate-200/50 dark:border-white/5 bg-white/60 dark:bg-surface-charcoal/60 backdrop-blur-md">
          <Github className="h-4 w-4" />
          {repositoryName ? (
            <span className="max-w-[120px] truncate">{repositoryName}</span>
          ) : (
            <span>Repo Context</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Repository Intelligence</h4>
            <p className="text-xs text-muted-foreground">
              Provide context for translation using your GitHub repositories.
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : repos === null || error ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Connect your GitHub account to select from your repositories automatically.</p>
              <Button onClick={handleConnect} className="w-full" size="sm">
                <Github className="mr-2 h-4 w-4" /> Connect GitHub
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-popover px-2 text-muted-foreground">Or type manually</span>
                </div>
              </div>
              <div className="space-y-1">
                <Input
                  placeholder="owner/repo"
                  className="h-8"
                  value={localRepo}
                  onChange={(e) => setLocalRepo(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Repository</label>
                <div className="flex flex-col gap-2">
                  <Input 
                    placeholder="Search repositories..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8"
                  />
                  <div className="max-h-[150px] overflow-y-auto border rounded-md divide-y">
                    {filteredRepos?.map((repo: any) => (
                      <button
                        key={repo.full_name}
                        onClick={() => setLocalRepo(repo.full_name)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 text-sm hover:bg-muted flex items-center justify-between",
                          localRepo === repo.full_name && "bg-muted"
                        )}
                      >
                        <span className="truncate">{repo.full_name}</span>
                        {localRepo === repo.full_name && <Check className="h-4 w-4" />}
                      </button>
                    ))}
                    {filteredRepos?.length === 0 && (
                      <div className="p-2 text-xs text-muted-foreground text-center">No repositories found.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-1">
            <label htmlFor="file" className="text-xs font-medium">File Path (Optional)</label>
            <div className="relative">
              <FileCode className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="file"
                placeholder="src/main.ts"
                className="pl-9 h-9"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
              />
            </div>
          </div>
          
          <Button className="w-full" size="sm" onClick={handleSave}>
            Apply Context
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
