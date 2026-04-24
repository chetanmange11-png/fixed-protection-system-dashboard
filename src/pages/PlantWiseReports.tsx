import * as React from 'react';
import { 
  FileText, Download, Building2, Search, 
  CheckCircle2, AlertTriangle, Clock, Filter as FilterIcon,
  Archive, ChevronRight, Folder, Calendar, History,
  Database,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AppInput } from '../components/ui/AppInput';
import { Badge } from '../components/ui/Badge';
import { dbApi } from '../db/storage';
import { Plant, TestRecord, FinancialYear, MaintenanceCycle, HistoricalReport, SystemCategory } from '../types';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function PlantWiseReports() {
  const years: FinancialYear[] = ['2024-25', '2025-26', '2026-27', '2027-28', '2028-29', '2029-30'];
  const periods = ['Q1', 'Q2', 'Q3', 'Q4', 'First Semiannual', 'Second Semiannual', 'Annual'];

  const [plants, setPlants] = React.useState<Plant[]>([]);
  const [categories, setCategories] = React.useState<SystemCategory[]>([]);
  const [selectedPlantId, setSelectedPlantId] = React.useState<string>('');
  const [selectedFY, setSelectedFY] = React.useState<FinancialYear>('2024-25');
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>('All');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('All');
  
  const [records, setRecords] = React.useState<TestRecord[]>([]);
  const [historicalReports, setHistoricalReports] = React.useState<HistoricalReport[]>([]);
  const [viewMode, setViewMode] = React.useState<'current' | 'archive'>('current');
  const [selectedArchive, setSelectedArchive] = React.useState<HistoricalReport | null>(null);
  
  // Tree state
  const [expandedYears, setExpandedYears] = React.useState<string[]>([]);

  const loadData = React.useCallback(async () => {
    await dbApi.init();
    const activeYear = await dbApi.getActiveYear();
    const [allPlants, allCategories, allHistory] = await Promise.all([
      dbApi.getPlants(),
      dbApi.getCategories(),
      dbApi.getHistoricalReports()
    ]);
    setSelectedFY(activeYear);
    setPlants(allPlants);
    setCategories(allCategories);
    setHistoricalReports(allHistory);
    setExpandedYears([activeYear]);
  }, []);

  React.useEffect(() => {
    loadData();
    window.addEventListener('fy-change', loadData);
    return () => window.removeEventListener('fy-change', loadData);
  }, [loadData]);

  // For reactive filtering, we need to fetch records asynchronously
  React.useEffect(() => {
    const fetchRecords = async () => {
      if (!selectedPlantId) {
        setRecords([]);
        return;
      }
      const all = await dbApi.getTestRecords();
      const filtered = all.filter(r => {
        const matchPlant = r.plantId === selectedPlantId;
        const matchPeriod = selectedPeriod === 'All' || r.cycle === selectedPeriod;
        const matchCat = selectedCategory === 'All' || r.categoryId === selectedCategory;
        return matchPlant && matchPeriod && matchCat;
      });
      setRecords(filtered);
    };
    fetchRecords();
  }, [selectedPlantId, selectedPeriod, selectedCategory]);

  const filteredRecords = records;

  const stats = {
    satisfactory: filteredRecords.filter(r => r.healthCondition === 'Satisfactory').length,
    unsatisfactory: filteredRecords.filter(r => r.healthCondition === 'Unsatisfactory').length,
    pending: filteredRecords.filter(r => r.status === 'Pending').length
  };

  const handleArchive = async () => {
    if (!selectedPlantId || filteredRecords.length === 0) return;
    
    const plant = plants.find(p => p.id === selectedPlantId);
    const category = categories.find(c => c.id === selectedCategory);
    
    const report: HistoricalReport = {
      id: Math.random().toString(36).substr(2, 9),
      financialYear: selectedFY,
      period: (selectedPeriod === 'All' ? 'Annual' : selectedPeriod) as MaintenanceCycle,
      plantId: selectedPlantId,
      plantName: plant?.name || 'Unknown',
      categoryId: selectedCategory !== 'All' ? selectedCategory : undefined,
      categoryName: category?.name,
      recordCount: filteredRecords.length,
      satisfactoryCount: stats.satisfactory,
      unsatisfactoryCount: stats.unsatisfactory,
      data: filteredRecords,
      createdAt: new Date().toISOString()
    };
    
    await dbApi.saveHistoricalReport(report);
    setHistoricalReports(await dbApi.getHistoricalReports());
    console.log('Report successfully archived to history.');
  };

  const exportPDF = (dataToExport: TestRecord[], title: string) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title.toUpperCase(), 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    
    const tableData = dataToExport.map(r => [
      r.categoryName,
      r.tagNumber,
      r.location,
      r.cycle,
      r.status,
      r.healthCondition,
      r.deficiency || 'None'
    ]);

    (doc as any).autoTable({
      startY: 35,
      head: [['Category', 'Tag No.', 'Location', 'Cycle', 'Status', 'Health', 'Deficiencies']],
      body: tableData,
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`FPS_Report_${title.replace(/\s+/g, '_')}.pdf`);
  };

  const toggleYear = (year: string) => {
    setExpandedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar Archive Tree */}
      <aside className="w-72 flex flex-col space-y-4 shrink-0">
        <Card className="flex-1 flex flex-col p-0 overflow-hidden">
          <CardHeader className="p-4 border-b border-gray-100 flex flex-row items-center space-x-2 bg-gray-50/50">
            <History className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Historical Archives</CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {years.map(year => (
              <div key={year} className="space-y-1">
                <button 
                  onClick={() => toggleYear(year)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 text-sm font-semibold text-gray-700"
                >
                  <div className="flex items-center">
                    <Folder className={cn("h-4 w-4 mr-2", expandedYears.includes(year) ? "text-blue-500" : "text-gray-400")} />
                    <span>FY {year}</span>
                  </div>
                  {expandedYears.includes(year) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
                
                {expandedYears.includes(year) && (
                  <div className="pl-4 space-y-1 border-l-2 border-blue-50 ml-3">
                    {historicalReports.filter(r => r.financialYear === year).length > 0 ? (
                      historicalReports.filter(r => r.financialYear === year).map(report => (
                        <button
                          key={report.id}
                          onClick={() => {
                            setSelectedArchive(report);
                            setViewMode('archive');
                          }}
                          className={cn(
                            "w-full text-left p-2 rounded-md text-xs transition-all",
                            selectedArchive?.id === report.id && viewMode === 'archive'
                              ? "bg-blue-600 text-white font-medium"
                              : "text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold truncate">{report.plantName}</span>
                            <span className="opacity-70">{report.period}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <span className="text-[10px] text-gray-400 pl-2">No archives found</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </aside>

      {/* Main Report View */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        {/* Advanced Filter Engine */}
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center space-x-3">
              <Database className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Consolidated Filter Engine</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Retrieve current testing or archived historical records</p>
              </div>
            </div>
            <div className="flex p-1 bg-gray-100 rounded-xl">
              <button 
                onClick={() => setViewMode('current')}
                className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", viewMode === 'current' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500")}
              >
                Current Data
              </button>
              <button 
                disabled={!selectedArchive}
                onClick={() => setViewMode('archive')}
                className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", viewMode === 'archive' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 cursor-not-allowed")}
              >
                Archive Viewer
              </button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50/50 p-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Analysis Period</label>
              <div className="flex items-center space-x-2 h-10 px-3 bg-white border border-gray-200 rounded-lg">
                <History className="h-3 w-3 text-blue-500" />
                <span className="text-xs font-bold text-blue-600">FY {selectedFY}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Plant / ID</label>
              <select 
                className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
                value={selectedPlantId}
                onChange={(e) => {
                  setSelectedPlantId(e.target.value);
                  setViewMode('current');
                }}
              >
                <option value="">Select Plant...</option>
                {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Report Period</label>
              <select 
                className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="All">Full Analysis</option>
                {periods.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">System Category</label>
              <select 
                className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="All">All Systems</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </CardContent>
          <div className="px-6 pb-6 flex items-center justify-between border-t border-gray-100 pt-4 bg-gray-50/20">
            <div className="text-[10px] text-gray-500 font-medium">
               Found {filteredRecords.length} records matching current filter scope.
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" size="sm" onClick={() => {
                const data = filteredRecords.map(r => ({
                  FY: selectedFY,
                  Plant: r.plantName,
                  Category: r.categoryName,
                  Tag: r.tagNumber,
                  Date: r.dateOfTesting,
                  Status: r.status,
                  Health: r.healthCondition,
                  Deficiency: r.deficiency
                }));
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Export');
                XLSX.writeFile(wb, `FPS_Extract_${selectedFY}_${new Date().getTime()}.xlsx`);
              }}>
                <Download className="h-4 w-4 mr-2" /> Global Excel Extract
              </Button>
              {viewMode === 'current' && selectedPlantId && (
                <Button onClick={handleArchive} variant="secondary" size="sm" className="gap-2">
                  <Archive className="h-4 w-4" />
                  Save as Historical Snapshot
                </Button>
              )}
            </div>
          </div>
        </Card>

        {viewMode === 'archive' && selectedArchive ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <History className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-bold">ARC-HIST: {selectedArchive.plantName} ({selectedArchive.financialYear})</h2>
              </div>
              <Button onClick={() => exportPDF(selectedArchive.data, `${selectedArchive.plantName} History`)}>
                <Download className="h-4 w-4 mr-2" /> Export Archive PDF
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <Card className="bg-blue-50">
                <CardContent className="pt-6">
                  <p className="text-xs text-blue-600 font-bold">TOTAL RECORDS</p>
                  <p className="text-3xl font-black">{selectedArchive.recordCount}</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50">
                <CardContent className="pt-6">
                  <p className="text-xs text-green-600 font-bold">SATISFACTORY</p>
                  <p className="text-3xl font-black">{selectedArchive.satisfactoryCount}</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50">
                <CardContent className="pt-6">
                  <p className="text-xs text-red-600 font-bold">DEFICIENCIES</p>
                  <p className="text-3xl font-black">{selectedArchive.unsatisfactoryCount}</p>
                </CardContent>
              </Card>
            </div>
            <ReportTable data={selectedArchive.data} />
          </div>
        ) : viewMode === 'current' && selectedPlantId ? (
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Current Testing Snapshot</h2>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => exportPDF(filteredRecords, 'Current Snapshot')}>
                    <Download className="h-4 w-4 mr-2" /> PDF Export
                  </Button>
                </div>
             </div>
             <ReportTable data={filteredRecords} />
          </div>
        ) : (
          <Card className="p-24 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-6 bg-gray-50 rounded-full">
              <FilterIcon className="h-16 w-16 text-gray-200" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Engine Ready</h3>
              <p className="text-gray-500 max-w-sm">Please use the chained filters above or select an archive from the tree to retrieve protection system data.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ReportTable({ data }: { data: TestRecord[] }) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-gray-50 text-gray-400 uppercase font-semibold border-b border-gray-100">
              <th className="px-6 py-4">System Path</th>
              <th className="px-6 py-4">Tag</th>
              <th className="px-6 py-4">Cycle</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Health</th>
              <th className="px-6 py-4">Finding / Deficiency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                   <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{r.categoryName}</span>
                      <span className="text-[10px] text-gray-400">{r.subSystemName}</span>
                   </div>
                </td>
                <td className="px-6 py-4 font-mono font-bold text-blue-600">{r.tagNumber}</td>
                <td className="px-6 py-4">
                   <Badge variant="info">{r.cycle}</Badge>
                </td>
                <td className="px-6 py-4">
                   <Badge variant={r.status === 'Completed' ? 'success' : 'warning'}>{r.status}</Badge>
                </td>
                <td className="px-6 py-4">
                   <Badge variant={r.healthCondition === 'Satisfactory' ? 'success' : 'danger'}>{r.healthCondition}</Badge>
                </td>
                <td className="px-6 py-4 text-gray-500 italic">
                   {r.deficiency || 'Optimal'}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  No records stored for this filter combination.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
