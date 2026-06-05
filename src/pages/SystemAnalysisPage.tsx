import * as React from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants/collectionConstants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { Activity, ChevronDown, Check, Download } from 'lucide-react';
import { useGlobalStore } from '../store/useGlobalStore';
import { toJpeg } from 'html-to-image';

const downloadJPG = (elementId: string, chartName: string, activeCycle: string) => {
  const node = document.getElementById(elementId);
  if (!node) return;
  toJpeg(node, { quality: 0.95, backgroundColor: '#ffffff' })
    .then((dataUrl) => {
      const link = document.createElement('a');
      link.download = `${chartName}_${activeCycle}.jpg`;
      link.href = dataUrl;
      link.click();
    })
    .catch((error) => console.error('Error exporting image:', error));
};

export default function SystemAnalysisPage() {
  const { theme } = useGlobalStore();
  const [loading, setLoading] = React.useState(true);
  const currentYear = localStorage.getItem('fy') || '2026-27';

  // Live Firebase states
  const [categories, setCategories] = React.useState<any[]>([]);
  const [subSystems, setSubSystems] = React.useState<any[]>([]);
  const [plants, setPlants] = React.useState<any[]>([]);
  const [records, setRecords] = React.useState<any[]>([]);
  const [isolations, setIsolations] = React.useState<any[]>([]);

  // Sub-folder Multi-Select State
  const [selectedFolders, setSelectedFolders] = React.useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // Recursive-style hierarchy live mapping
    const unsubCats = onSnapshot(collection(db, COLLECTIONS.EQUIPMENT_TYPES), (snap) => {
      if (isMounted) setCategories(snap.docs.map(d => ({id:d.id, ...d.data()})));
    });
    
    const unsubSubs = onSnapshot(collection(db, 'subsystems'), (snap) => {
      if (isMounted) setSubSystems(snap.docs.map(d => ({id:d.id, ...d.data()})));
    });
    
    const unsubPlants = onSnapshot(collection(db, COLLECTIONS.PLANTS), (snap) => {
      if (isMounted) setPlants(snap.docs.map(d => ({id:d.id, ...d.data()})));
    });
    
    const recordsQ = currentYear ? query(collection(db, COLLECTIONS.TEST_RECORDS), where('financialYear', '==', currentYear)) : collection(db, COLLECTIONS.TEST_RECORDS);
    const unsubRecs = onSnapshot(recordsQ, (snap) => {
      if (isMounted) setRecords(snap.docs.map(d => ({id:d.id, ...d.data()})));
    });

    const isoQ = currentYear ? query(collection(db, 'isolationReports'), where('financialYear', '==', currentYear)) : collection(db, 'isolationReports');
    const unsubIso = onSnapshot(isoQ, (snap) => {
      if (isMounted) setIsolations(snap.docs.map(d => ({id:d.id, ...d.data()})));
    });

    // UX delay for deep recursive simulation feeling
    const timer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 850);

    return () => {
      isMounted = false;
      unsubCats(); unsubSubs(); unsubPlants(); unsubRecs(); unsubIso();
      clearTimeout(timer);
    };
  }, [currentYear]);

  // Outside click for custom multi-select dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Set default Sub-folder based on available subsystems
  React.useEffect(() => {
    if (subSystems.length > 0 && selectedFolders.length === 0) {
      setSelectedFolders([subSystems[0].id]);
    }
  }, [subSystems, selectedFolders.length]);

  const toggleFolder = (folderId: string) => {
    setSelectedFolders(prev => 
      prev.includes(folderId) 
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  // 2. Unsatisfactory Heatmap (Red Bar Chart for all system categories)
  const heatmapData = React.useMemo(() => {
    return categories.map(cat => {
      const failures = records.filter(r => 
        r.categoryId === cat.id && 
        (r.healthCondition === 'Unsatisfactory' || r.status === 'Unsatisfactory')
      ).length;

      return {
        categoryName: cat.name || 'Unknown',
        Unsatisfactory: failures
      };
    });
  }, [categories, records]);

  // 3. Isolation Report (Donut Chart)
  const isolationRatioData = React.useMemo(() => {
    const activeIsolations = isolations.filter(i => i.status === 'Active' && !i.deleted).length;
    const totalPlants = plants.length || 1; // Prevent Math.max 0 if no plants
    const normalSystems = Math.max(0, totalPlants - activeIsolations);

    return [
      { name: 'Active (Normal)', value: normalSystems, color: '#10B981' },
      { name: 'Isolated/Bypassed', value: activeIsolations, color: '#EF4444' }
    ];
  }, [isolations, plants]);

  const cardClass = theme === 'modern' 
    ? "bg-slate-900/40 backdrop-blur-lg border border-slate-700/50 shadow-lg" 
    : "bg-white border-gray-100 shadow-sm";

  const textColor = theme === 'modern' ? "text-slate-100" : "text-slate-900";
  const mutedTextColor = theme === 'modern' ? "text-slate-400" : "text-slate-500";
  const gridLineColor = theme === 'modern' ? "#475569" : "#CBD5E1";
  const tooltipBg = theme === 'modern' ? "#1E293B" : "#F3F4F6";

  if (loading) {
    return (
      <div className={cn("flex flex-col items-center justify-center min-h-[calc(100vh-80px)] space-y-4 -m-4 sm:-m-6 lg:-m-8 p-6 transition-colors duration-500", theme === 'modern' ? "bg-slate-900" : "bg-slate-50")}>
        <Activity className="h-10 w-10 text-[#C09532] animate-bounce" />
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 bg-[#C09532] rounded-full animate-pulse" />
          <div className="h-4 w-4 bg-[#C09532] rounded-full animate-pulse delay-75" />
          <div className="h-4 w-4 bg-[#C09532] rounded-full animate-pulse delay-150" />
        </div>
        <p className={cn("text-xs font-black uppercase tracking-widest animate-pulse", mutedTextColor)}>
          Performing recursive data mapping...
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-8 pb-12 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-80px)] transition-colors duration-500", theme === 'modern' ? "bg-slate-900" : "bg-slate-50")}>
      <div className={cn("flex flex-col md:flex-row md:items-end justify-between space-y-4 md:space-y-0 pb-4 border-b", theme === 'modern' ? "border-slate-800" : "border-gray-100")}>
        <div className="space-y-2">
          <h1 className={cn("text-3xl font-black tracking-tight flex items-center gap-3", textColor)}>
            <Activity className="h-8 w-8 text-[#C09532]" />
            System Analysis 
          </h1>
          <p className={cn("text-sm font-medium", mutedTextColor)}>Real-time recursive hierarchy tracking and plant compliance.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col space-y-2 relative" ref={dropdownRef}>
            <label className={cn("text-[10px] font-black uppercase tracking-widest", mutedTextColor)}>Active Sub-Folder Scope</label>
            <button 
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={cn(
                "flex items-center justify-between h-10 rounded-xl border px-4 text-sm font-semibold shadow-sm transition-colors outline-none min-w-[240px]",
                theme === 'modern' 
                  ? "bg-slate-900 border-[#D4AF37]/50 text-slate-100 hover:border-[#D4AF37]" 
                  : "bg-white border-blue-200 text-gray-900 hover:border-blue-500"
              )}
            >
              <span>
                {selectedFolders.length === 0 ? 'Select Folders...' : `${selectedFolders.length} Folders Selected`}
              </span>
              <ChevronDown className={cn("h-4 w-4", mutedTextColor)} />
            </button>
            
            {isDropdownOpen && (
              <div className={cn("absolute top-[60px] right-0 w-80 border rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[400px]", theme === 'modern' ? "bg-slate-900/90 backdrop-blur-xl border-slate-700/50" : "bg-white border-gray-200")}>
                <div className={cn("p-2 border-b flex justify-between items-center", theme === 'modern' ? "bg-slate-900/50 border-slate-700/50" : "bg-gray-50 border-gray-100")}>
                  <span className={cn("text-xs font-bold px-2", mutedTextColor)}>Sub-Folders</span>
                  <div className="space-x-2">
                    <button 
                      onClick={() => setSelectedFolders(subSystems.map(s => s.id))}
                      className="text-[10px] font-black uppercase tracking-widest text-[#C09532] hover:underline"
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setSelectedFolders([])}
                      className={cn("text-[10px] font-black uppercase tracking-widest hover:underline", theme === 'modern' ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-900")}
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto p-2 space-y-1">
                  {subSystems.map(sub => {
                    const isChecked = selectedFolders.includes(sub.id);
                    const parentCat = categories.find(c => c.id === sub.categoryId);
                    return (
                      <button
                        key={sub.id}
                        onClick={() => toggleFolder(sub.id)}
                        className={cn(
                          "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                          isChecked 
                            ? (theme === 'modern' ? "bg-slate-800/50" : "bg-blue-50") 
                            : (theme === 'modern' ? "hover:bg-slate-700/50" : "hover:bg-gray-50")
                        )}
                      >
                        <div className={cn(
                          "flex items-center justify-center h-4 w-4 rounded shrink-0 border transition-all duration-200",
                          theme === 'modern' 
                            ? (isChecked ? "bg-slate-900 border-[#D4AF37]" : "bg-slate-900 border-slate-600")
                            : (isChecked ? "bg-blue-500 border-blue-500" : "bg-white border-blue-300")
                        )}>
                          {isChecked && <Check className={cn("h-3 w-3", theme === 'modern' ? "text-[#D4AF37]" : "text-white")} strokeWidth={3} />}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className={cn("text-sm truncate", isChecked ? (theme === 'modern' ? "font-bold text-[#D4AF37]" : "font-bold text-blue-700") : (theme === 'modern' ? "font-medium text-slate-200" : "font-medium text-gray-700"))}>
                            {sub.name}
                          </span>
                          {parentCat && (
                            <span className={cn("text-[10px] uppercase tracking-wider truncate", theme === 'modern' ? "text-slate-500" : "text-gray-400")}>
                              {parentCat.name}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedFolders.length === 0 ? (
        <div className={cn("flex flex-col items-center justify-center p-12 border border-dashed rounded-2xl", theme === 'modern' ? "bg-slate-800/30 border-slate-700" : "bg-gray-50 border-gray-200")}>
          <Activity className={cn("h-10 w-10 mb-4", theme === 'modern' ? "text-slate-600" : "text-gray-300")} />
          <p className={cn("text-sm font-bold uppercase tracking-widest text-center", theme === 'modern' ? "text-slate-500" : "text-gray-400")}>Please select sub-folders to view progress graphs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {selectedFolders.map(folderId => {
            const sub = subSystems.find(s => s.id === folderId);
            const parentCat = categories.find(c => c.id === sub?.categoryId);
            const folderName = sub ? `${sub.name} ${parentCat ? `(${parentCat.name})` : ''}` : 'Unknown Folder';
            
            const relevantPlants = plants.filter(p => p.subSystemId === folderId);
            const relevantRecords = records.filter(r => r.subSystemId === folderId || relevantPlants.some(p => p.id === r.plantId));

            return (
              <SubFolderChart 
                key={folderId} 
                folderName={folderName} 
                plants={relevantPlants} 
                records={relevantRecords} 
                theme={theme}
                currentYear={currentYear}
              />
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card id="chart-unsatisfactory-heatmap" className={cn(cardClass, "border-t-4 border-t-red-500 group")}>
          <CardHeader className={cn("pb-4 flex flex-row items-start justify-between", theme === 'modern' ? "bg-slate-800/80" : "bg-gray-50/50")}>
            <div>
              <CardTitle className={cn("text-xs font-black uppercase tracking-widest", textColor)}>Unsatisfactory Heatmap</CardTitle>
              <p className={cn("text-[11px] font-medium mt-1", mutedTextColor)}>Global system category deficiency tracking.</p>
            </div>
            <button
              onClick={() => downloadJPG('chart-unsatisfactory-heatmap', 'Unsatisfactory Heatmap', currentYear)}
              className={cn("p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-md", theme === 'modern' ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-200 text-slate-500")}
              title="Download JPG"
            >
              <Download className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heatmapData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridLineColor} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: mutedTextColor }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="categoryName" type="category" tick={{ fontSize: 10, fill: textColor, fontWeight: 600 }} tickLine={false} axisLine={false} width={120} />
                  <RechartsTooltip cursor={{ fill: tooltipBg }} contentStyle={{ borderRadius: '12px', fontSize: '13px', border: `1px solid ${theme === 'modern' ? '#334155' : '#FECACA'}`, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'modern' ? '#0F172A' : '#fff', color: textColor }} />
                  <Bar dataKey="Unsatisfactory" fill="#EF4444" radius={[0, 4, 4, 0]} name="Unsatisfactory Systems">
                    {heatmapData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.Unsatisfactory > 0 ? '#EF4444' : (theme === 'modern' ? '#334155' : '#E5E7EB')} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Isolation Report (Donut Chart) */}
        <Card id="chart-isolation-ratio" className={cn(cardClass, "border-t-4 border-t-gray-800 group")}>
          <CardHeader className={cn("pb-4 flex flex-row items-start justify-between", theme === 'modern' ? "bg-slate-800/80" : "bg-gray-50/50")}>
            <div>
              <CardTitle className={cn("text-xs font-black uppercase tracking-widest", textColor)}>Isolation Ratio</CardTitle>
              <p className={cn("text-[11px] font-medium mt-1", mutedTextColor)}>Systems Currently Bypassed/Isolated vs Active.</p>
            </div>
            <button
              onClick={() => downloadJPG('chart-isolation-ratio', 'Isolation Ratio', currentYear)}
              className={cn("p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-md", theme === 'modern' ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-200 text-slate-500")}
              title="Download JPG"
            >
              <Download className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 w-full text-xs relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={isolationRatioData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                  >
                    {isolationRatioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', fontSize: '13px', border: `1px solid ${theme === 'modern' ? '#334155' : '#E5E7EB'}`, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'modern' ? '#0F172A' : '#fff', color: textColor }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-20px]">
                <span className={cn("text-3xl font-black", textColor)}>{isolationRatioData[1].value}</span>
                <span className={cn("text-[10px] uppercase font-bold tracking-widest", mutedTextColor)}>Isolated</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function SubFolderChart({ folderName, plants, records, theme, currentYear }: { folderName: string, plants: any[], records: any[], theme: 'modern' | 'traditional', currentYear: string }) {
  const chartData = React.useMemo(() => {
    return plants.map(p => {
      const pRecords = records.filter(r => r.plantId === p.id);
      const scope = pRecords.length;
      const actual = pRecords.filter((r: any) => r.status === 'Completed' || r.status === 'Approved & Locked').length;
      return {
        plantName: (p.name || p.code || 'Unknown Plant').substring(0, 15),
        Scope: scope,
        Actual: actual
      };
    });
  }, [plants, records]);

  const cardClass = theme === 'modern' 
    ? "bg-slate-900/40 backdrop-blur-lg border border-slate-700/50 shadow-lg" 
    : "bg-white border-gray-100 shadow-sm";

  const textColor = theme === 'modern' ? "text-slate-100" : "text-slate-900";
  const mutedTextColor = theme === 'modern' ? "text-slate-400" : "text-slate-500";
  const gridLineColor = theme === 'modern' ? "#475569" : "#CBD5E1";
  const tooltipBg = theme === 'modern' ? "#1E293B" : "#F3F4F6";
  const scopeBarColor = theme === 'modern' ? "#475569" : "#9CA3AF";

  const chartId = `chart-${(folderName || '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

  return (
    <Card id={chartId} className={cn(cardClass, "overflow-hidden border-t-4 border-t-[#C09532] group")}>
      <CardHeader className={cn("pb-4 flex flex-row items-start justify-between", theme === 'modern' ? "bg-slate-800/80" : "bg-gray-50/50")}>
        <div>
          <CardTitle className={cn("text-xs font-black uppercase tracking-widest truncate max-w-[200px] sm:max-w-xs", textColor)}>{folderName}</CardTitle>
          <p className={cn("text-[11px] font-medium mt-1", mutedTextColor)}>Live test tag mapping.</p>
        </div>
        <button
          onClick={() => downloadJPG(chartId, folderName, currentYear)}
          className={cn("p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-md", theme === 'modern' ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-200 text-slate-500")}
          title="Download JPG"
        >
          <Download className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-64 w-full text-xs">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridLineColor} />
                <XAxis dataKey="plantName" tick={{ fontSize: 11, fill: mutedTextColor, fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: mutedTextColor }} tickLine={false} axisLine={false} />
                <RechartsTooltip cursor={{ fill: tooltipBg }} contentStyle={{ borderRadius: '12px', fontSize: '13px', border: `1px solid ${theme === 'modern' ? '#334155' : '#E5E7EB'}`, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'modern' ? '#0F172A' : '#fff', color: textColor }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                <Bar dataKey="Scope" fill={scopeBarColor} radius={[4, 4, 0, 0]} name="Scope (Total Target)" maxBarSize={40} />
                <Bar dataKey="Actual" fill="#C09532" radius={[4, 4, 0, 0]} name="Actual (Completed)" maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className={cn("flex flex-col items-center justify-center h-full font-medium space-y-2 rounded-2xl border border-dashed", theme === 'modern' ? "bg-slate-800/40 border-slate-700 text-slate-500" : "bg-gray-50 border-gray-100 text-gray-400")}>
              <Activity className={cn("h-8 w-8", theme === 'modern' ? "text-slate-600" : "text-gray-300")} />
              <span className="text-center">No plants or records found.</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

