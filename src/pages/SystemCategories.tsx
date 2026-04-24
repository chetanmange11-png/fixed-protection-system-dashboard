import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Folder, MoreVertical, ArrowRight, Download, Trash2, Edit } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AppInput } from '../components/ui/AppInput';
import { dbApi } from '../db/storage';
import { SystemCategory, TestRecord, SubSystem } from '../types';
import { Dialog } from '../components/ui/Dialog';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { AdminAuthModal } from '../components/shared/AdminAuthModal';

export default function SystemCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = React.useState<SystemCategory[]>([]);
  const [subSystems, setSubSystems] = React.useState<SubSystem[]>([]);
  const [records, setRecords] = React.useState<TestRecord[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState('');
  const [renamingCat, setRenamingCat] = React.useState<SystemCategory | null>(null);
  const [renamedName, setRenamedName] = React.useState('');

  // Admin Auth State
  const [authModal, setAuthModal] = React.useState({
    isOpen: false,
    id: '',
    name: ''
  });

  const loadData = React.useCallback(async () => {
    await dbApi.init();
    const [cats, subs, recs] = await Promise.all([
      dbApi.getCategories(),
      dbApi.getSubSystems(),
      dbApi.getTestRecords()
    ]);
    setCategories(cats);
    setSubSystems(subs);
    setRecords(recs);
  }, []);

  React.useEffect(() => {
    loadData();
    window.addEventListener('fy-change', loadData);
    return () => window.removeEventListener('fy-change', loadData);
  }, [loadData]);

  const handleAddCategory = async () => {
    if (!newCatName) return;
    const newCat = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCatName
    };
    await dbApi.saveCategory(newCat);
    await loadData();
    setNewCatName('');
    setIsAddModalOpen(false);
  };

  const handleRenameCategory = async () => {
    if (!renamedName || !renamingCat) return;
    await dbApi.renameCategory(renamingCat.id, renamedName);
    await loadData();
    setIsRenameModalOpen(false);
    setRenamingCat(null);
    setRenamedName('');
  };

  const handleDeleteCategory = async () => {
    await dbApi.deleteCategory(authModal.id);
    setAuthModal({ ...authModal, isOpen: false });
    await loadData();
  };

  const exportCategoryPDF = async (category: SystemCategory) => {
    const allRecords = await dbApi.getTestRecords();
    const records = allRecords.filter(r => r.categoryId === category.id);
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`CATEGORY REPORT: ${category.name.toUpperCase()}`, 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Records: ${records.length}`, 14, 36);

    const tableData = records.map(r => [
      r.plantName,
      r.tagNumber,
      r.subSystemName,
      r.cycle,
      r.status,
      r.healthCondition,
      r.deficiency || 'N/A'
    ]);

    (doc as any).autoTable({
      startY: 42,
      head: [['Plant', 'Tag No.', 'Sub-System', 'Cycle', 'Status', 'Health', 'Deficiency']],
      body: tableData,
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 }
    });

    doc.save(`${category.name}_Full_Report.pdf`);
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <AppInput 
            placeholder="Search categories..." 
            className="pl-10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-5 w-5 mr-2" />
          Add Category Folder
        </Button>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="h-20 w-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Folder className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No category folders found</h2>
          <p className="text-gray-500 max-w-sm mx-auto mb-6">
            Get started by creating a new system category folder to organize your sub-systems and testing records.
          </p>
          <Button onClick={() => setIsAddModalOpen(true)} className="rounded-full px-8 shadow-md">
            <Plus className="h-5 w-5 mr-2" />
            Create First Folder
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredCategories.map((category) => {
            const catSubSystems = subSystems.filter(s => s.categoryId === category.id);
            const catRecords = records.filter(r => r.categoryId === category.id);

            return (
              <Card 
                key={category.id} 
                className="group cursor-pointer hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-0 overflow-hidden rounded-3xl border-gray-100 shadow-sm"
              >
                <div 
                  className="bg-gradient-to-br from-gray-50 to-gray-100 p-10 flex items-center justify-center group-hover:from-blue-50 group-hover:to-blue-100 transition-colors relative"
                  onClick={() => navigate(`/categories/${category.id}`)}
                >
                  {/* Decorative background circle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/40 rounded-full blur-2xl group-hover:bg-blue-200/40 transition-colors" />
                  
                  <div className="p-4 bg-white/90 backdrop-blur border border-white/50 rounded-2xl shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all relative z-10">
                    <Folder className="h-10 w-10 text-blue-600 drop-shadow-sm" />
                  </div>
                </div>
                <div className="p-6 bg-white">
                  <div className="flex items-start justify-between mb-4">
                    <h3 
                      className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors cursor-pointer line-clamp-1 flex-1 pr-2 leading-tight"
                      onClick={() => navigate(`/categories/${category.id}`)}
                      title={category.name}
                    >
                      {category.name}
                    </h3>
                    <div className="flex space-x-1 -mt-1 -mr-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-blue-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportCategoryPDF(category);
                        }}
                        title="Export PDF Report"
                      >
                        <Download className="h-4 w-4 text-gray-500 group-hover:text-blue-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-blue-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingCat(category);
                          setRenamedName(category.name);
                          setIsRenameModalOpen(true);
                        }}
                        title="Rename Folder"
                      >
                        <Edit className="h-4 w-4 text-gray-500 group-hover:text-blue-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAuthModal({
                            isOpen: true,
                            id: category.id,
                            name: category.name
                          });
                        }}
                        title="Move to Bin"
                      >
                        <Trash2 className="h-4 w-4 text-gray-500 group-hover:text-red-500" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Embedded Stats Section */}
                  <div className="flex items-center gap-4 bg-gray-50/80 border border-gray-100 rounded-xl p-3 mb-5">
                    <div className="flex flex-col flex-1 pl-1">
                      <span className="text-lg font-black text-gray-900 leading-none">{catSubSystems.length}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Sub-folders</span>
                    </div>
                    <div className="w-px h-8 bg-gray-200"></div>
                    <div className="flex flex-col flex-1">
                      <span className="text-lg font-black text-gray-900 leading-none">{catRecords.length}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Total Records</span>
                    </div>
                  </div>

                  <div 
                    className="flex justify-between items-center text-blue-600 text-sm font-semibold group-hover:gap-2 transition-all cursor-pointer p-2 -mx-2 rounded-lg hover:bg-blue-50/50"
                    onClick={() => navigate(`/categories/${category.id}`)}
                  >
                    <span>Open Category Map</span>
                    <div className="bg-blue-100 text-blue-600 p-1.5 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AdminAuthModal 
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        onConfirm={handleDeleteCategory}
        actionTitle={`Delete Category: ${authModal.name}`}
      />

      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Category Folder"
      >
        <div className="space-y-4">
          <AppInput 
            label="Category Name" 
            placeholder="e.g. Transformers, HVAC"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCategory}>Create Folder</Button>
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
    </div>
  );
}
