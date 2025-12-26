import { useState } from "react";
import { Upload as UploadIcon, FileCode, Shield, Clock, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import Navbar from "@/components/Navbar";
import CodeBlock from "@/components/CodeBlock";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Upload = () => {
  const [scriptName, setScriptName] = useState("");
  const [scriptCode, setScriptCode] = useState("");
  const [expiry, setExpiry] = useState("168"); // Default 7 days in hours
  const [keySystemEnabled, setKeySystemEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loaderScript, setLoaderScript] = useState<string | null>(null);
  const [scriptId, setScriptId] = useState<string | null>(null);

  // Simple obfuscation function (in production, use a real obfuscator)
  const obfuscateScript = (code: string): string => {
    // Base64 encode with some modifications
    const encoded = btoa(unescape(encodeURIComponent(code)));
    const scrambled = encoded.split('').reverse().join('');
    
    return `-- RobloxGuard Protected Script
-- Do not modify this code
local _=[[${scrambled}]]
local function d(s)
  local r=""
  for i=#s,1,-1 do r=r..s:sub(i,i) end
  return r
end
local function b64d(s)
  local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  s=string.gsub(s,'[^'..b..'=]','')
  return(s:gsub('.',function(x)
    if x=='=' then return '' end
    local r,f='',(b:find(x)-1)
    for i=6,1,-1 do r=r..(f%2^i-f%2^(i-1)>0 and '1' or '0') end
    return r
  end):gsub('%d%d%d?%d?%d?%d?%d?%d?',function(x)
    if #x~=8 then return '' end
    local c=0
    for i=1,8 do c=c+(x:sub(i,i)=='1' and 2^(8-i) or 0) end
    return string.char(c)
  end))
end
loadstring(b64d(d(_)))()`;
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
    
    try {
      // Obfuscate the script
      const obfuscated = obfuscateScript(scriptCode);
      
      // Calculate expiry hours
      const expiryHours = expiry === "lifetime" ? -1 : parseInt(expiry);
      
      // Get the Supabase project URL for the edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Generate loader script placeholder (will be updated with real ID)
      const tempLoader = "-- Loading...";

      // Save to database
      const { data, error } = await supabase
        .from('scripts')
        .insert({
          name: scriptName,
          original_script: scriptCode,
          obfuscated_script: obfuscated,
          loader_script: tempLoader,
          key_system_enabled: keySystemEnabled,
          key_expiry_hours: expiryHours
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Generate actual loader script with the real script ID
      const keyUrl = `${window.location.origin}/getkey?script=${data.id}`;
      const verifyUrl = `${supabaseUrl}/functions/v1/verify-key`;
      const loadUrl = `${supabaseUrl}/functions/v1/load-script/${data.id}`;

      const finalLoader = keySystemEnabled ? `-- RobloxGuard Protected Script
-- Script: ${scriptName}
-- ID: ${data.id}

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local function getHWID()
    local success, hwid = pcall(function()
        return game:GetService("RbxAnalyticsService"):GetClientId()
    end)
    if success then return hwid end
    return tostring(Players.LocalPlayer.UserId)
end

local scriptId = "${data.id}"
local keyUrl = "${keyUrl}"
local verifyUrl = "${verifyUrl}"
local loadUrl = "${loadUrl}"

-- Check for saved key
local savedKey = nil
if getgenv then
    savedKey = getgenv()["RG_KEY_" .. scriptId]
end

local function promptKey()
    if setclipboard then
        setclipboard(keyUrl)
    end
    game:GetService("StarterGui"):SetCore("SendNotification", {
        Title = "RobloxGuard",
        Text = "Get your key! Link copied to clipboard.",
        Duration = 10
    })
    error("[RobloxGuard] Get your key at: " .. keyUrl)
end

local function verifyAndLoad(key)
    local hwid = getHWID()
    
    -- Verify key
    local success, response = pcall(function()
        return HttpService:GetAsync(verifyUrl .. "?script=" .. scriptId .. "&hwid=" .. hwid .. "&key=" .. key)
    end)
    
    if not success then
        promptKey()
        return
    end
    
    local data = HttpService:JSONDecode(response)
    if not data.valid then
        if getgenv then
            getgenv()["RG_KEY_" .. scriptId] = nil
        end
        promptKey()
        return
    end
    
    -- Save valid key
    if getgenv then
        getgenv()["RG_KEY_" .. scriptId] = key
    end
    
    -- Load script
    local scriptSuccess, scriptContent = pcall(function()
        return HttpService:GetAsync(loadUrl .. "?hwid=" .. hwid .. "&key=" .. key)
    end)
    
    if scriptSuccess and scriptContent then
        if string.sub(scriptContent, 1, 8) == "-- Error" then
            error(scriptContent)
        else
            loadstring(scriptContent)()
        end
    else
        error("[RobloxGuard] Failed to load script")
    end
end

-- Try saved key first
if savedKey then
    verifyAndLoad(savedKey)
else
    -- Prompt for key input
    local inputKey = nil
    
    -- Try to get key from user
    if getgenv and getgenv().RobloxGuardKey then
        inputKey = getgenv().RobloxGuardKey
    end
    
    if inputKey then
        verifyAndLoad(inputKey)
    else
        promptKey()
    end
end` : `-- RobloxGuard Protected Script
-- Script: ${scriptName}
-- ID: ${data.id}
-- Key System: Disabled

local HttpService = game:GetService("HttpService")
local loadUrl = "${loadUrl}"

local success, scriptContent = pcall(function()
    return HttpService:GetAsync(loadUrl)
end)

if success and scriptContent then
    if string.sub(scriptContent, 1, 8) == "-- Error" then
        error(scriptContent)
    else
        loadstring(scriptContent)()
    end
else
    error("[RobloxGuard] Failed to load script")
end`;

      // Update with final loader script
      await supabase
        .from('scripts')
        .update({ loader_script: finalLoader })
        .eq('id', data.id);

      setScriptId(data.id);
      setLoaderScript(finalLoader);
      
      toast({
        title: "Berhasil!",
        description: "Script berhasil di-obfuscate dan disimpan ke database.",
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal menyimpan script.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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

              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
                <div className="flex items-center gap-3">
                  {keySystemEnabled ? (
                    <ToggleRight className="h-5 w-5 text-primary" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <Label htmlFor="keySystem" className="cursor-pointer">Key System</Label>
                    <p className="text-xs text-muted-foreground">
                      {keySystemEnabled ? "User harus mendapatkan key untuk menjalankan script" : "Script bisa langsung dijalankan tanpa key"}
                    </p>
                  </div>
                </div>
                <Switch
                  id="keySystem"
                  checked={keySystemEnabled}
                  onCheckedChange={setKeySystemEnabled}
                />
              </div>

              {keySystemEnabled && (
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
                      <SelectItem value="1">1 Jam</SelectItem>
                      <SelectItem value="6">6 Jam</SelectItem>
                      <SelectItem value="24">1 Hari</SelectItem>
                      <SelectItem value="168">7 Hari</SelectItem>
                      <SelectItem value="720">30 Hari</SelectItem>
                      <SelectItem value="8760">1 Tahun</SelectItem>
                      <SelectItem value="lifetime">Selamanya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                    Obfuscate & Save
                  </>
                )}
              </Button>
            </div>

            {/* Output */}
            <div className="space-y-6">
              <div className="p-6 rounded-lg border border-border bg-card/50">
                <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
                  <Shield className="h-5 w-5 text-accent" />
                  <span className="font-display text-lg font-semibold">Loader Script</span>
                </div>

                {loaderScript ? (
                  <div className="space-y-4">
                    <div className="p-3 rounded-md bg-accent/10 border border-accent/30">
                      <p className="text-sm text-accent font-mono">
                        Script ID: {scriptId}
                      </p>
                    </div>
                    <CodeBlock code={loaderScript} language="lua" />
                    <p className="text-xs text-muted-foreground">
                      {keySystemEnabled 
                        ? "Script ini akan meminta key saat dijalankan. User harus mengunjungi halaman Get Key untuk mendapatkan akses."
                        : "Script ini bisa langsung dijalankan tanpa key."}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
                      <FileCode className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">
                      Loader script akan muncul di sini setelah obfuscation.
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
                  <li>• Script asli akan di-obfuscate dan disimpan di server</li>
                  <li>• Loader script akan memuat script dari server</li>
                  {keySystemEnabled && (
                    <>
                      <li>• User harus mendapatkan key berdasarkan HWID mereka</li>
                      <li>• Key akan expired sesuai durasi yang kamu tentukan</li>
                    </>
                  )}
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