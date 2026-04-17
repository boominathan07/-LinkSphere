import { useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "../components/ui/GlassCard";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    siteName: "LinkSphere",
    maintenanceMode: false,
    registrationEnabled: true
  });

  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="font-display text-3xl">Admin Settings</h1>
      
      <GlassCard className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-2">Site Name</label>
            <input
              type="text"
              value={settings.siteName}
              onChange={(e) => setSettings({...settings, siteName: e.target.value})}
              className="w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-2 outline-none focus:border-accent-violet"
            />
          </div>
          
          <label className="flex items-center justify-between cursor-pointer">
            <span>Maintenance Mode</span>
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})}
              className="w-4 h-4 accent-accent-violet"
            />
          </label>
          
          <label className="flex items-center justify-between cursor-pointer">
            <span>Registration Enabled</span>
            <input
              type="checkbox"
              checked={settings.registrationEnabled}
              onChange={(e) => setSettings({...settings, registrationEnabled: e.target.checked})}
              className="w-4 h-4 accent-accent-violet"
            />
          </label>
          
          <button 
            onClick={handleSave} 
            className="px-6 py-2 bg-gradient-to-r from-accent-violet to-accent-cyan rounded-xl text-white font-medium hover:shadow-lg transition"
          >
            Save Settings
          </button>
        </div>
      </GlassCard>
    </div>
  );
}