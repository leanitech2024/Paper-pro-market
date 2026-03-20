"use client";
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Palette, Moon, Sun, Bell, Mail, Smartphone, Volume2, RotateCcw, Monitor } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  
  const [notifications, setNotifications] = useState({
    tradeAlerts: true,
    priceAlerts: false,
    emailDigest: true,
    pushNotifications: false,
    soundAlerts: true,
  });

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    toast.success('Preference updated');
  };

  const handleResetPreferences = () => {
    setNotifications({
      tradeAlerts: true,
      priceAlerts: false,
      emailDigest: true,
      pushNotifications: false,
      soundAlerts: true,
    });
    setTheme('dark');
    toast.success('All preferences reset to defaults');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 lg:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Customize your trading environment</p>
        </div>

        <div className="space-y-6">
          
          {/* Appearance Section */}
          <section className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Appearance</h2>
                <p className="text-sm text-muted-foreground">Select your ideal lighting.</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <button 
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  theme === 'light' ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-border/50 bg-background/50 hover:border-primary/50 hover:bg-muted'
                }`}
              >
                <Sun className={`w-6 h-6 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-semibold">Light</span>
              </button>
              
              <button 
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  theme === 'dark' ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-border/50 bg-background/50 hover:border-primary/50 hover:bg-muted'
                }`}
              >
                <Moon className={`w-6 h-6 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-semibold">Dark</span>
              </button>

              <button 
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  theme === 'system' ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-border/50 bg-background/50 hover:border-primary/50 hover:bg-muted'
                }`}
              >
                <Monitor className={`w-6 h-6 ${theme === 'system' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-semibold">System</span>
              </button>
            </div>
          </section>

          {/* Notifications Section */}
          <section className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Notifications</h2>
                <p className="text-sm text-muted-foreground">Choose what alerts you receive.</p>
              </div>
            </div>

            <div className="space-y-1">
              {[
                { id: 'tradeAlerts', icon: <Bell className="w-4 h-4" />, label: 'Trade Execution Alerts', desc: 'Get notified instantly when orders are filled.' },
                { id: 'priceAlerts', icon: <Bell className="w-4 h-4" />, label: 'Price Alerts', desc: 'Trigger when instruments hit your targets.' },
                { id: 'emailDigest', icon: <Mail className="w-4 h-4" />, label: 'Weekly Email Digest', desc: 'A summary of your performance and insights.' },
                { id: 'pushNotifications', icon: <Smartphone className="w-4 h-4" />, label: 'Mobile Push Notifications', desc: 'Receive updates directly on your device.' },
                { id: 'soundAlerts', icon: <Volume2 className="w-4 h-4" />, label: 'Sound Alert Tones', desc: 'Play sounds during critical market events.' }
              ].map((item, index, arr) => (
                <div key={item.id} className={`flex items-center justify-between py-4 ${index !== arr.length - 1 ? 'border-b border-border/50' : ''}`}>
                  <div className="flex items-start gap-4 pr-4">
                    <div className="mt-1 text-muted-foreground">{item.icon}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications[item.id as keyof typeof notifications]}
                    onCheckedChange={() => handleNotificationChange(item.id as keyof typeof notifications)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Danger Zone / Reset */}
          <section className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center sm:text-left">
               <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive flex-shrink-0">
                 <RotateCcw className="w-6 h-6" />
               </div>
               <div>
                 <h3 className="font-bold text-foreground">Reset Preferences</h3>
                 <p className="text-sm text-muted-foreground mt-0.5">Return all settings to their default factory state.</p>
               </div>
            </div>
            <Button variant="destructive" onClick={handleResetPreferences} className="rounded-xl px-8 w-full sm:w-auto hover:bg-destructive/90 transition-all font-semibold">
              Reset All
            </Button>
          </section>

        </div>
      </div>
    </div>
  );
}
