import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: FeatureCardProps) => {
  return (
    <div 
      className={cn(
        "group relative p-6 rounded-lg border border-border/50 bg-gradient-card",
        "hover:border-primary/50 transition-all duration-500",
        "opacity-0 animate-fade-in"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg" />
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
           style={{ boxShadow: '0 0 30px hsl(var(--primary) / 0.2)' }} />
      
      <div className="relative z-10">
        <div className="mb-4 inline-flex p-3 rounded-lg bg-primary/10 border border-primary/30 group-hover:border-primary/50 transition-colors duration-300">
          <Icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
        </div>
        <h3 className="font-display text-lg font-semibold mb-2 text-foreground group-hover:text-primary transition-colors duration-300">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};

export default FeatureCard;
