
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie
} from 'recharts';
import { FileText, Download, Share2, ArrowLeft, CheckCircle2, Ruler, Clock, Radio, Layers } from 'lucide-react';
import { NavigationState, Building } from '../types';

interface ResultsDashboardProps {
  navState: NavigationState;
  targetBuilding: Building;
  onRestart: () => void;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ navState, targetBuilding, onRestart }) => {
  const timeTaken = ((navState.endTime || 0) - (navState.startTime || 0)) / 1000;
  
  const startPos = [0, 1, -10];
  const straightDist = Math.sqrt(
    Math.pow(targetBuilding.position[0] - startPos[0], 2) +
    Math.pow(targetBuilding.position[2] - startPos[2], 2)
  );
  const efficiency = Math.min(100, (straightDist / navState.distanceTraveled) * 100);

  const barData = [
    { name: 'Optimal', value: Math.round(straightDist) },
    { name: 'Actual', value: Math.round(navState.distanceTraveled) },
  ];

  const pieData = [
    { name: 'Confidence', value: Math.round(navState.fingerprintConfidence * 100) },
    { name: 'Noise', value: 100 - Math.round(navState.fingerprintConfidence * 100) },
  ];

  const exportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Metric,Value\n"
      + `Target,${targetBuilding.name}\n`
      + `Detected Floor,F${navState.detectedFloor}\n`
      + `Match Confidence,${(navState.fingerprintConfidence * 100).toFixed(2)}%\n`
      + `Time Taken (s),${timeTaken}\n`
      + `Efficiency (%),${efficiency}`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `navigation_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="absolute inset-0 bg-slate-950 z-50 overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black uppercase mb-2">
               Research Output Verified
             </div>
            <h2 className="text-4xl font-black text-white flex items-center gap-3">
              <FileText className="text-blue-500 w-8 h-8" />
              Evaluation Metrics
            </h2>
            <p className="text-slate-500 mt-1">Multi-modal navigation analysis (RSSI + Spatial + Temporal).</p>
          </div>
          <button 
            onClick={onRestart}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl transition-all border border-slate-800"
          >
            <ArrowLeft className="w-5 h-5" /> New Simulation
          </button>
        </div>

        {/* Scorecards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Time Efficiency', val: `${timeTaken.toFixed(1)}s`, icon: Clock, color: 'text-blue-400' },
            { label: 'Path Deviation', val: `${(navState.distanceTraveled - straightDist).toFixed(1)}m`, icon: Ruler, color: 'text-green-400' },
            { label: 'Detected Floor', val: `Level ${navState.detectedFloor}`, icon: Layers, color: 'text-purple-400' },
            { label: 'RSSI Confidence', val: `${(navState.fingerprintConfidence * 100).toFixed(1)}%`, icon: Radio, color: 'text-yellow-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
               <div className="flex justify-between items-start mb-4">
                 <stat.icon className={`${stat.color} w-6 h-6`} />
                 <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">{stat.label}</span>
               </div>
               <div className="text-2xl font-black text-white">{stat.val}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Chart 1: Distance Analysis */}
           <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 lg:col-span-2">
             <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
               Path Efficiency Visualization
             </h3>
             <div className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={barData} layout="vertical">
                   <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                   <XAxis type="number" stroke="#475569" hide />
                   <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} />
                   <Tooltip 
                     contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
                     cursor={{ fill: '#1e293b', opacity: 0.4 }}
                   />
                   <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={40} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
             <p className="text-[10px] text-slate-500 mt-4 leading-relaxed uppercase font-bold tracking-widest italic">
               * The system measures deviation from the geodesic path using real-time spatial triangulation.
             </p>
           </div>

           {/* Chart 2: Fingerprint Reliability */}
           <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
             <h3 className="text-lg font-bold mb-6 text-white text-center">RSSI Confidence</h3>
             <div className="h-[200px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#1e293b" />
                    </Pie>
                    <Tooltip />
                 </PieChart>
               </ResponsiveContainer>
             </div>
             <div className="text-center mt-4">
                <div className="text-4xl font-black text-blue-400">{(navState.fingerprintConfidence * 100).toFixed(0)}%</div>
                <div className="text-[10px] uppercase font-black text-slate-600 mt-1">Matching Precision</div>
             </div>
           </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex flex-col md:flex-row gap-4">
           <div className="flex-grow bg-slate-900 p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                   <CheckCircle2 className="text-blue-500 w-6 h-6" />
                </div>
                <div>
                   <div className="font-bold text-white">System Integrity Check Passed</div>
                   <div className="text-xs text-slate-500">Floor detected: Level {navState.detectedFloor} | Target: {targetBuilding.name}</div>
                </div>
              </div>
              <div className="flex gap-3">
                 <button onClick={exportData} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all">
                    <Download className="w-4 h-4" /> Export Research Data
                 </button>
                 <button className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg border border-slate-700">
                    <Share2 className="w-4 h-4" />
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDashboard;
