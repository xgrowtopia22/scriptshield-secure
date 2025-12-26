import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TerminalProps {
  lines: string[];
  className?: string;
  autoType?: boolean;
}

const Terminal = ({ lines, className, autoType = true }: TerminalProps) => {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);

  useEffect(() => {
    if (!autoType) {
      setDisplayedLines(lines);
      return;
    }

    if (currentLineIndex >= lines.length) return;

    const currentLine = lines[currentLineIndex];
    
    if (currentCharIndex < currentLine.length) {
      const timeout = setTimeout(() => {
        setDisplayedLines(prev => {
          const newLines = [...prev];
          newLines[currentLineIndex] = currentLine.slice(0, currentCharIndex + 1);
          return newLines;
        });
        setCurrentCharIndex(prev => prev + 1);
      }, 20);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setCurrentLineIndex(prev => prev + 1);
        setCurrentCharIndex(0);
        setDisplayedLines(prev => [...prev, ""]);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [currentLineIndex, currentCharIndex, lines, autoType]);

  return (
    <div className={cn(
      "bg-card/80 border border-border rounded-lg overflow-hidden scanline",
      className
    )}>
      <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border-b border-border">
        <div className="w-3 h-3 rounded-full bg-destructive/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <div className="w-3 h-3 rounded-full bg-accent/80" />
        <span className="ml-4 text-xs text-muted-foreground font-mono">terminal.sh</span>
      </div>
      <div className="p-4 font-mono text-sm">
        {displayedLines.map((line, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="text-terminal-green select-none">$</span>
            <span className={cn(
              "text-foreground",
              index === displayedLines.length - 1 && autoType && currentLineIndex < lines.length && "typing-cursor"
            )}>
              {line}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Terminal;
