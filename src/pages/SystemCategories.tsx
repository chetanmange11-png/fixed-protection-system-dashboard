import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Folder, MoreVertical, ArrowRight, Download, Trash2, Edit, Calendar } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AppInput } from '../components/ui/AppInput';
import { SystemCategory, TestRecord, SubSystem } from '../types';
import { Dialog } from '../components/ui/Dialog';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dbApi } from '../db/storage';
import { createDocument, updateDocument, deleteDocument } from '../services/firestoreService';
import { useGlobalStore } from '../store/useGlobalStore';
import { cn } from '../lib/utils';
import { AdminDeleteGateModal } from '../components/shared/AdminDeleteGateModal';

export default function SystemCategories() {
  const navigate = useNavigate();
  const equipmentTypes = useGlobalStore(state => state.categories);
  const allRecords = useGlobalStore(state => state.records);
  const subSystems = useGlobalStore(state => state.subSystems);
  const { theme, activeCycle } = useGlobalStore();
  
  const records = allRecords.filter(r => r.financialYear === activeCycle);
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const [renamingCat, setRenamingCat] = React.useState<any | null>(null);
  const [renamedName, setRenamedName] = React.useState('');
  const [deleteGate, setDeleteGate] = React.useState<{ isOpen: boolean; id: string; name: string } | null>(null);

  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleCreateFolder = async () => {
    if (!newFolderName) return;
    
    setIsProcessing(true);
    // Add to DB using new service
    try {
      await createDocument('EQUIPMENT_TYPES', {
        name: newFolderName,
      });
      // Clear and Close
      setNewFolderName('');
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRenameCategory = async () => {
    if (!renamedName || !renamingCat) return;
    setIsProcessing(true);
    try {
      await updateDocument('EQUIPMENT_TYPES', renamingCat.id, {
        name: renamedName
      });
      setIsRenameModalOpen(false);
      setRenamingCat(null);
      setRenamedName('');
    } catch(e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setIsProcessing(true);
    useGlobalStore.setState(state => ({
      categories: state.categories.filter((c: any) => c.id !== categoryId),
      subSystems: state.subSystems.filter((s: any) => s.categoryId !== categoryId),
      records: state.records.filter((r: any) => r.categoryId !== categoryId)
    }));
    try {
      await dbApi.deleteCategory(categoryId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportCategoryPDF = async (category: any) => {
    const categoryRecords = records.filter(r => r.equipmentTypeId === category.id || r.categoryId === category.id);
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`CATEGORY REPORT: ${(category.name || 'N/A').toUpperCase()}`, 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Records: ${categoryRecords.length}`, 14, 36);

    const tableData = categoryRecords.map(r => [
      r.plantName || 'N/A',
      r.tagNumber || 'N/A',
      r.subSystemName || 'N/A',
      r.cycle || 'N/A',
      r.status || 'N/A',
      r.healthCondition || 'N/A',
      r.deficiency || 'N/A'
    ]);

    autoTable(doc, {
      startY: 42,
      head: [['Plant', 'Tag No.', 'Sub-System', 'Cycle', 'Status', 'Health', 'Deficiency']],
      body: tableData,
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 }
    });

    doc.save(`${category.name}_Full_Report.pdf`);
  };

  const filteredCategories = (equipmentTypes || []).filter(c => 
    (c.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const handleOpenInSchedule = (catId: string) => {
    navigate('/', { state: { selectedCatId: catId } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <AppInput 
            placeholder="Search folders..." 
            className="pl-10 h-11 md:h-12" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="h-11 md:h-12 shadow-md">
          <Plus className="h-5 w-5 mr-2" />
          Add Main Folder
        </Button>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="h-20 w-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Folder className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No folders found</h2>
          <p className="text-gray-500 max-w-sm mx-auto mb-6">
            Get started by creating a new system folder to organize your categories and testing records.
          </p>
          <Button onClick={() => setIsModalOpen(true)} className="rounded-full px-8 shadow-md">
            <Plus className="h-5 w-5 mr-2" />
            Create First Folder
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredCategories.map((category) => {
            const catSubSystems = subSystems.filter(s => s.categoryId === category.id);

            return (
              <Card 
                key={category.id} 
                className={cn(
                  "group cursor-pointer transition-all duration-300 p-0 overflow-hidden rounded-3xl shadow-sm",
                  theme === 'modern' 
                    ? "bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 hover:border-[#D4AF37]/50 hover:shadow-[0_0_15px_rgba(212,175,55,0.15)] hover:-translate-y-1" 
                    : "hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 border-gray-100"
                )}
              >
                <div 
                  className={cn(
                    "p-10 flex items-center justify-center transition-colors relative",
                    theme === 'modern' 
                      ? "bg-slate-900/60 group-hover:bg-slate-800/80" 
                      : "bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-blue-50 group-hover:to-blue-100"
                  )}
                  onClick={() => navigate(`/categories/${category.id}`)}
                >
                  {/* Decorative background circle */}
                  <div className={cn(
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-2xl transition-colors",
                    theme === 'modern' ? "bg-[#D4AF37]/5 group-hover:bg-[#D4AF37]/10" : "bg-white/40 group-hover:bg-blue-200/40"
                  )} />
                  
                  <div className={cn(
                    "p-4 backdrop-blur rounded-2xl shadow-sm group-hover:scale-110 transition-all relative z-10",
                    theme === 'modern' ? "bg-slate-800 border border-slate-700/50 group-hover:shadow-[0_0_15px_rgba(212,175,55,0.2)]" : "bg-white/90 border border-white/50 group-hover:shadow-md"
                  )}>
                    <Folder className={cn("h-10 w-10 drop-shadow-sm", theme === 'modern' ? "text-[#D4AF37]" : "text-blue-600")} />
                  </div>
                </div>
                <div className={cn("p-6", theme === 'modern' ? "bg-slate-900/40" : "bg-white")}>
                  <div className="flex flex-col mb-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 
                        className={cn(
                          "text-lg font-bold transition-colors cursor-pointer line-clamp-1 flex-1 pr-2 leading-tight",
                          theme === 'modern' ? "text-slate-100 group-hover:text-[#D4AF37]" : "text-gray-900 group-hover:text-blue-600"
                        )}
                        onClick={() => navigate(`/categories/${category.id}`)}
                        title={category.name}
                      >
                        {category.name}
                      </h3>
                    </div>
                    <div className="flex space-x-2">
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                          "h-8 w-8 rounded-lg border",
                          theme === 'modern' ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-[#D4AF37]" : "bg-gray-50 hover:bg-blue-50 text-blue-600 border-gray-100"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingCat(category);
                          setRenamedName(category.name);
                          setIsRenameModalOpen(true);
                        }}
                        title="Rename Folder"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                          "h-8 w-8 rounded-lg border",
                          theme === 'modern' ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-[#D4AF37]" : "bg-gray-50 hover:bg-red-50 text-red-500 border-gray-100"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteGate({ isOpen: true, id: category.id, name: category.name });
                        }}
                        title="Delete Category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                          "h-8 w-8 rounded-lg border",
                          theme === 'modern' ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-[#D4AF37]" : "bg-gray-50 hover:bg-blue-50 text-blue-600 border-gray-100"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          exportCategoryPDF(category);
                        }}
                        title="Export PDF Report"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Embedded Stats Section */}
                  <div className={cn(
                    "flex items-center gap-4 rounded-xl p-3 mb-5 border",
                    theme === 'modern' ? "bg-slate-950/60 border-slate-800" : "bg-gray-50/80 border-gray-100"
                  )}>
                    <div className="flex flex-col flex-1 pl-1">
                      <span className={cn("text-lg font-black leading-none", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>{catSubSystems.length}</span>
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider mt-1", theme === 'modern' ? "text-[#D4AF37]" : "text-gray-400")}>
                        {catSubSystems.length === 1 ? 'Sub-folder' : 'Sub-folders'}
                      </span>
                    </div>
                    <div className={cn("w-px h-8", theme === 'modern' ? "bg-slate-800" : "bg-gray-200")}></div>
                    <div className="flex flex-col flex-1">
                      <span className={cn("text-lg font-black leading-none", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>{category.totalRecords || 0}</span>
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider mt-1", theme === 'modern' ? "text-[#D4AF37]" : "text-gray-400")}>
                        {category.totalRecords === 1 ? 'Total Record' : 'Total Records'}
                      </span>
                    </div>
                  </div>

                  <div 
                    className={cn(
                      "flex justify-between items-center text-sm font-semibold group-hover:gap-2 transition-all cursor-pointer p-2 -mx-2 rounded-lg",
                      theme === 'modern' ? "text-[#D4AF37] hover:bg-slate-800/80" : "text-blue-600 hover:bg-blue-50/50"
                    )}
                    onClick={() => handleOpenInSchedule(category.id)}
                  >
                    <span>View Scheduled Timeline</span>
                    <div className={cn(
                      "p-1.5 rounded-full transition-colors",
                      theme === 'modern' ? "bg-slate-800 text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-slate-900" : "bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
                    )}>
                      <Calendar className="h-4 w-4" />
                    </div>
                  </div>

                  <div 
                    className={cn(
                      "flex justify-between items-center text-xs font-medium group-hover:gap-2 transition-all cursor-pointer p-2 -mx-2 rounded-lg mt-1",
                      theme === 'modern' ? "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200" : "text-gray-500 hover:bg-gray-100"
                    )}
                    onClick={() => navigate(`/categories/${category.id}`)}
                  >
                    <span>Open Category Map</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Category Folder"
      >
        <div className="space-y-4">
          <AppInput 
            label="Category Name" 
            placeholder="e.g. Transformers, HVAC"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder}>Create Folder</Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        title={`Rename Folder: ${renamingCat?.name}`}
      >
        <div className="space-y-4">
          <AppInput 
            label="Folder Name" 
            placeholder="Enter new name..."
            value={renamedName}
            onChange={(e) => setRenamedName(e.target.value)}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsRenameModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameCategory}>Save New Name</Button>
          </div>
        </div>
      </Dialog>

      {deleteGate && (
        <AdminDeleteGateModal
          isOpen={deleteGate.isOpen}
          onClose={() => setDeleteGate(null)}
          onConfirm={() => handleDeleteCategory(deleteGate.id)}
          targetName={deleteGate.name}
          targetType="folder"
        />
      )}
    </div>
  );
}
