import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FileCode, Shield, Clock, Key, Copy, Check, Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Script {
  id: string;
  name: string;
  key_system_enabled: boolean;
  key_expiry_hours: number;
  created_at: string;
  loader_script: string;
}

const Scripts = () => {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('scripts')
      .select('id, name, key_system_enabled, key_expiry_hours, created_at, loader_script')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Script fetch error:', error);
      toast({
        title: "Error",
        description: "Unable to load scripts. Please try again.",
        variant: "destructive",
      });
    } else {
      setScripts(data || []);
    }
    setLoading(false);
  };

  const handleCopyLoader = async (script: Script) => {
    await navigator.clipboard.writeText(script.loader_script);
    setCopiedId(script.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copied!",
      description: "Loader script berhasil disalin.",
    });
  };

  const handleToggleKeySystem = async (script: Script) => {
    const newValue = !script.key_system_enabled;
    const { error } = await supabase
      .from('scripts')
      .update({ key_system_enabled: newValue })
      .eq('id', script.id);

    if (error) {
      toast({
        title: "Error",
        description: "Unable to update key system status.",
        variant: "destructive",
      });
    } else {
      setScripts(scripts.map(s => 
        s.id === script.id ? { ...s, key_system_enabled: newValue } : s
      ));
      toast({
        title: newValue ? "Key System Aktif" : "Key System Nonaktif",
        description: newValue 
          ? "User harus mendapatkan key untuk menjalankan script." 
          : "Script bisa dijalankan tanpa key.",
      });
    }
  };

  const handleDelete = async (scriptId: string) => {
    if (!confirm("Yakin ingin menghapus script ini?")) return;

    const { error } = await supabase
      .from('scripts')
      .delete()
      .eq('id', scriptId);

    if (error) {
      toast({
        title: "Error",
        description: "Unable to delete script.",
        variant: "destructive",
      });
    } else {
      setScripts(scripts.filter(s => s.id !== scriptId));
      toast({
        title: "Berhasil",
        description: "Script berhasil dihapus.",
      });
    }
  };

  const formatExpiry = (hours: number) => {
    if (hours === -1) return "Selamanya";
    if (hours < 24) return `${hours} Jam`;
    if (hours < 168) return `${Math.floor(hours / 24)} Hari`;
    if (hours < 720) return `${Math.floor(hours / 168)} Minggu`;
    return `${Math.floor(hours / 720)} Bulan`;
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <Navbar />
      
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-6">
              <FileCode className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-wider text-primary">
                Script Manager
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
              <span className="text-foreground">My </span>
              <span className="text-gradient-cyber">Scripts</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Kelola semua script yang sudah kamu upload dan proteksi.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : scripts.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex p-6 rounded-full bg-muted/50 mb-6">
                <FileCode className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">Belum ada script</h3>
              <p className="text-muted-foreground mb-6">
                Upload script pertama kamu untuk memulai.
              </p>
              <Link to="/upload">
                <Button variant="cyber">
                  <Shield className="h-5 w-5 mr-2" />
                  Upload Script
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {scripts.map((script) => (
                <div 
                  key={script.id}
                  className="p-5 rounded-lg border border-border bg-card/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <FileCode className="h-5 w-5 text-primary shrink-0" />
                        <h3 className="font-display font-semibold truncate">{script.name}</h3>
                        {script.key_system_enabled ? (
                          <Badge variant="default" className="bg-accent text-accent-foreground shrink-0">
                            <Key className="h-3 w-3 mr-1" />
                            Key System
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0">
                            No Key
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-mono text-xs">ID: {script.id.slice(0, 8)}...</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expiry: {formatExpiry(script.key_expiry_hours)}
                        </span>
                        <span>
                          {new Date(script.created_at).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyLoader(script)}
                      >
                        {copiedId === script.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        <span className="ml-2 hidden sm:inline">Copy Loader</span>
                      </Button>
                      
                      <Button
                        variant={script.key_system_enabled ? "default" : "secondary"}
                        size="sm"
                        onClick={() => handleToggleKeySystem(script)}
                      >
                        {script.key_system_enabled ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                        <span className="ml-2 hidden sm:inline">
                          {script.key_system_enabled ? "Key On" : "Key Off"}
                        </span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(script.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Scripts;