import * as React from 'react';
import { 
  Trash2, RefreshCw, AlertCircle, 
  ChevronLeft, Archive, Layers, Folder,
  Building2, ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { dbApi } from '../db/storage';
import { RecycledItem } from '../types';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { AdminAuthModal } from '../components/shared/AdminAuthModal';

export default function RecycleBin() {
  const [items, setItems] = React.useState<RecycledItem[]>([]);
  const navigate = useNavigate();

  // Admin Auth State
  const [authModal, setAuthModal] = React.useState({
    isOpen: false,
    id: '',
    name: ''
  });

  React.useEffect(() => {
    const load = async () => {
      await dbApi.init();
      setItems(await dbApi.getRecycleBin());
    };
    load();
  }, []);

  const handleRestore = async (id: string) => {
    await dbApi.restoreFromBin(id);
    setItems(await dbApi.getRecycleBin());
  };

  const handlePermanentDelete = async () => {
    await dbApi.permanentlyDeleteFromBin(authModal.id);
    setItems(await dbApi.getRecycleBin());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Archive className="h-6 w-6 mr-2 text-rose-500" />
            Recycle Bin
          </h1>
          <p className="text-sm text-gray-500">Restore or permanently delete removed items</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Deleted Folders & Sub-systems</CardTitle>
            <Badge variant="warning">{items.length} items in bin</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {items.length > 0 ? items.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {item.type === 'category' ? <Folder className="h-5 w-5 text-blue-600" /> : 
                     item.type === 'subsystem' ? <Layers className="h-5 w-5 text-emerald-600" /> :
                     item.type === 'plant' ? <Building2 className="h-5 w-5 text-amber-600" /> :
                     <ClipboardList className="h-5 w-5 text-indigo-600" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">
                      {item.type === 'testrecord' ? `Test Record: ${item.data.tagNumber}` : item.data.name}
                    </h4>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                      {item.type} • {item.type === 'testrecord' && item.data.plantName} • Deleted on {new Date(item.deletedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleRestore(item.id)}
                    className="text-blue-600 border-blue-100 hover:bg-blue-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restore
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setAuthModal({
                      isOpen: true,
                      id: item.id,
                      name: item.type === 'testrecord' ? item.data.tagNumber : item.data.name
                    })}
                    className="text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Forever
                  </Button>
                </div>
              </div>
            )) : (
              <div className="py-20 flex flex-col items-center text-gray-400">
                <Archive className="h-12 w-12 mb-4 opacity-20" />
                <p>Your recycle bin is empty.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AdminAuthModal 
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        onConfirm={handlePermanentDelete}
        actionTitle={`Permanently Delete: ${authModal.name}`}
      />

      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
        <div>
          <h5 className="text-sm font-bold text-amber-900 leading-tight">Accidental Deletion Protection</h5>
          <p className="text-xs text-amber-700 mt-1">
            Items in the recycle bin preserve their original contents and can be revived at any time.
            However, permanently deleting an item here removes it from the storage forever.
          </p>
        </div>
      </div>
    </div>
  );
}
