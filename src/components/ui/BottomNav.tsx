import React from 'react';
import { 
  Map as MapIcon, 
  Camera, 
  BarChart3, 
  Network, 
  Box, 
  GraduationCap 
} from 'lucide-react';

export type TabId = 'map' | 'ar' | 'metrics' | 'graph' | 'voxel' | 'layout' | 'thesis';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

export const BottomNav = ({ activeTab, onTabChange, darkMode = false }: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  darkMode?: boolean;
}) => {
  const tabs: TabConfig[] = [
    { id: 'map', label: 'Map', icon: <MapIcon size={18} /> },
    { id: 'ar', label: 'AR', icon: <Camera size={18} /> },
    { id: 'metrics', label: 'Stats', icon: <BarChart3 size={18} /> },
    { id: 'graph', label: 'Nodes', icon: <Network size={18} /> },
    { id: 'voxel', label: 'Campus', icon: <Box size={18} /> },
    { id: 'layout', label: 'Layout', icon: <Box size={18} /> },
    { id: 'thesis', label: 'Report', icon: <GraduationCap size={18} /> },
  ];

  return (
    <nav className={`flex justify-around items-center h-20 px-2 pb-6 ${darkMode ? 'bg-slate-900 border-t border-slate-800' : 'bg-white border-t border-gray-100'} relative z-50 shadow-2xl`}>
      {tabs.map(t => (
        <button 
          key={t.id} 
          onClick={() => onTabChange(t.id)}
          className={`flex flex-col items-center justify-center flex-1 gap-1 transition-all duration-300 ${activeTab === t.id ? 'text-blue-500 scale-110' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <div className={`${activeTab === t.id ? 'bg-blue-500/10 p-2 rounded-xl shadow-inner' : 'p-2'}`}>
            {t.icon}
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">{t.label}</span>
          
          {activeTab === t.id && (
            <div className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]" />
          )}
        </button>
      ))}
    </nav>
  );
};
