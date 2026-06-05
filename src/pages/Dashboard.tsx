import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, Plus, Search, Filter, Download, 
  Edit3, Trash2, Link as LinkIcon, FileCheck,
  ChevronRight, Home, Building2, Layers, Folder,
  RefreshCw, X, Calendar, Grid
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AppInput } from '../components/ui/AppInput';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { Breadcrumbs } from '../components/shared/Breadcrumbs';
import { EquipmentHistoryModal } from '../components/shared/EquipmentHistoryModal';
import { AlertsPanel } from '../components/dashboard/AlertsPanel';
import { DashboardAnalytics } from '../components/dashboard/DashboardAnalytics';
import { cn } from '../lib/utils';
import { collection, query, where, onSnapshot, writeBatch, doc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { dbApi } from '../db/storage';
import { useGlobalStore } from '../store/useGlobalStore';
import { createDocument, updateDocument } from '../services/firestoreService';
import { 
  TestRecord, Plant, SubSystem, SystemCategory, 
  MaintenanceCycle, TestingStatus, HealthCondition, ScheduleMonth, ChecklistItem,
  FinancialYear, Frequency 
} from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { AdminDeleteGateModal } from '../components/shared/AdminDeleteGateModal';

interface SystemCalendarProps {
  records: TestRecord[];
  onDateClick: (records: TestRecord[]) => void;
}

const SystemCalendar = ({ records, onDateClick }: SystemCalendarProps) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleString('default', { month: 'long' });

  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const days = [];
  // Spacers
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  // Actual days
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  const getDayRecords = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return records.filter(r => (r.testDate || r.dateOfTesting) === dateStr);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-gray-50">
        <h2 className="text-xl font-black text-gray-900 tracking-tight">{monthName} {year}</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="h-10 w-10">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="h-10 w-10">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-7 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {days.map((day, idx) => {
            if (day === null) return <div key={`spacer-${idx}`} className="aspect-square bg-gray-50/30 rounded-xl" />;
            
            const dayRecords = getDayRecords(day);
            const hasRecords = dayRecords.length > 0;

            return (
              <button
                key={day}
                onClick={() => hasRecords && onDateClick(dayRecords)}
                className={cn(
                  "aspect-square p-2 rounded-xl border transition-all flex flex-col items-center justify-center gap-1",
                  hasRecords 
                    ? "bg-white border-[#C09532]/20 hover:border-[#C09532] hover:shadow-md cursor-pointer active:scale-95" 
                    : "bg-white border-gray-50 text-gray-300"
                )}
              >
                <span className={cn("text-sm font-bold", hasRecords ? "text-gray-900" : "text-gray-300")}>{day}</span>
                {hasRecords && (
                  <div className="flex flex-wrap justify-center gap-0.5 max-w-full">
                    {dayRecords.slice(0, 4).map((r, i) => (
                      <div 
                        key={r.id} 
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          r.status === 'Approved & Locked' || r.status === 'Completed' ? "bg-green-500" :
                          r.status === 'Unsatisfactory' ? "bg-red-500" : "bg-amber-500"
                        )} 
                      />
                    ))}
                    {dayRecords.length > 4 && <span className="text-[8px] font-black leading-none text-gray-400">+{dayRecords.length - 4}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const incrementCycleYear = (current: string) => {
  if (current.includes('-')) {
    const parts = current.split('-');
    return `${parseInt(parts[0]) + 1}-${parseInt(parts[1]) + 1}`;
  }
  return String(parseInt(current) + 1);
};

export default function Dashboard() {
  const { categoryId, subSystemId, plantId } = useParams();
  const navigate = useNavigate();
  
  const [plant, setPlant] = React.useState<Plant | null>(null);
  const [subSystem, setSubSystem] = React.useState<SubSystem | null>(null);
  const [category, setCategory] = React.useState<SystemCategory | null>(null);
  const [records, setRecords] = React.useState<TestRecord[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('All');
  const [healthFilter, setHealthFilter] = React.useState<string>('All');
  const [users, setUsers] = React.useState<{id: string, name: string}[]>([]);
  const [checklistMaster, setChecklistMaster] = React.useState<ChecklistItem[]>([]);
  const [allPlants, setAllPlants] = React.useState<Plant[]>([]);
  const [allSubSystems, setAllSubSystems] = React.useState<SubSystem[]>([]);
  const [activeYear, setActiveYear] = React.useState<FinancialYear>('2024-25');
  const [selectedYear, setSelectedYear] = React.useState<string>('2024-25');
  const { currentUser: user } = useGlobalStore();
  const userRole = user?.role || 'Technician';
  const [viewMode, setViewMode] = React.useState<'list' | 'calendar'>('list');
  const [selectedDateRecords, setSelectedDateRecords] = React.useState<TestRecord[] | null>(null);

  // Dynamic Frequency and Tab State
  const [frequenciesBySub, setFrequenciesBySub] = React.useState<Record<string, Frequency>>(() => {
    const saved = localStorage.getItem('frequenciesBySub');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Fallback migration from old single state
    const old = localStorage.getItem('selectedFrequency') as Frequency;
    if (old && subSystemId) {
      return { [subSystemId]: old };
    }
    return {};
  });

  const selectedFrequency = React.useMemo(() => {
    return (subSystemId && frequenciesBySub[subSystemId]) 
      ? frequenciesBySub[subSystemId] 
      : 'Semi-Annual';
  }, [subSystemId, frequenciesBySub]);

  const updateSelectedFrequency = React.useCallback((newFreq: Frequency) => {
    if (subSystemId) {
      const updated = { ...frequenciesBySub, [subSystemId]: newFreq };
      setFrequenciesBySub(updated);
      localStorage.setItem('frequenciesBySub', JSON.stringify(updated));
    }
  }, [subSystemId, frequenciesBySub]);

  const [activeTab, setActiveTab] = React.useState<MaintenanceCycle>('First Semiannual');

  const tabsForFrequency = React.useMemo(() => {
    switch(selectedFrequency) {
      case 'Quarterly': return ['Q1', 'Q2', 'Q3', 'Q4'] as MaintenanceCycle[];
      case 'Semi-Annual': return ['First Semiannual', 'Second Semiannual'] as MaintenanceCycle[];
      case 'Annual': return ['Annual'] as MaintenanceCycle[];
      case 'Bi-Annual': return ['Bi-Annual'] as MaintenanceCycle[];
      default: return [];
    }
  }, [selectedFrequency]);

  React.useEffect(() => {
    if (tabsForFrequency.length > 0 && !tabsForFrequency.includes(activeTab)) {
      setActiveTab(tabsForFrequency[0]);
    }
  }, [tabsForFrequency]);

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const recordsPerPage = 10;
  
  const [isNewRecord, setIsNewRecord] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = React.useState(false);
  const [lastSavedRecord, setLastSavedRecord] = React.useState<TestRecord | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);
  const [carryForwardPassword, setCarryForwardPassword] = React.useState('');
  const [passwordError, setPasswordError] = React.useState('');
  const [deleteGate, setDeleteGate] = React.useState<{ isOpen: boolean; record: TestRecord } | null>(null);
  const [editingRecord, setEditingRecord] = React.useState<TestRecord | null>(null);
  const [formData, setFormData] = React.useState<Partial<TestRecord>>({
    status: 'Pending',
    healthCondition: 'Satisfactory',
    testDate: new Date().toISOString().split('T')[0],
    checklist: []
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    await dbApi.init();
    const [plants, subs, allCats, allUsers, checklist, year] = await Promise.all([
      dbApi.getPlants(),
      dbApi.getSubSystems(),
      dbApi.getCategories(),
      dbApi.getUsers(),
      dbApi.getChecklistMaster(),
      dbApi.getActiveYear()
    ]);
    
    setUsers(allUsers.filter(u => u.role === 'Admin' || u.role === 'Technician'));
    setAllPlants(plants);
    setAllSubSystems(subs);
    setChecklistMaster(checklist);
    setActiveYear(year as FinancialYear);
    setPlant(plants.find(p => p.id === plantId) || null);
    setSubSystem(subs.find(s => s.id === subSystemId) || null);
    setCategory(allCats.find(c => c.id === categoryId) || null);
  }, [plantId, subSystemId, categoryId]);

  React.useEffect(() => {
    if (activeYear) {
      setSelectedYear(activeYear);
    }
  }, [activeYear]);

  React.useEffect(() => {
    load();
    window.addEventListener('fy-change', load);
    return () => window.removeEventListener('fy-change', load);
  }, [load]);

  React.useEffect(() => {
    if (!plantId || !subSystemId || !selectedYear) return;
    
    const q = query(
      collection(db, 'testRecords'), 
      where('plantId', '==', plantId),
      where('subSystemId', '==', subSystemId),
      where('financialYear', '==', selectedYear)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveRecords = snapshot.docs.map(doc => doc.data() as TestRecord);
      setRecords(liveRecords);
    }, (error) => {
      alert("Firebase Error: " + error.message);
    });
    
    return () => unsubscribe();
  }, [plantId, subSystemId, selectedYear]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, attachmentUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

    const handleOpenModal = (record?: TestRecord) => {
      try {
        if (record) {
          setEditingRecord(record);
          setIsNewRecord(false);
        } else {
          setEditingRecord({
            status: 'Pending',
            healthCondition: 'Satisfactory',
            cycle: activeTab,
            testDate: new Date().toISOString().split('T')[0],
            deficiency: '',
            remarks: '',
            testerName: '',
            plantId: plantId || plant?.id || '',
            subSystemId: subSystemId || subSystem?.id || '',
            plantName: plant?.name || '',
            subSystemName: subSystem?.name || '',
            folder: subSystem?.name || '',
            financialYear: selectedYear,
            year: selectedYear,
            checklist: checklistMaster.map(item => ({ checklistId: item.id, status: false }))
          } as TestRecord);
          setIsNewRecord(true);
        }
        setIsModalOpen(true);
      } catch (err) {
        console.error("Error opening modal:", err);
      }
    };

  const triggerAutoGeneration = async (record: TestRecord) => {
    // 1. Strict Target Mapping (Universal Logic)
    let targetCycleName = '';
    let monthsToAdd = 0;
    let nextYear = record.year || selectedYear;
    const currentTab = String(record.cycleName || record.cycle).trim().toUpperCase();

    switch (currentTab) {
      case 'FIRST SEMIANNUAL': 
        targetCycleName = 'Second Semiannual'; 
        monthsToAdd = 6;
        break;
      case 'SECOND SEMIANNUAL': 
        targetCycleName = 'First Semiannual'; 
        monthsToAdd = 6;
        nextYear = incrementCycleYear(record.year || selectedYear);
        break;
      case 'Q1': targetCycleName = 'Q2'; monthsToAdd = 3; break;
      case 'Q2': targetCycleName = 'Q3'; monthsToAdd = 3; break;
      case 'Q3': targetCycleName = 'Q4'; monthsToAdd = 3; break;
      case 'Q4': 
        targetCycleName = 'Q1'; 
        monthsToAdd = 3;
        nextYear = incrementCycleYear(record.year || selectedYear);
        break;
      case 'ANNUAL': 
      case 'YEARLY': 
        targetCycleName = 'Annual'; 
        monthsToAdd = 12;
        nextYear = incrementCycleYear(record.year || selectedYear);
        break;
      case 'BIANNUAL': 
        targetCycleName = 'Bi-Annual'; 
        monthsToAdd = 24;
        break;
      default: return; 
    }

    const baseDate = new Date(record.testDate || record.dateOfTesting || new Date());
    baseDate.setMonth(baseDate.getMonth() + monthsToAdd);
    const nextDateStr = baseDate.toISOString().split('T')[0];

    const futureId = Math.random().toString(36).substring(2, 11);
    const futureRecord: TestRecord = {
      ...record,
      id: futureId,
      status: 'Pending',
      cycle: targetCycleName as MaintenanceCycle,
      cycleName: targetCycleName,
      dateOfTesting: nextDateStr,
      testDate: nextDateStr,
      year: nextYear,
      testerName: '',
      testedBy: '',
      plantPersonnel: '',
      attachmentUrl: '', 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      folder: record.folder || record.subSystemName || '',
      remarks: record.remarks || '',
      deficiency: record.deficiency || ''
    };

    await dbApi.saveTestRecord(futureRecord);
  };

  const handleApproveRecord = async (record: TestRecord) => {
    const tId = toast.loading('Approving and locking record...');
    try {
      const updatedRecord: TestRecord = {
        ...record,
        status: 'Approved & Locked',
        updatedAt: new Date().toISOString()
      };
      await dbApi.saveTestRecord(updatedRecord);
      await triggerAutoGeneration(updatedRecord);
      toast.success('Record Approved & Locked! Next cycle generated.', { id: tId });
    } catch (err: any) {
      toast.error('Approval failed: ' + err.message, { id: tId });
    }
  };

  const performDeleteRecord = async (record: TestRecord) => {
    try {
      await createDocument('RECYCLE_BIN', {
        ...record,
        deletedAt: new Date().toISOString(),
        originalCollection: 'TEST_RECORDS'
      });
      await dbApi.deleteTestRecord(record.id);
    } catch (error: any) {
      toast.error("Failed to delete record: " + error.message);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setHealthFilter('All');
    setCurrentPage(1);
  };

  const handleManualRefresh = async () => {
    const tId = toast.loading('Refreshing data...');
    try {
      await load();
      toast.success('Data synchronized!', { id: tId });
    } catch (err: any) {
      toast.error('Sync failed: ' + err.message, { id: tId });
    }
  };

  const handleCarryForward = async () => {
    console.log("Executing carry forward logic...");
    try {
      // 1. Strict Target Mapping (Universal Logic)
      let targetCycleName = '';
      let monthsToAdd = 0;
      let nextYear = selectedYear;
      const currentTab = String(activeTab).trim().toUpperCase();

      // Intra-Year Sync ONLY
      switch (currentTab) {
        case 'FIRST SEMIANNUAL': 
          targetCycleName = 'Second Semiannual'; 
          monthsToAdd = 6;
          break;
        case 'Q1': 
          targetCycleName = 'Q2'; 
          monthsToAdd = 3;
          break;
        case 'Q2': 
          targetCycleName = 'Q3'; 
          monthsToAdd = 3;
          break;
        case 'Q3': 
          targetCycleName = 'Q4'; 
          monthsToAdd = 3;
          break;
        case 'SECOND SEMIANNUAL':
        case 'Q4':
        case 'ANNUAL':
        case 'YEARLY':
        case 'BIANNUAL':
          alert("Cannot carry forward across financial years locally. Please use the Global 'Initialize New Cycle' button in the sidebar.");
          return;
        default: 
          console.warn(`Unrecognized tab name: "${activeTab}"`);
          alert(`Error: Unrecognized tab name: "${activeTab}"`);
          return;
      }

      // 2. Get Source Data - Universal Carry Forward (All Statuses)
      const recordsToCarry = activeTabRecords.filter(r => {
        const yearMatches = String(r.year || '') === String(selectedYear) || String(r.year || '') === String(selectedYear).split('-')[0];
        return yearMatches;
      });
      if (recordsToCarry.length === 0) {
        console.warn("No records to carry forward for selected year.");
        alert('No records to carry forward for the selected year.');
        return;
      }

      console.log(`Carrying forward ${recordsToCarry.length} records to ${targetCycleName} (${nextYear})...`);

      // 3. Firebase Batch Process (Wipe and Replace)
      const batch = writeBatch(db);

      // THE WIPE: Delete old Pending records in target cycle
      const wipeQuery = query(
        collection(db, 'testRecords'),
        where('plantId', '==', plantId),
        where('subSystemId', '==', subSystemId),
        where('financialYear', '==', activeYear),
        where('cycleName', '==', targetCycleName),
        where('year', '==', nextYear),
        where('status', '==', 'Pending')
      );
      
      const wipeSnap = await getDocs(wipeQuery);
      console.log(`Wiping ${wipeSnap.size} existing pending records...`);
      wipeSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // THE REPLACE: Insert New Data
      recordsToCarry.forEach((record) => {
        const baseDate = new Date(record.testDate || record.dateOfTesting || new Date());
        baseDate.setMonth(baseDate.getMonth() + monthsToAdd);
        const nextDateStr = baseDate.toISOString().split('T')[0];

        const futureId = Math.random().toString(36).substring(2, 11);
        const futureRecord: TestRecord = {
          ...record,
          id: futureId,
          status: 'Pending',
          cycle: targetCycleName as MaintenanceCycle,
          cycleName: targetCycleName,
          dateOfTesting: nextDateStr,
          testDate: nextDateStr,
          year: nextYear,
          testerName: '',
          testedBy: '',
          plantPersonnel: '',
          attachmentUrl: '', 
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          folder: record.folder || record.subSystemName || '',
          remarks: record.remarks || '',
          deficiency: record.deficiency || ''
        };

        const docRef = doc(collection(db, 'testRecords'), futureId);
        batch.set(docRef, futureRecord);
      });

      // 4. Commit & Sync
      await batch.commit();
      console.log("Carry forward commit successful.");
      alert(`Successfully carried forward to ${targetCycleName} (${nextYear})!`);
      
    } catch (error: any) {
      console.error("Carry forward failed:", error);
      alert("Failed to carry forward: " + error.message);
    }
  };

  const handlePasswordSubmit = async () => {
    console.log("Submit clicked.");
    setPasswordError('');
    
    try {
      const currentUser = user;
      
      if (!currentUser) {
        setPasswordError('No active user session');
        return;
      }

      if (currentUser.role !== 'Admin') {
        setPasswordError('Insufficient privileges. Admin role required.');
        return;
      }

      let isPasswordValid = false;
      
      try {
        if (currentUser.id === 'admin-id') {
          const settings = await dbApi.getSettings();
          if (carryForwardPassword === (settings.adminPassword || 'admin')) {
            isPasswordValid = true;
          }
        } else {
          const userSnap = await getDoc(doc(db, 'users', currentUser.id));
          if (userSnap.exists() && userSnap.data().password === carryForwardPassword) {
            isPasswordValid = true;
          }
        }
      } catch (e: any) {
        console.error('Failed at fetching user. ', e);
        setPasswordError("fetching user error: " + (e.message || "Unknown error"));
        return;
      }
      
      if (!isPasswordValid) {
        setPasswordError('Invalid admin password');
        return;
      }

      console.log("Password correct. Triggering handleCarryForward...");
      setIsPasswordModalOpen(false);
      setCarryForwardPassword('');
      setPasswordError('');
      handleCarryForward();
    } catch (e) {
      console.error("Failed to verify password:", e);
      setPasswordError("Error verifying password.");
    }
  };

  const generateFullReportPdf = () => {
    try {
      if (filteredRecords.length === 0) {
        alert("No records found to export.");
        return;
      }

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      filteredRecords.forEach((record, index) => {
        if (index > 0) {
          doc.addPage();
        }

        doc.setFillColor(31, 41, 55); 
        doc.rect(0, 0, pageWidth, 45, 'F');
        
        doc.setFillColor(192, 149, 50); 
        doc.rect(0, 45, pageWidth, 3, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('RELIANCE INDUSTRIES LIMITED - FIRE DEPARTMENT', pageWidth / 2, 18, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(209, 213, 219); 
        doc.text(`REPORT ID: PS-${(record.id || '').toUpperCase().slice(0, 8)}`, pageWidth - 15, 12, { align: 'right' });
        
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text(`${record.plantName || 'N/A'} UNIT - ${record.subSystemName || 'N/A'}`, pageWidth / 2, 30, { align: 'center' });
        
        doc.setFontSize(9);
        doc.text(`SYSTEM TYPE: ${category?.name || 'N/A'} | PERIOD: SEMI-ANNUAL`, pageWidth / 2, 38, { align: 'center' });

        doc.setTextColor(31, 41, 55);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('I. BASIC SYSTEM INFORMATION', 15, 60);

        const basicInfoData = [
          ["Plant Name", record.plantName || "N/A", "Folder (Sub-System)", record.folder || record.subSystemName || "N/A"],
          ["Tag Number", record.tagNumber || "N/A", "Location", record.location || "N/A"],
          ["System Type", "Fixed System", "Testing Cycle", record.cycle || record.cycleName || "N/A"]
        ];

        autoTable(doc, {
          startY: 65,
          head: [["Field", "Details", "Field", "Details"]],
          body: basicInfoData,
          theme: 'grid',
          headStyles: { fillColor: [192, 149, 50], textColor: [255, 255, 255], fontStyle: "bold" },
          styles: { fontSize: 8.5, cellPadding: 3, textColor: [55, 65, 81] }
        });

        const testContextY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('II. AUDIT & EXECUTION DETAILS', 15, testContextY);

        const statusData = [
          ["Execution Date", new Date().toISOString().split("T")[0], "Test Date", record.testDate || record.dateOfTesting || "N/A"],
          ["Tester Name", record.testerName || record.testedBy || "N/A", "Plant Personnel", record.plantPersonnel || "N/A"]
        ];

        autoTable(doc, {
          startY: testContextY + 5,
          head: [["Field", "Details", "Field", "Details"]],
          body: statusData,
          theme: 'grid',
          headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105] },
          styles: { fontSize: 8.5, cellPadding: 3 }
        });

        const detailY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(31, 41, 55);
        doc.text('III. ITEMIZED DEFECT PROTOCOL', 15, detailY);

        const detailData: any[] = [];
        if (record.detailedChecklist) {
          Object.entries(record.detailedChecklist).forEach(([id, data]) => {
            if ((data as any).hasDefect) {
              const label = id.replace(/([A-Z])/g, ' $1').toUpperCase();
              detailData.push([detailData.length + 1, label, 'Defect Observed']);
            }
          });
        }
        
        if (detailData.length === 0) {
          detailData.push([
            { content: 'No defects observed.', colSpan: 3, styles: { halign: 'center', fontStyle: 'italic' } }
          ]);
        }

        autoTable(doc, {
          startY: detailY + 5,
          head: [['#', 'Defective Component', 'Status']],
          body: detailData,
          theme: 'grid',
          headStyles: { fillColor: [254, 226, 226], textColor: [153, 27, 27] },
          styles: { fontSize: 8.5, cellPadding: 3 }
        });

        let qualitativeY = (doc as any).lastAutoTable.finalY + 10;
        
        if (qualitativeY > 200) {
          doc.addPage();
          qualitativeY = 20;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text('IV. QUALITATIVE FINDINGS & STATUS', 15, qualitativeY);

        const statusColorArr: [number, number, number] = record.status === "Completed" || record.status === "Approved & Locked" ? [16, 185, 129] : [239, 68, 68];
        const healthColorArr: [number, number, number] = record.healthCondition === "Satisfactory" ? [16, 185, 129] : [239, 68, 68];

        autoTable(doc, {
          startY: qualitativeY + 5,
          head: [["DOCUMENT STATUS", "SYSTEM HEALTH"]],
          body: [
            [
              { content: record.status || "N/A", styles: { textColor: statusColorArr, fontStyle: "bold" } },
              { content: record.healthCondition || "N/A", styles: { textColor: healthColorArr, fontStyle: "bold" } }
            ]
          ],
          theme: 'grid',
          headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105] },
          styles: { fontSize: 8.5, cellPadding: 3 }
        });
        
        qualitativeY = (doc as any).lastAutoTable.finalY + 10;

        doc.setFillColor(254, 226, 226); // red-100
        doc.rect(15, qualitativeY, pageWidth - 30, 6, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(153, 27, 27); // red-800
        doc.text('OBSERVED DEFICIENCIES', 17, qualitativeY + 4);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const defText = record.deficienciesText || record.overallSummaryText || record.deficiency || 'No deficiencies recorded.';
        const defLines = doc.splitTextToSize(defText, pageWidth - 34);
        doc.text(defLines, 17, qualitativeY + 10);
        
        qualitativeY += 10 + (defLines.length * 5) + 5;
        
        if (qualitativeY > 240) {
          doc.addPage();
          qualitativeY = 20;
        }

        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(15, qualitativeY, pageWidth - 30, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text('TECHNICAL REMARKS & RECOMMENDATIONS', 17, qualitativeY + 4);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const remText = record.complianceText || record.remarks || 'No remarks provided.';
        const complianceLines = doc.splitTextToSize(remText, pageWidth - 34);
        doc.text(complianceLines, 17, qualitativeY + 10);

        const footerY = 270;
        doc.setDrawColor(209, 213, 219);
        doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('TESTER AUTHORIZATION', 15, footerY);
        doc.setFont('helvetica', 'normal');
        doc.text(`NAME: ${record.testerName?.toUpperCase() || 'AUTHORIZED PERSONNEL'}`, 15, footerY + 6);
        
        doc.setTextColor(192, 149, 50);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('OFFICIALLY VERIFIED VIA PROTECTION SYSTEM DASHBOARD', pageWidth - 15, footerY, { align: 'right' });
      });

      const fileName = `${(plant?.name || 'Plant').replace(/\s+/g, '_')}_Full_Compliance_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Full PDF Generation Error:", error);
      alert("Error generating comprehensive report.");
    }
  };


  const generateReportPdf = (record: TestRecord) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // --- 1. Elegant Header ---
      doc.setFillColor(31, 41, 55); // Gray-800
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      // Gold accent banner
      doc.setFillColor(192, 149, 50); // Gold
      doc.rect(0, 45, pageWidth, 3, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('RELIANCE INDUSTRIES LIMITED - FIRE DEPARTMENT', pageWidth / 2, 18, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(209, 213, 219); // Gray-300
      doc.text(`REPORT ID: PS-${(record.id || '').toUpperCase().slice(0, 8)}`, pageWidth - 15, 12, { align: 'right' });
      
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(`${record.plantName || 'N/A'} UNIT - ${record.subSystemName || 'N/A'}`, pageWidth / 2, 30, { align: 'center' });
      
      doc.setFontSize(9);
      doc.text(`SYSTEM TYPE: ${category?.name || 'N/A'} | PERIOD: SEMI-ANNUAL`, pageWidth / 2, 38, { align: 'center' });

      // --- 2. Technical Metadata Section ---
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('I. BASIC SYSTEM INFORMATION', 15, 60);

      const basicInfoData = [
        ["Plant Name", record.plantName || "N/A", "Folder (Sub-System)", record.folder || record.subSystemName || "N/A"],
        ["Tag Number", record.tagNumber || "N/A", "Location", record.location || "N/A"],
        ["System Type", "Fixed System", "Testing Cycle", record.cycle || record.cycleName || "N/A"]
      ];

      autoTable(doc, {
        startY: 65,
        head: [["Field", "Details", "Field", "Details"]],
        body: basicInfoData,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: "bold" },
        styles: { fontSize: 8.5, cellPadding: 3, textColor: [55, 65, 81] }
      });

      // --- 3. Testing Context ---
      const testContextY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('II. AUDIT & EXECUTION DETAILS', 15, testContextY);

      const statusData = [
        ["Execution Date", new Date().toISOString().split("T")[0], "Test Date", record.testDate || record.dateOfTesting || "N/A"],
        ["Tester Name", record.testerName || record.testedBy || "N/A", "Plant Personnel", record.plantPersonnel || "N/A"]
      ];

      autoTable(doc, {
        startY: testContextY + 5,
        head: [["Field", "Details", "Field", "Details"]],
        body: statusData,
        theme: 'grid',
        headStyles: { fillColor: [192, 149, 50], textColor: [255, 255, 255] },
        styles: { fontSize: 8.5, cellPadding: 3 }
      });

      // --- 4. Detailed Checklist Section ---
      doc.setTextColor(31, 41, 55);
      const detailY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('III. ITEMIZED DEFECT PROTOCOL', 15, detailY);

      const detailData: any[] = [];
      if (record.detailedChecklist) {
        Object.entries(record.detailedChecklist).forEach(([id, data]) => {
          if ((data as any).hasDefect) {
            const label = id.replace(/([A-Z])/g, ' $1').toUpperCase();
            detailData.push([detailData.length + 1, label, 'Defect Observed']);
          }
        });
      }
      
      if (detailData.length === 0) {
        detailData.push([
          { content: 'No defects observed.', colSpan: 3, styles: { halign: 'center', fontStyle: 'italic' } }
        ]);
      }

      autoTable(doc, {
        startY: detailY + 5,
        head: [['#', 'Defective Component', 'Status']],
        body: detailData,
        theme: 'grid',
        headStyles: { fillColor: [254, 226, 226], textColor: [153, 27, 27] },
        styles: { fontSize: 8.5, cellPadding: 3 }
      });

      // --- 5. Qualitative Analysis Section ---
      let qualitativeY = (doc as any).lastAutoTable.finalY + 10;
      
      if (qualitativeY > 200) {
        doc.addPage();
        qualitativeY = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('IV. QUALITATIVE FINDINGS & STATUS', 15, qualitativeY);

      const statusColorArr: [number, number, number] = record.status === "Completed" || record.status === "Approved & Locked" ? [16, 185, 129] : [239, 68, 68];
      const healthColorArr: [number, number, number] = record.healthCondition === "Satisfactory" ? [16, 185, 129] : [239, 68, 68];

      autoTable(doc, {
        startY: qualitativeY + 5,
        head: [["DOCUMENT STATUS", "SYSTEM HEALTH"]],
        body: [
          [
            { content: record.status || "N/A", styles: { textColor: statusColorArr, fontStyle: "bold" } },
            { content: record.healthCondition || "N/A", styles: { textColor: healthColorArr, fontStyle: "bold" } }
          ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [192, 149, 50], textColor: [255, 255, 255] },
        styles: { fontSize: 8.5, cellPadding: 3 }
      });
      
      qualitativeY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFillColor(254, 226, 226); // red-100
      doc.rect(15, qualitativeY, pageWidth - 30, 6, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(153, 27, 27); // red-800
      doc.text('OBSERVED DEFICIENCIES', 17, qualitativeY + 4);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const defText = record.deficienciesText || record.overallSummaryText || record.deficiency || 'No deficiencies recorded.';
      const defLines = doc.splitTextToSize(defText, pageWidth - 34);
      doc.text(defLines, 17, qualitativeY + 10);
      
      qualitativeY += 10 + (defLines.length * 5) + 5;
      
      if (qualitativeY > 240) {
        doc.addPage();
        qualitativeY = 20;
      }

      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(15, qualitativeY, pageWidth - 30, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text('TECHNICAL REMARKS & RECOMMENDATIONS', 17, qualitativeY + 4);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const remText = record.complianceText || record.remarks || 'No remarks provided.';
      const complianceLines = doc.splitTextToSize(remText, pageWidth - 34);
      doc.text(complianceLines, 17, qualitativeY + 10);

      // --- 6. Official Footer Section ---
      const footerY = 270;
      doc.setDrawColor(209, 213, 219);
      doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TESTER AUTHORIZATION', 15, footerY);
      doc.setFont('helvetica', 'normal');
      doc.text(`NAME: ${record.testerName?.toUpperCase() || 'AUTHORIZED PERSONNEL'}`, 15, footerY + 6);
      
      // Digital Seal Placeholder or Text
      doc.setTextColor(192, 149, 50);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('OFFICIALLY VERIFIED VIA PROTECTION SYSTEM DASHBOARD', pageWidth - 15, footerY, { align: 'right' });

      const fileName = `${(record.plantName || 'Plant').replace(/\s+/g, '_')}_${(record.subSystemName || 'System').replace(/\s+/g, '_')}_REPORT_${record.testDate || 'Date'}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("PDF Generation Error Details:", error);
      alert("A critical error occurred while generating the PDF. Please ensure all record data is complete.");
    }
  };

    const exportExcel = () => {
      try {
        if (!records || records.length === 0) {
          alert("No records found to export.");
          return;
        }
        const data = records.map(r => ({
          'Date': r.dateOfTesting,
          'Plant Name': r.plantName,
          'Unit': r.unitType,
          'Sub-System': r.subSystemName,
          'Tag No': r.tagNumber,
          'Frequency': r.cycle,
          'Health Condition': r.healthCondition,
          'Status': r.status,
          'Deficiency': r.deficiency,
          'Action Taken': r.actionTaken,
          'Tested By': r.testedBy,
          'Plant Personnel': r.plantPersonnel,
          'Remarks': r.remarks
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Test Records');
        XLSX.writeFile(wb, `${plant?.name || 'Plant'}_Testing_Report.xlsx`);
      } catch (err: any) {
        console.error("Excel Export Error:", err);
        alert("Failed to export Excel: " + err.message);
      }
    };

  // Filtering Logic
  const activeTabRecords = React.useMemo(() => {
    return records.filter(r => {
      const yearMatches = String(r.year || '') === String(selectedYear) || String(r.year || '') === String(selectedYear).split('-')[0];
      return String(r.cycleName || r.cycle || '').toLowerCase() === String(activeTab).toLowerCase() && yearMatches;
    });
  }, [records, activeTab, selectedYear]);

  const filteredRecords = React.useMemo(() => {
    return activeTabRecords.filter(r => {
      const searchStr = (searchTerm || '').toLowerCase();
      const matchesSearch = (r.subSystemName || '').toLowerCase().includes(searchStr) ||
                           (r.tagNumber || '').toLowerCase().includes(searchStr) ||
                           (r.testerName || '').toLowerCase().includes(searchStr);
      const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchesHealth = healthFilter === 'All' || r.healthCondition === healthFilter;
      return matchesSearch && matchesStatus && matchesHealth;
    });
  }, [activeTabRecords, searchTerm, statusFilter, healthFilter]);

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs 
        items={[
          { label: 'System Categories', path: '/categories', icon: Folder },
          { label: category?.name || 'Category', path: `/categories/${categoryId}`, icon: Layers },
          { label: subSystem?.name || 'Sub-System', path: `/categories/${categoryId}/${subSystemId}`, icon: Layers },
          { label: plant?.name || 'Plant', active: true, icon: Building2 }
        ]}
      />

      <AlertsPanel records={records} />

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center space-x-2 md:space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/categories/${categoryId}/${subSystemId}`)} className="h-10 w-10">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center space-x-3">
              <span className="text-[10px] md:text-xs font-black text-blue-600 bg-blue-50 px-1.5 md:px-2 py-0.5 rounded shrink-0 ring-1 ring-blue-100">{plant?.code}</span>
              <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                {plant?.name}
                <button 
                  onClick={handleManualRefresh}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-all text-gray-300 hover:text-blue-500 active:scale-95"
                  title="Force Sync"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </h1>
            </div>
            <p className="text-xs text-gray-500 truncate">{category?.name} / {subSystem?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:space-x-3 overflow-x-auto pb-2 md:pb-0 shrink-0">
          <div className="flex items-center bg-white border-2 border-blue-100 rounded-xl px-3 h-10 shadow-sm">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mr-2">Cycle:</span>
            <select 
              className="text-xs font-bold text-gray-900 outline-none bg-transparent"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {['2024-25', '2025-26', '2026-27', '2027-28', '2028-29', '2029-30'].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center bg-white border-2 border-blue-100 rounded-xl px-3 h-10 shadow-sm">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mr-2">Freq:</span>
            <select 
              className="text-xs font-bold text-gray-900 outline-none bg-transparent"
              value={selectedFrequency}
              onChange={(e) => {
                const newFreq = e.target.value as Frequency;
                updateSelectedFrequency(newFreq);
              }}
            >
              <option value="Quarterly">Quarterly</option>
              <option value="Semi-Annual">Semiannual</option>
              <option value="Annual">Annual</option>
              <option value="Bi-Annual">Biannual</option>
            </select>
          </div>
          <Button variant="outline" onClick={exportExcel} className="h-10 text-sm whitespace-nowrap border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={generateFullReportPdf} className="h-10 text-sm whitespace-nowrap border-red-200 text-red-600 hover:bg-red-50">
            <Download className="h-4 w-4 mr-2" />
            Full PDF
          </Button>
          <Button onClick={() => handleOpenModal()} className="h-10 text-sm whitespace-nowrap bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100">
            <Plus className="h-4 w-4 mr-2" />
            Record
          </Button>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold transition-all",
                viewMode === 'list' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Grid className="w-3.5 h-3.5" />
              Listview
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={cn(
                "px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold transition-all",
                viewMode === 'calendar' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              Calendar
            </button>
          </div>
        </div>
      </motion.div>

      {/* Dynamic Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {tabsForFrequency.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2",
              activeTab === tab 
                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                : "bg-white border-gray-100 text-gray-400 hover:border-blue-200 hover:text-gray-600"
            )}
          >
            {tab === 'Annual' ? 'Yearly' : tab}
          </button>
        ))}
        <Button 
          onClick={() => setIsPasswordModalOpen(true)} 
          variant="outline"
          className="ml-auto bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 font-black uppercase text-[10px] tracking-wider shadow-sm"
        >
          Carry to Next Period
        </Button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { 
              label: 'Total Tags', 
              val: activeTabRecords.length, 
              color: 'blue' 
            },
            { 
              label: 'Approved', 
              val: activeTabRecords.filter(r => r.status === 'Approved & Locked').length, 
              color: 'green' 
            },
            { 
              label: 'Pending Review', 
              val: activeTabRecords.filter(r => r.status === 'Pending Review').length, 
              color: 'amber' 
            },
            { 
              label: 'Unsatisfactory', 
              val: activeTabRecords.filter(r => r.status === 'Unsatisfactory').length, 
              color: 'red' 
            },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="hover:shadow-md transition-shadow border-none shadow-sm h-full group">
                <CardContent className="p-3 md:p-5">
                  <p className="text-[9px] md:text-[10px] font-black tracking-[0.1em] md:tracking-[0.2em] text-gray-400 uppercase mb-1 md:mb-2">{stat.label}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xl md:text-2xl font-black text-gray-900 leading-none">{stat.val}</p>
                    <div className={cn("h-7 w-7 md:h-8 md:w-8 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform", 
                      stat.color === 'blue' ? 'bg-blue-50 text-blue-600' : 
                      stat.color === 'green' ? 'bg-green-50 text-green-600' : 
                      stat.color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                    )}>
                      <FileCheck className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        <DashboardAnalytics records={activeTabRecords} />
      </div>

      <Card>
        <CardHeader className="flex flex-col space-y-4 pb-6 px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">Testing Compliance</CardTitle>
              <div className="relative w-full md:w-80 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <AppInput 
                  placeholder="Filter by Folder, Tag, or Tester..." 
                  className="pl-10 h-10 border-none bg-white shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500/20" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {(searchTerm || statusFilter !== 'All' || healthFilter !== 'All') && (
                <button 
                  onClick={handleResetFilters}
                  className="hidden md:flex items-center gap-2 px-4 py-2 text-[10px] font-black text-red-500 hover:bg-red-50 rounded-xl transition-all border border-red-100"
                >
                  <X className="w-3 h-3" />
                  RESET FILTERS
                </button>
              )}
          </div>
          
          <div className="flex flex-col gap-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100 overflow-x-hidden">
             <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">Health:</span>
                {['All', 'Satisfactory', 'Unsatisfactory'].map(health => (
                  <button
                    key={health}
                    onClick={() => setHealthFilter(health)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap",
                      healthFilter === health 
                        ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5" 
                        : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    {health}
                  </button>
                ))}
             </div>
             
             <div className="h-[1px] w-full bg-gray-200 block md:hidden" />

             <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">Status:</span>
                {['All', 'Completed', 'Pending', 'Overdue'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap",
                      statusFilter === status 
                        ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5" 
                        : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    {status}
                  </button>
                ))}
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {viewMode === 'list' ? (
            <>
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest">
                    <th className="px-6 py-4">EQUIPMENT / SUB-SYSTEM FOLDER</th>
                    <th className="px-6 py-4">Tag No.</th>
                    <th className="px-6 py-4">Test Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Tester</th>
                    <th className="px-6 py-4">Health Condition</th>
                    <th className="px-6 py-4">Deficiency</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedRecords.length > 0 ? paginatedRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase">{r.subSystemName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs leading-none">
                          {r.tagNumber || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{r.testDate}</td>
                      <td className="px-6 py-4">
                        <Badge variant={
                          r.status === 'Approved & Locked' ? 'success' : 
                          r.status === 'Pending Review' ? 'warning' :
                          r.status === 'Unsatisfactory' ? 'danger' :
                          r.status === 'Completed' ? 'success' : 
                          r.status === 'Overdue' ? 'danger' : 
                          r.status === 'Pending' ? 'warning' : 'default'
                        }>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{r.testerName}</td>
                      <td className="px-6 py-4">
                        <Badge variant={r.healthCondition === 'Satisfactory' ? 'success' : 'danger'}>
                          {r.healthCondition}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-gray-500">
                        {r.deficiency || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => generateReportPdf(r)} title="Standard Report PDF">
                          <Download className="h-4 w-4 text-emerald-600" />
                        </Button>
                        
                        {r.status === 'Pending Review' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleApproveRecord(r)}
                            title="Approve & Lock"
                            className="bg-green-50 hover:bg-green-100"
                          >
                            <FileCheck className="h-4 w-4 text-green-600" />
                          </Button>
                        )}

                        {r.status !== 'Approved & Locked' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleOpenModal(r)}
                          >
                            <Edit3 className={cn(
                              "h-4 w-4",
                              "text-blue-600"
                            )} />
                          </Button>
                        )}

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteGate({ isOpen: true, record: r });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                        </Button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                       <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <FileCheck className="h-10 w-10 text-gray-200 mb-2" />
                            <p>No testing records found for this unit.</p>
                          </div>
                       </td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              {/* Pagination UI */}
              <div className="px-6 py-4 flex items-center justify-between bg-gray-50/50 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-bold">
                  Showing <span className="text-gray-900">{paginatedRecords.length}</span> of <span className="text-gray-900">{filteredRecords.length}</span> results
                </p>
                <div className="flex items-center space-x-2">
                   <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-8 text-xs font-bold"
                   >
                     Previous
                   </Button>
                   <span className="text-xs font-black px-3 py-1 bg-white rounded-lg border border-gray-100">
                     {currentPage} / {totalPages || 1}
                   </span>
                   <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="h-8 text-xs font-bold"
                   >
                     Next
                   </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 md:p-6">
              <SystemCalendar 
                records={filteredRecords} 
                onDateClick={(recs) => setSelectedDateRecords(recs)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <EquipmentHistoryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        record={editingRecord}
        onSave={() => load()}
        isNew={isNewRecord}
        defaultFrequency={selectedFrequency}
        userRole={userRole}
      />

      <Dialog
        isOpen={isSuccessDialogOpen}
        onClose={() => setIsSuccessDialogOpen(false)}
        title="Record Saved Successfully"
        maxWidth="max-w-md"
      >
        <div className="flex flex-col items-center text-center p-6 space-y-6">
          <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center border-4 border-green-100 shadow-inner">
            <FileCheck className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900">Success!</h3>
            <p className="text-sm text-gray-500 mt-2">The test record for <span className="font-bold text-gray-900">{lastSavedRecord?.subSystemName}</span> has been stored in the database.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 w-full">
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl flex items-center justify-center font-bold shadow-lg shadow-blue-100"
              onClick={() => {
                if (lastSavedRecord) generateReportPdf(lastSavedRecord);
                setIsSuccessDialogOpen(false);
              }}
            >
              <Download className="h-5 w-5 mr-3" />
              Download Report PDF
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl text-gray-500 font-bold border-gray-200"
              onClick={() => setIsSuccessDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setCarryForwardPassword('');
          setPasswordError('');
        }}
        title="Admin Verification Required"
        maxWidth="max-w-md"
      >
        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center text-center space-y-2 mb-4">
            <div className="h-12 w-12 bg-indigo-50 rounded-full flex items-center justify-center border-2 border-indigo-100">
              <RefreshCw className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Execute Carry Forward</h3>
              <p className="text-xs text-gray-500 font-medium">Please enter admin password to proceed with cycle transition.</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Admin Password</label>
            <input 
              type="password" 
              className="w-full h-12 px-4 rounded-xl border-2 border-gray-100 focus:border-indigo-500 outline-none font-bold text-gray-900" 
              placeholder="••••••••"
              value={carryForwardPassword}
              onChange={(e) => setCarryForwardPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            {passwordError && (
              <p className="text-red-500 text-xs font-bold mt-2 text-center">{passwordError}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsPasswordModalOpen(false);
                setCarryForwardPassword('');
                setPasswordError('');
              }}
              className="flex-1 h-12 rounded-xl text-xs font-bold border-gray-200"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePasswordSubmit}
              className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 transition-all font-black uppercase tracking-wider"
            >
              Confirm & Execute
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={!!selectedDateRecords}
        onClose={() => setSelectedDateRecords(null)}
        title={`Scheduled Tests: ${(selectedDateRecords && selectedDateRecords[0]) ? (selectedDateRecords[0].testDate || selectedDateRecords[0].dateOfTesting) : ''}`}
        maxWidth="max-w-2xl"
      >
        <div className="p-6 space-y-4">
          {selectedDateRecords?.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex flex-col">
                <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{r.plantName}</span>
                <span className="text-sm font-bold text-gray-900">{r.subSystemName}</span>
                <span className="text-[10px] font-mono text-gray-400 mt-1">TAG: {r.tagNumber || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={
                  r.status === 'Approved & Locked' || r.status === 'Completed' ? 'success' :
                  r.status === 'Unsatisfactory' ? 'danger' : 'warning'
                }>
                  {r.status}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => {
                  setSelectedDateRecords(null);
                  handleOpenModal(r);
                }} className="text-xs font-bold text-blue-600">
                  View Detail
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Dialog>

      {deleteGate && (
        <AdminDeleteGateModal
          isOpen={deleteGate.isOpen}
          onClose={() => setDeleteGate(null)}
          onConfirm={() => performDeleteRecord(deleteGate.record)}
          targetName={deleteGate.record.tagNumber || deleteGate.record.subSystemName || 'Record'}
          targetType="record"
        />
      )}
    </div>
  );
}
