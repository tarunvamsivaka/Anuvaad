import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TypographyProse } from "@/design/primitives/TypographyProse";
import { ChevronDown, ChevronUp, Copy, Check, Pencil } from "lucide-react";
import { EnglishEditor } from "./EnglishEditor";
import { TranslationBlock } from "../../_types";

interface BlockCardProps {
  block: TranslationBlock;
  index: number;
  onEditBlock?: (newEnglish: string) => void;
}

export function BlockCard({ block, index, onEditBlock }: BlockCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(block.code_snippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyText = () => {
    navigator.clipboard.writeText(block.english_translation);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div
      className="animate-block-in"
      style={{ "--delay": `${Math.min(index * 0.05, 0.4)}s` } as React.CSSProperties}
    >
      <Card className="mb-4 overflow-hidden dashboard-card transition-all duration-200 hover:border-amber-500/30">
        <div className="flex items-center justify-between border-b border-border-subtle bg-transparent px-4 py-2.5">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold">
            Block {index + 1}
          </Badge>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label={collapsed ? "Expand code block" : "Collapse code block"} className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {!collapsed && (
          <div className="flex flex-col animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="relative border-b border-border/40 bg-surface-card p-4 group">
              <pre className="font-mono text-xs md:text-sm text-gray-300 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                <code>{block.code_snippet}</code>
              </pre>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={copyCode} 
                className="absolute right-3 top-3 h-7 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 text-white hover:bg-white/20 border-0 shadow-sm"
              >
                {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copiedCode ? "Copied" : "Copy code"}
              </Button>
            </div>
            <div className="relative p-4 md:p-5 bg-transparent group">
              {isEditing ? (
                <EnglishEditor
                  initialText={block.english_translation}
                  onSave={(newText) => {
                    onEditBlock?.(newText);
                    setIsEditing(false);
                  }}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <>
                  <TypographyProse size="sm" className="pr-24 whitespace-pre-wrap text-foreground/90">
                    {block.english_translation}
                  </TypographyProse>
                  <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditing(true)} 
                      className="h-7 gap-1 bg-background shadow-sm hover:bg-muted"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={copyText} 
                      className="h-7 gap-1.5 bg-background shadow-sm"
                    >
                      {copiedText ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      {copiedText ? "Copied" : "Copy text"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
