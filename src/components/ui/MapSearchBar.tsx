import React, { useState } from 'react';

export const MapSearchBar = ({ onDestinationSelect, buildings = [] }: {
  onDestinationSelect: (id: string) => void;
  buildings?: any[];
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = buildings.filter(b => 
    b.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-2">
      <div className="bg-slate-800/90 backdrop-blur-md border border-white/10 p-2 rounded-2xl shadow-2xl flex items-center gap-3">
        <span className="ml-2 text-blue-400">🔍</span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search campus buildings..."
          className="w-full bg-transparent text-white text-sm font-medium outline-none placeholder:text-gray-500"
        />
      </div>
      
      {isOpen && query.length > 0 && (
        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden divide-y divide-white/5">
          {filtered.map(b => (
            <button 
              key={b.id} 
              onClick={() => {
                onDestinationSelect(b.id);
                setQuery(b.name);
                setIsOpen(false);
              }}
              className="w-full p-4 flex flex-col items-start hover:bg-white/5 transition-colors"
            >
              <span className="text-white text-sm font-bold">{b.name}</span>
              <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">{b.isIndoor ? `Floor ${b.floor}` : 'Outdoor Area'}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-4 text-gray-500 text-xs text-center italic">No buildings found</div>
          )}
        </div>
      )}
    </div>
  );
};
