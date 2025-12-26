import { useState, useEffect } from "react";
import { Copy, Check, RefreshCw, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface HWIDDisplayProps {
  className?: string;
  onHWIDGenerated?: (hwid: string) => void;
}

const HWIDDisplay = ({ className, onHWIDGenerated }: HWIDDisplayProps) => {
  const [hwid, setHwid] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(true);

  const generateHWID = () => {
    setGenerating(true);
    // Simulate HWID generation
    setTimeout(() => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const segments = [];
      for (let i = 0; i < 4; i++) {
        let segment = "";
        for (let j = 0; j < 4; j++) {
          segment += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        segments.push(segment);
      }
      const generatedHwid = segments.join("-");
      setHwid(generatedHwid);
      setGenerating(false);
      if (onHWIDGenerated) {
        onHWIDGenerated(generatedHwid);
      }
    }, 1500);
  };

  useEffect(() => {
    generateHWID();
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hwid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "p-6 rounded-lg border border-primary/30 bg-card/50 neon-border",
      className
    )}>
      <div className="flex items-center gap-3 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <span className="font-display text-sm uppercase tracking-wider text-muted-foreground">
          Your Hardware ID
        </span>
      </div>
      
      <div className="relative">
        <div className={cn(
          "px-4 py-3 rounded-md bg-secondary/50 border border-border font-mono text-lg tracking-widest text-center",
          generating && "animate-pulse"
        )}>
          {generating ? (
            <span className="text-muted-foreground">Generating...</span>
          ) : (
            <span className="text-primary neon-text">{hwid}</span>
          )}
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={generating}
            className="flex-1"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy HWID
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={generateHWID}
            disabled={generating}
          >
            <RefreshCw className={cn("h-4 w-4", generating && "animate-spin")} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HWIDDisplay;
