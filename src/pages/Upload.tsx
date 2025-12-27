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
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast({
          title: "Error",
          description: "You must be logged in to upload scripts.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Obfuscate the script
      const obfuscated = obfuscateScript(scriptCode);
      
      // Calculate expiry hours
      const expiryHours = expiry === "lifetime" ? -1 : parseInt(expiry);
      
      // Get the Supabase project URL for the edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Generate loader script placeholder (will be updated with real ID)
      const tempLoader = "-- Loading...";

      // Save to database with user_id
      const { data, error } = await supabase
        .from('scripts')
        .insert({
          user_id: user.id,
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
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local CoreGui = game:GetService("CoreGui")

local scriptId = "${data.id}"
local keyUrl = "${keyUrl}"
local verifyUrl = "${verifyUrl}"
local loadUrl = "${loadUrl}"

local function getHWID()
    local success, hwid = pcall(function()
        return game:GetService("RbxAnalyticsService"):GetClientId()
    end)
    if success then return hwid end
    return tostring(Players.LocalPlayer.UserId)
end

-- Check for saved key
local savedKey = nil
if getgenv then
    savedKey = getgenv()["RG_KEY_" .. scriptId]
end

local function verifyAndLoad(key, statusLabel, onSuccess, onFail)
    local hwid = getHWID()
    
    if statusLabel then
        statusLabel.Text = "Verifying key..."
        statusLabel.TextColor3 = Color3.fromRGB(255, 200, 100)
    end
    
    local success, response = pcall(function()
        return HttpService:GetAsync(verifyUrl .. "?script=" .. scriptId .. "&hwid=" .. hwid .. "&key=" .. key)
    end)
    
    if not success then
        if statusLabel then
            statusLabel.Text = "Connection error. Try again."
            statusLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
        end
        if onFail then onFail() end
        return false
    end
    
    local data = HttpService:JSONDecode(response)
    if not data.valid then
        if getgenv then
            getgenv()["RG_KEY_" .. scriptId] = nil
        end
        if statusLabel then
            statusLabel.Text = data.message or "Invalid key!"
            statusLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
        end
        if onFail then onFail() end
        return false
    end
    
    if getgenv then
        getgenv()["RG_KEY_" .. scriptId] = key
    end
    
    if statusLabel then
        statusLabel.Text = "Key valid! Loading script..."
        statusLabel.TextColor3 = Color3.fromRGB(100, 255, 100)
    end
    
    local scriptSuccess, scriptContent = pcall(function()
        return HttpService:GetAsync(loadUrl .. "?hwid=" .. hwid .. "&key=" .. key)
    end)
    
    if scriptSuccess and scriptContent then
        if string.sub(scriptContent, 1, 8) == "-- Error" then
            if statusLabel then
                statusLabel.Text = scriptContent
                statusLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
            end
            if onFail then onFail() end
            return false
        else
            if onSuccess then onSuccess() end
            loadstring(scriptContent)()
            return true
        end
    else
        if statusLabel then
            statusLabel.Text = "Failed to load script"
            statusLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
        end
        if onFail then onFail() end
        return false
    end
end

local function createKeyUI()
    if CoreGui:FindFirstChild("RobloxGuardUI") then
        CoreGui:FindFirstChild("RobloxGuardUI"):Destroy()
    end
    
    local ScreenGui = Instance.new("ScreenGui")
    ScreenGui.Name = "RobloxGuardUI"
    ScreenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
    ScreenGui.ResetOnSpawn = false
    
    pcall(function()
        ScreenGui.Parent = CoreGui
    end)
    if not ScreenGui.Parent then
        ScreenGui.Parent = Players.LocalPlayer:WaitForChild("PlayerGui")
    end
    
    local MainFrame = Instance.new("Frame")
    MainFrame.Name = "MainFrame"
    MainFrame.Size = UDim2.new(0, 320, 0, 220)
    MainFrame.Position = UDim2.new(0.5, -160, 0.5, -110)
    MainFrame.BackgroundColor3 = Color3.fromRGB(25, 25, 35)
    MainFrame.BorderSizePixel = 0
    MainFrame.Parent = ScreenGui
    
    local UICorner = Instance.new("UICorner")
    UICorner.CornerRadius = UDim.new(0, 12)
    UICorner.Parent = MainFrame
    
    local UIStroke = Instance.new("UIStroke")
    UIStroke.Color = Color3.fromRGB(100, 100, 255)
    UIStroke.Thickness = 2
    UIStroke.Parent = MainFrame
    
    local dragging, dragInput, dragStart, startPos
    MainFrame.InputBegan:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
            dragging = true
            dragStart = input.Position
            startPos = MainFrame.Position
            input.Changed:Connect(function()
                if input.UserInputState == Enum.UserInputState.End then
                    dragging = false
                end
            end)
        end
    end)
    MainFrame.InputChanged:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then
            dragInput = input
        end
    end)
    UserInputService.InputChanged:Connect(function(input)
        if input == dragInput and dragging then
            local delta = input.Position - dragStart
            MainFrame.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + delta.X, startPos.Y.Scale, startPos.Y.Offset + delta.Y)
        end
    end)
    
    local TitleBar = Instance.new("Frame")
    TitleBar.Name = "TitleBar"
    TitleBar.Size = UDim2.new(1, 0, 0, 40)
    TitleBar.BackgroundColor3 = Color3.fromRGB(35, 35, 50)
    TitleBar.BorderSizePixel = 0
    TitleBar.Parent = MainFrame
    
    local TitleCorner = Instance.new("UICorner")
    TitleCorner.CornerRadius = UDim.new(0, 12)
    TitleCorner.Parent = TitleBar
    
    local TitleFix = Instance.new("Frame")
    TitleFix.Size = UDim2.new(1, 0, 0, 12)
    TitleFix.Position = UDim2.new(0, 0, 1, -12)
    TitleFix.BackgroundColor3 = Color3.fromRGB(35, 35, 50)
    TitleFix.BorderSizePixel = 0
    TitleFix.Parent = TitleBar
    
    local Title = Instance.new("TextLabel")
    Title.Name = "Title"
    Title.Size = UDim2.new(1, -50, 1, 0)
    Title.Position = UDim2.new(0, 15, 0, 0)
    Title.BackgroundTransparency = 1
    Title.Text = "RobloxGuard Key System"
    Title.TextColor3 = Color3.fromRGB(255, 255, 255)
    Title.TextSize = 16
    Title.Font = Enum.Font.GothamBold
    Title.TextXAlignment = Enum.TextXAlignment.Left
    Title.Parent = TitleBar
    
    local CloseBtn = Instance.new("TextButton")
    CloseBtn.Name = "CloseBtn"
    CloseBtn.Size = UDim2.new(0, 30, 0, 30)
    CloseBtn.Position = UDim2.new(1, -35, 0, 5)
    CloseBtn.BackgroundColor3 = Color3.fromRGB(255, 80, 80)
    CloseBtn.Text = "X"
    CloseBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    CloseBtn.TextSize = 14
    CloseBtn.Font = Enum.Font.GothamBold
    CloseBtn.Parent = TitleBar
    
    local CloseBtnCorner = Instance.new("UICorner")
    CloseBtnCorner.CornerRadius = UDim.new(0, 6)
    CloseBtnCorner.Parent = CloseBtn
    
    CloseBtn.MouseButton1Click:Connect(function()
        ScreenGui:Destroy()
    end)
    
    local Content = Instance.new("Frame")
    Content.Name = "Content"
    Content.Size = UDim2.new(1, -30, 1, -55)
    Content.Position = UDim2.new(0, 15, 0, 50)
    Content.BackgroundTransparency = 1
    Content.Parent = MainFrame
    
    local KeyInput = Instance.new("TextBox")
    KeyInput.Name = "KeyInput"
    KeyInput.Size = UDim2.new(1, 0, 0, 40)
    KeyInput.Position = UDim2.new(0, 0, 0, 10)
    KeyInput.BackgroundColor3 = Color3.fromRGB(45, 45, 60)
    KeyInput.BorderSizePixel = 0
    KeyInput.Text = ""
    KeyInput.PlaceholderText = "Enter your key here..."
    KeyInput.PlaceholderColor3 = Color3.fromRGB(150, 150, 150)
    KeyInput.TextColor3 = Color3.fromRGB(255, 255, 255)
    KeyInput.TextSize = 14
    KeyInput.Font = Enum.Font.GothamMedium
    KeyInput.ClearTextOnFocus = false
    KeyInput.Parent = Content
    
    local KeyInputCorner = Instance.new("UICorner")
    KeyInputCorner.CornerRadius = UDim.new(0, 8)
    KeyInputCorner.Parent = KeyInput
    
    local StatusLabel = Instance.new("TextLabel")
    StatusLabel.Name = "StatusLabel"
    StatusLabel.Size = UDim2.new(1, 0, 0, 20)
    StatusLabel.Position = UDim2.new(0, 0, 0, 55)
    StatusLabel.BackgroundTransparency = 1
    StatusLabel.Text = "Enter your key to continue"
    StatusLabel.TextColor3 = Color3.fromRGB(180, 180, 180)
    StatusLabel.TextSize = 12
    StatusLabel.Font = Enum.Font.Gotham
    StatusLabel.Parent = Content
    
    local VerifyBtn = Instance.new("TextButton")
    VerifyBtn.Name = "VerifyBtn"
    VerifyBtn.Size = UDim2.new(0.48, 0, 0, 38)
    VerifyBtn.Position = UDim2.new(0, 0, 0, 85)
    VerifyBtn.BackgroundColor3 = Color3.fromRGB(80, 80, 255)
    VerifyBtn.Text = "Verify Key"
    VerifyBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    VerifyBtn.TextSize = 14
    VerifyBtn.Font = Enum.Font.GothamBold
    VerifyBtn.Parent = Content
    
    local VerifyBtnCorner = Instance.new("UICorner")
    VerifyBtnCorner.CornerRadius = UDim.new(0, 8)
    VerifyBtnCorner.Parent = VerifyBtn
    
    local GetKeyBtn = Instance.new("TextButton")
    GetKeyBtn.Name = "GetKeyBtn"
    GetKeyBtn.Size = UDim2.new(0.48, 0, 0, 38)
    GetKeyBtn.Position = UDim2.new(0.52, 0, 0, 85)
    GetKeyBtn.BackgroundColor3 = Color3.fromRGB(60, 60, 80)
    GetKeyBtn.Text = "Get Key"
    GetKeyBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    GetKeyBtn.TextSize = 14
    GetKeyBtn.Font = Enum.Font.GothamBold
    GetKeyBtn.Parent = Content
    
    local GetKeyBtnCorner = Instance.new("UICorner")
    GetKeyBtnCorner.CornerRadius = UDim.new(0, 8)
    GetKeyBtnCorner.Parent = GetKeyBtn
    
    local function createHoverEffect(button, normalColor, hoverColor)
        button.MouseEnter:Connect(function()
            TweenService:Create(button, TweenInfo.new(0.2), {BackgroundColor3 = hoverColor}):Play()
        end)
        button.MouseLeave:Connect(function()
            TweenService:Create(button, TweenInfo.new(0.2), {BackgroundColor3 = normalColor}):Play()
        end)
    end
    
    createHoverEffect(VerifyBtn, Color3.fromRGB(80, 80, 255), Color3.fromRGB(100, 100, 255))
    createHoverEffect(GetKeyBtn, Color3.fromRGB(60, 60, 80), Color3.fromRGB(80, 80, 100))
    createHoverEffect(CloseBtn, Color3.fromRGB(255, 80, 80), Color3.fromRGB(255, 100, 100))
    
    local isVerifying = false
    
    VerifyBtn.MouseButton1Click:Connect(function()
        if isVerifying then return end
        local key = KeyInput.Text:gsub("%s+", "")
        
        if key == "" then
            StatusLabel.Text = "Please enter a key!"
            StatusLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
            return
        end
        
        isVerifying = true
        VerifyBtn.Text = "Verifying..."
        
        verifyAndLoad(key, StatusLabel, function()
            task.wait(0.5)
            ScreenGui:Destroy()
        end, function()
            isVerifying = false
            VerifyBtn.Text = "Verify Key"
        end)
    end)
    
    GetKeyBtn.MouseButton1Click:Connect(function()
        if setclipboard then
            setclipboard(keyUrl)
            StatusLabel.Text = "Link copied! Open in browser."
            StatusLabel.TextColor3 = Color3.fromRGB(100, 255, 100)
        else
            StatusLabel.Text = "Copy: " .. keyUrl
            StatusLabel.TextColor3 = Color3.fromRGB(255, 200, 100)
        end
    end)
    
    MainFrame.Size = UDim2.new(0, 0, 0, 0)
    MainFrame.Position = UDim2.new(0.5, 0, 0.5, 0)
    TweenService:Create(MainFrame, TweenInfo.new(0.3, Enum.EasingStyle.Back), {
        Size = UDim2.new(0, 320, 0, 220),
        Position = UDim2.new(0.5, -160, 0.5, -110)
    }):Play()
    
    return ScreenGui
end

if savedKey then
    local success = verifyAndLoad(savedKey, nil, nil, nil)
    if not success then
        createKeyUI()
    end
else
    createKeyUI()
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
    } catch (error: unknown) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Unable to save script. Please try again.",
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
                        ? "Script ini akan menampilkan UI floating untuk input key saat dijalankan. User bisa memasukkan key langsung di UI tersebut."
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
                      <li>• UI floating akan muncul untuk input key</li>
                      <li>• Setelah key valid, script otomatis dijalankan</li>
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
