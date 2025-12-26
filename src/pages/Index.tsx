import { Link } from "react-router-dom";
import { Shield, Lock, Key, Zap, Eye, Server, ArrowRight, Terminal as TerminalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import FeatureCard from "@/components/FeatureCard";
import Terminal from "@/components/Terminal";

const Index = () => {
  const terminalLines = [
    "Initializing RobloxGuard security system...",
    "Loading encryption modules...",
    "HWID verification system: ONLINE",
    "Obfuscation engine: READY",
    "System status: FULLY OPERATIONAL",
  ];

  const features = [
    {
      icon: Lock,
      title: "Military-Grade Obfuscation",
      description: "Script kamu akan dienkripsi dengan algoritma tingkat lanjut yang hampir mustahil untuk di-deobfuscate.",
    },
    {
      icon: Key,
      title: "HWID Key System",
      description: "Setiap pengguna harus mendapatkan key unik berdasarkan Hardware ID mereka untuk mengakses script.",
    },
    {
      icon: Zap,
      title: "Instant Deployment",
      description: "Upload script sekali, dan langsung siap digunakan dengan perlindungan penuh aktif.",
    },
    {
      icon: Eye,
      title: "Anti-Decompile",
      description: "Teknologi anti-debugging yang mencegah script dibongkar menggunakan tools apapun.",
    },
    {
      icon: Server,
      title: "Cloud Verification",
      description: "Semua key diverifikasi melalui server kami untuk keamanan maksimal.",
    },
    {
      icon: TerminalIcon,
      title: "Custom Expiry",
      description: "Atur masa berlaku key sesuai keinginan - harian, mingguan, atau selamanya.",
    },
  ];

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 matrix-rain opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-8 opacity-0 animate-fade-in">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-wider text-primary">
                Ultimate Script Protection
              </span>
            </div>
            
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 opacity-0 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <span className="text-foreground">Protect Your </span>
              <span className="text-gradient-cyber">Roblox Scripts</span>
              <span className="text-foreground"> From Hackers</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto opacity-0 animate-fade-in" style={{ animationDelay: '400ms' }}>
              Sistem keamanan tingkat tinggi untuk script Roblox dengan obfuscation ketat dan 
              HWID key system yang tidak bisa di-bypass.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 animate-fade-in" style={{ animationDelay: '600ms' }}>
              <Link to="/upload">
                <Button variant="cyber" size="xl" className="group">
                  Upload Script
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/getkey">
                <Button variant="outline" size="xl">
                  <Key className="h-5 w-5 mr-2" />
                  Get Key
                </Button>
              </Link>
            </div>
          </div>

          {/* Terminal Preview */}
          <div className="mt-16 max-w-2xl mx-auto opacity-0 animate-fade-in" style={{ animationDelay: '800ms' }}>
            <Terminal lines={terminalLines} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              <span className="text-foreground">Fitur </span>
              <span className="text-primary neon-text">Keamanan</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Teknologi terdepan untuk melindungi script kamu dari pencurian dan modifikasi ilegal.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                delay={index * 100}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 border-t border-border/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              <span className="text-foreground">Cara </span>
              <span className="text-primary neon-text">Kerja</span>
            </h2>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "01", title: "Upload Script", desc: "Upload script Lua kamu ke sistem kami" },
                { step: "02", title: "Obfuscate", desc: "Sistem akan mengenkripsi script secara otomatis" },
                { step: "03", title: "Distribute", desc: "Bagikan script yang sudah dilindungi" },
              ].map((item, index) => (
                <div key={item.step} className="relative text-center opacity-0 animate-fade-in" style={{ animationDelay: `${index * 200}ms` }}>
                  <div className="text-6xl font-display font-bold text-primary/20 mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2 text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.desc}
                  </p>
                  {index < 2 && (
                    <ArrowRight className="hidden md:block absolute top-8 -right-4 h-6 w-6 text-primary/50" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-bold">
              ROBLOX<span className="text-neon-purple">GUARD</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 RobloxGuard. Semua hak dilindungi.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
