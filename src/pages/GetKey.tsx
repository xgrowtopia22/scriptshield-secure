import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Key, Shield, Clock, CheckCircle, XCircle, Loader2, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import HWIDDisplay from "@/components/HWIDDisplay";
import { toast } from "@/hooks/use-toast";

const GetKey = () => {
  const [searchParams] = useSearchParams();
  const scriptId = searchParams.get("script");
  
  const [step, setStep] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyExpiry, setKeyExpiry] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const linkSteps = [
    { name: "Linkvertise", url: "https://linkvertise.com" },
    { name: "Complete Captcha", url: "#" },
  ];

  const handleStartVerification = () => {
    setStep(2);
    setCountdown(15);
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && step === 2) {
      setStep(3);
    }
  }, [countdown, step]);

  const handleGenerateKey = async () => {
    setIsVerifying(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a random key
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const segments = [];
    for (let i = 0; i < 4; i++) {
      let segment = "";
      for (let j = 0; j < 5; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    
    const key = segments.join("-");
    setGeneratedKey(key);
    
    // Set expiry (7 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    setKeyExpiry(expiryDate.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }));
    
    setIsVerifying(false);
    setStep(4);
    
    toast({
      title: "Key Generated!",
      description: "Key kamu berhasil dibuat dan siap digunakan.",
    });
  };

  const handleCopyKey = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Key berhasil disalin ke clipboard.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <Navbar />
      
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-6">
              <Key className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-wider text-primary">
                Key Generation
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
              <span className="text-foreground">Get Your </span>
              <span className="text-gradient-cyber">Access Key</span>
            </h1>
            <p className="text-muted-foreground">
              Ikuti langkah-langkah berikut untuk mendapatkan key akses script.
            </p>
            {scriptId && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 border border-border">
                <span className="text-xs text-muted-foreground">Script ID:</span>
                <span className="text-xs font-mono text-primary">{scriptId}</span>
              </div>
            )}
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-display text-sm font-bold
                  ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}
                  ${step === s ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                `}>
                  {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                </div>
                {s < 4 && (
                  <div className={`w-12 h-0.5 ${step > s ? 'bg-primary' : 'bg-secondary'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="p-6 rounded-lg border border-border bg-card/50 neon-border">
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-display text-lg font-semibold">Step 1: Verify HWID</span>
                </div>
                
                <HWIDDisplay />
                
                <p className="text-sm text-muted-foreground text-center">
                  HWID kamu akan digunakan untuk mengidentifikasi perangkat. 
                  Key hanya bisa digunakan di perangkat ini.
                </p>
                
                <Button
                  variant="cyber"
                  size="lg"
                  className="w-full"
                  onClick={handleStartVerification}
                >
                  Continue to Verification
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <ExternalLink className="h-5 w-5 text-primary" />
                  <span className="font-display text-lg font-semibold">Step 2: Complete Verification</span>
                </div>
                
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/30 mb-6">
                    <span className="font-display text-3xl font-bold text-primary">{countdown}</span>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Mohon tunggu sebentar...
                  </p>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-neon-purple transition-all duration-1000"
                      style={{ width: `${((15 - countdown) / 15) * 100}%` }}
                    />
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  Verifikasi otomatis sedang berjalan. Jangan tutup halaman ini.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <Key className="h-5 w-5 text-primary" />
                  <span className="font-display text-lg font-semibold">Step 3: Generate Key</span>
                </div>
                
                <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
                  <div className="flex items-center gap-2 text-accent mb-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold">Verification Complete!</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    HWID kamu telah terverifikasi. Klik tombol di bawah untuk generate key.
                  </p>
                </div>
                
                <Button
                  variant="cyber"
                  size="lg"
                  className="w-full"
                  onClick={handleGenerateKey}
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Generating Key...
                    </>
                  ) : (
                    <>
                      <Key className="h-5 w-5 mr-2" />
                      Generate Key
                    </>
                  )}
                </Button>
              </div>
            )}

            {step === 4 && generatedKey && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <CheckCircle className="h-5 w-5 text-accent" />
                  <span className="font-display text-lg font-semibold">Key Generated!</span>
                </div>
                
                <div className="p-4 rounded-lg bg-card border border-primary/30 neon-border">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Your Access Key</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      value={generatedKey}
                      readOnly
                      className="font-mono text-lg text-primary bg-secondary/50 text-center tracking-widest"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyKey}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Berlaku hingga: {keyExpiry}</span>
                </div>
                
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <h4 className="font-display text-sm font-semibold mb-2">Cara Menggunakan:</h4>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Copy key di atas</li>
                    <li>Jalankan script di Roblox executor</li>
                    <li>Masukkan key saat diminta</li>
                    <li>Nikmati script tanpa batasan!</li>
                  </ol>
                </div>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={handleCopyKey}
                >
                  {copied ? (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Key Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-5 w-5 mr-2" />
                      Copy Key to Clipboard
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="mt-6 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h4 className="font-display text-sm font-semibold text-destructive mb-1">Peringatan</h4>
                <p className="text-xs text-muted-foreground">
                  Jangan bagikan key kamu ke orang lain. Key terikat dengan HWID perangkat kamu 
                  dan tidak bisa digunakan di perangkat lain.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GetKey;
