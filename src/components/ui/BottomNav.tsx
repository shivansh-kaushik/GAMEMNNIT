import React from 'react';

export type TabId = 'map' | 'ar' | 'metrics' | 'graph' | 'voxel' | 'thesis';

export const BottomNav = ({ activeTab, onTabChange, darkMode = false }: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  darkMode?: boolean;
}) => {
  const tabs: TabId[] = ['map', 'ar', 'metrics', 'graph', 'voxel', 'thesis'];
  return (
    <nav className={`flex justify-around p-2 ${darkMode ? 'bg-slate-900 border-t border-slate-800' : 'bg-white border-t border-gray-100'} sticky bottom-0 z-50 shadow-lg`}>
      {tabs.map(t => (
        <button 
          key={t} 
          onClick={() => onTabChange(t)}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === t ? 'text-blue-500 bg-blue-50/50' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <span className="text-[10px] font-bold tracking-wider">{t.toUpperCase()}</span>
        </button>
      ))}
    </nav>
  );
};
