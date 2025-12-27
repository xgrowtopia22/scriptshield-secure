import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Shield, Key, Upload, Home, LogIn, LogOut, User, FileCode, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // Set up auth listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    setLoggingOut(false);

    if (error) {
      toast({
        title: "Error",
        description: "Unable to sign out. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      navigate("/");
    }
  };

  const publicNavItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/getkey", label: "Get Key", icon: Key },
  ];

  const authNavItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/upload", label: "Upload Script", icon: Upload },
    { path: "/scripts", label: "My Scripts", icon: FileCode },
    { path: "/getkey", label: "Get Key", icon: Key },
  ];

  const navItems = session ? authNavItems : publicNavItems;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Shield className="h-8 w-8 text-primary transition-all duration-300 group-hover:scale-110" />
              <div className="absolute inset-0 bg-primary/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <span className="font-display text-xl font-bold tracking-wider neon-text">
              ROBLOX<span className="text-neon-purple">GUARD</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2",
                      isActive && "neon-border"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : session ? (
              <>
                <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="max-w-[150px] truncate">{session.user.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="gap-2"
                >
                  {loggingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="cyber" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
