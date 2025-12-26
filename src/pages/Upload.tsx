import { useState } from "react";
import { Upload as UploadIcon, FileCode, Shield, Clock, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import CodeBlock from "@/components/CodeBlock";
import { toast } from "@/hooks/use-toast";

const Upload = () => {
  const [scriptName, setScriptName] = useState("");
  const [scriptCode, setScriptCode] = useState("");
  const [expiry, setExpiry] = useState("7");
  const [isProcessing, setIsProcessing] = useState(false);
  const [obfuscatedScript, setObfuscatedScript] = useState<string | null>(null);
  const [scriptId, setScriptId] = useState<string | null>(null);

  const generateScriptId = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };

  const handleObfuscate = async () => {
    if (!scriptName.trim() || !scriptCode.trim()) {
      toast({
        title: "Error",
        description: "Mohon isi nama script dan kode script.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    // Simulate obfuscation process
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const newScriptId = generateScriptId();
    setScriptId(newScriptId);
    
    // Generate obfuscated loader script
    const loaderScript = `-- RobloxGuard Protected Script
-- Script ID: ${newScriptId}
-- Expiry: ${expiry} days

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local function getHWID()
    return game:GetService("RbxAnalyticsService"):GetClientId()
end

local scriptId = "${newScriptId}"
local keyUrl = "https://robloxguard.app/getkey?script=" .. scriptId

local function verifyKey()
    local hwid = getHWID()
    local success, result = pcall(function()
        return HttpService:GetAsync("https://api.robloxguard.app/verify?script=" .. scriptId .. "&hwid=" .. hwid)
    end)
    
    if success then
        local data = HttpService:JSONDecode(result)
        return data.valid, data.message
    end
    return false, "Connection failed"
end

local valid, message = verifyKey()

if not valid then
    local player = Players.LocalPlayer
    -- Open key page
    setclipboard(keyUrl)
    game:GetService("StarterGui"):SetCore("SendNotification", {
        Title = "RobloxGuard",
        Text = "Get your key! Link copied to clipboard.",
        Duration = 10
    })
    error("[RobloxGuard] Invalid or expired key. Get your key at: " .. keyUrl)
end

-- Protected script loads here after verification
loadstring(game:HttpGet("https://api.robloxguard.app/load/" .. scriptId))()`;

    setObfuscatedScript(loaderScript);
    setIsProcessing(false);
    
    toast({
      title: "Berhasil!",
      description: "Script berhasil di-obfuscate dan siap digunakan.",
    });
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <Navbar />
      
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-6">
              <UploadIcon className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-wider text-primary">
                Script Protection
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
              <span className="text-foreground">Upload & </span>
              <span className="text-gradient-cyber">Protect</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Upload script Lua kamu dan dapatkan versi yang sudah terproteksi dengan HWID key system.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="space-y-6 p-6 rounded-lg border border-border bg-card/50">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <FileCode className="h-5 w-5 text-primary" />
                <span className="font-display text-lg font-semibold">Script Input</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scriptName">Nama Script</Label>
                <Input
                  id="scriptName"
                  placeholder="Contoh: Auto Farm Script"
                  value={scriptName}
                  onChange={(e) => setScriptName(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scriptCode">Kode Script (Lua)</Label>
                <Textarea
                  id="scriptCode"
                  placeholder="-- Paste kode Lua kamu di sini..."
                  value={scriptCode}
                  onChange={(e) => setScriptCode(e.target.value)}
                  className="min-h-[200px] bg-secondary/50 font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Key Expiry
                </Label>
                <Select value={expiry} onValueChange={setExpiry}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder="Pilih durasi key" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Hari</SelectItem>
                    <SelectItem value="7">7 Hari</SelectItem>
                    <SelectItem value="30">30 Hari</SelectItem>
                    <SelectItem value="365">1 Tahun</SelectItem>
                    <SelectItem value="lifetime">Selamanya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="cyber"
                size="lg"
                className="w-full"
                onClick={handleObfuscate}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5 mr-2" />
                    Obfuscate Script
                  </>
                )}
              </Button>
            </div>

            {/* Output */}
            <div className="space-y-6">
              <div className="p-6 rounded-lg border border-border bg-card/50">
                <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
                  <Shield className="h-5 w-5 text-accent" />
                  <span className="font-display text-lg font-semibold">Protected Output</span>
                </div>

                {obfuscatedScript ? (
                  <div className="space-y-4">
                    <div className="p-3 rounded-md bg-accent/10 border border-accent/30">
                      <p className="text-sm text-accent font-mono">
                        Script ID: {scriptId}
                      </p>
                    </div>
                    <CodeBlock code={obfuscatedScript} language="lua" />
                    <p className="text-xs text-muted-foreground">
                      Script ini akan meminta key saat dijalankan. User harus mengunjungi halaman Get Key untuk mendapatkan akses.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
                      <FileCode className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">
                      Script yang sudah diproteksi akan muncul di sini.
                    </p>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                <h4 className="font-display text-sm font-semibold mb-2 text-primary">
                  Bagaimana cara kerjanya?
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Script akan terenkripsi dan hanya bisa dijalankan dengan key valid</li>
                  <li>• User harus mendapatkan key berdasarkan HWID mereka</li>
                  <li>• Key akan expired sesuai durasi yang kamu tentukan</li>
                  <li>• Script asli tidak akan pernah terekspos ke user</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Upload;
