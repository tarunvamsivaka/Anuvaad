import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface EnglishEditorProps {
  initialText: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

export function EnglishEditor({ initialText, onSave, onCancel }: EnglishEditorProps) {
  const [editedText, setEditedText] = useState(initialText);

  useEffect(() => {
    setEditedText(initialText);
  }, [initialText]);

  return (
    <div className="flex flex-col gap-2 w-full animate-in fade-in duration-200">
      <textarea
        value={editedText}
        onChange={(e) => setEditedText(e.target.value)}
        className="w-full text-sm leading-relaxed p-2.5 border border-border/80 rounded-md bg-background focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none resize-y min-h-[80px] font-sans"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:bg-muted"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          variant="default"
          size="sm"
          className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1"
          onClick={() => onSave(editedText)}
        >
          <Check className="h-3 w-3" />
          Save
        </Button>
      </div>
    </div>
  );
}
