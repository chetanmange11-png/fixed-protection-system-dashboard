import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  X,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  RefreshCw,
  AlertOctagon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGlobalStore } from '../store/useGlobalStore';
import { AdminDeleteGateModal } from '../components/shared/AdminDeleteGateModal';
import { dbApi } from '../db/storage';
import { FinancialYear } from '../types';
import { Dialog } from '../components/ui/Dialog';

export default function UserManagement() {
  const navigate = useNavigate();
  const { theme, activeCycle, categories, plants, subSystems, currentUser } = useGlobalStore();
  const [users, setUsers] = React.useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  
  React.useEffect(() => {
    if (currentUser && currentUser.role !== 'Admin') {
      navigate('/');
    }
  }, [currentUser, navigate]);
  
  // Rollover States
  const [isCarryForwardOpen, setIsCarryForwardOpen] = React.useState(false);
  const [isRolloverModalOpen, setIsRolloverModalOpen] = React.useState(false);
  const [nextYearSelection, setNextYearSelection] = React.useState<FinancialYear | ''>('');
  const [rolloverPassword, setRolloverPassword] = React.useState('');
  const [targetYearExists, setTargetYearExists] = React.useState(false);
  const [isRollingOver, setIsRollingOver] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<any>(null);
  
  const [formData, setFormData] = React.useState({
    name: '',
    employeeId: '',
    password: '',
    role: 'Officer', // Admin, Officer, Tester
    status: 'Active'
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersList);
    });
    return () => unsubscribe();
  }, []);

  const openModal = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name || '',
        employeeId: user.employeeId || '',
        password: user.password || '',
        role: user.role || 'Officer',
        status: user.status || 'Active'
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', employeeId: '', password: '', role: 'Officer', status: 'Active' });
    }
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.employeeId || !formData.password || !formData.role) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setIsProcessing(true);
    try {
      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success("User updated successfully");
      } else {
        await addDoc(collection(db, 'users'), {
          ...formData,
          createdAt: serverTimestamp()
        });
        toast.success("User created successfully");
      }
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save user");
    } finally {
      setIsProcessing(false);
    }
  };

  const [deleteGate, setDeleteGate] = React.useState<{ isOpen: boolean; id: string; name: string } | null>(null);

  const performDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, "users", userId));
      // toast is handled by the modal
    } catch (error: any) {
      console.error("Firebase Error:", error);
      alert("Delete failed: " + error.message);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
    (u.employeeId || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const handleStartNewCycleFlow = () => {
    setIsRolloverModalOpen(true);
    setRolloverPassword('');
  };

  const handleCarryForwardConfirm = async () => {
    if (!nextYearSelection) {
      toast.error("Select a target year first");
      return;
    }
    // Check Admin authorization
    const currentUserRole = useGlobalStore.getState().currentUser?.role;
    if (currentUserRole !== 'Admin') {
      toast.error("Unauthorized: Master Rollover requires Admin privileges.");
      return;
    }
    
    setIsCarryForwardOpen(false);
    setTargetYearExists(await dbApi.checkYearExists(nextYearSelection as string));
    setIsRolloverModalOpen(true);
    setRolloverPassword('');
  };

  const handleCycleExecution = async () => {
    if (!nextYearSelection || !rolloverPassword) return;

    const currentUserInfo = useGlobalStore.getState().currentUser;
    if (!currentUserInfo || currentUserInfo.role !== 'Admin') {
      toast.error('Unauthorized role: Admin privileges required.');
      return;
    }

    let isPasswordValid = false;
    try {
      if (currentUserInfo.id === 'admin-id') {
        const settings = await dbApi.getSettings();
        if (rolloverPassword === (settings.adminPassword || 'admin')) {
          isPasswordValid = true;
        }
      } else {
        const userSnap = await getDoc(doc(db, 'users', currentUserInfo.id));
        if (userSnap.exists() && userSnap.data().password === rolloverPassword) {
          isPasswordValid = true;
        }
      }
    } catch (e: any) {
      toast.error("Failed to verify password.");
      return;
    }

    if (!isPasswordValid) {
      toast.error('Invalid admin password');
      return;
    }

    setIsRollingOver(true);
    const toastId = toast.loading('Initializing Master Rollover...');
    try {
      const counts = await dbApi.startNewCycle(nextYearSelection as FinancialYear);
      const currentUser = currentUserInfo?.name || 'Admin';
      toast.success(
        `Rollover Success (${currentUser}): ${counts?.plants || 0} Plants, ${counts?.subSystems || 0} Sub-systems, ${counts?.categories || 0} Categories mapped...and ${counts?.utilities || 0} Utility systems mapped. Status reset to Pending.`,
        { id: toastId, duration: 8000 }
      );
      setNextYearSelection('');
      setIsRolloverModalOpen(false);
    } catch (err: any) {
      if (err.code === 'permission-denied' || (err.message && err.message.toLowerCase().includes('permission'))) {
        toast.error('Database Access Blocked: Please verify your Firebase Security Rules allow read/write access to the Utilities collection.', { id: toastId });
      } else {
        toast.error('Failed to execute rollover: ' + err.message, { id: toastId });
      }
    } finally {
      setIsRollingOver(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-black tracking-tight flex items-center", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>
            User Management
          </h1>
          <p className={cn("text-sm font-medium mt-1", theme === 'modern' ? "text-slate-400" : "text-gray-500")}>
             Manage access credentials and application roles.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button 
            onClick={() => openModal()}
            className={cn("text-white rounded-xl shadow-lg px-6 font-bold tracking-wide transition-all duration-300", theme === 'modern' ? "bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20")}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New User
          </Button>
        </div>
      </div>

      <Card className={cn("relative z-10 overflow-hidden rounded-2xl", theme === 'modern' ? "bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 shadow-lg" : "bg-white border-gray-100 shadow-sm")}>
        <CardContent className="p-0">
          <div className={cn("p-4 border-b flex items-center justify-between", theme === 'modern' ? "border-slate-800/50 bg-transparent" : "border-gray-50 bg-white")}>
            <div className="relative w-full max-w-sm">
              <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", theme === 'modern' ? "text-slate-400" : "text-gray-400")} />
              <input 
                type="text" 
                placeholder="Search users by name or ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none transition-all",
                  theme === 'modern' 
                    ? "bg-slate-950/50 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:shadow-[0_0_10px_rgba(212,175,55,0.3)]" 
                    : "bg-white border border-gray-100 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                )}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-sm whitespace-nowrap">
              <thead className={cn("text-xs uppercase tracking-widest border-b", theme === 'modern' ? "bg-slate-900/80 text-[#D4AF37] border-slate-700" : "bg-gray-800 text-gray-400 border-gray-700")}>
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Login ID</th>
                  <th className="px-6 py-4">Password</th>
                  <th className="px-6 py-4">App Role</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", theme === 'modern' ? "divide-slate-800 bg-transparent" : "divide-gray-800 bg-gray-900")}>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={cn("transition-colors", theme === 'modern' ? "hover:bg-slate-800/40" : "hover:bg-gray-800/80")}>
                    <td className={cn("px-6 py-4", theme === 'modern' ? "text-slate-300" : "text-gray-200")}>
                      <div className="flex items-center space-x-3">
                        <div className={cn("h-8 w-8 rounded-full border flex items-center justify-center font-bold text-xs uppercase shadow-sm", theme === 'modern' ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-gray-800 border-gray-700 text-gray-300")}>
                          {user.name?.[0] || 'U'}
                        </div>
                        <span className="font-bold">{user.name}</span>
                      </div>
                    </td>
                    <td className={cn("px-6 py-4", theme === 'modern' ? "text-slate-300" : "text-gray-400")}>
                      {user.employeeId}
                    </td>
                    <td className={cn("px-6 py-4", theme === 'modern' ? "text-slate-500" : "text-gray-500")}>
                      ••••••••
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 text-[10px] rounded uppercase tracking-widest font-black inline-flex items-center gap-1",
                        user.role === 'Admin' ? "bg-red-500/10 text-red-500" : 
                        user.role === 'Officer' ? "bg-blue-500/10 text-blue-400" : 
                        "bg-green-500/10 text-green-500"
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        <button 
                          onClick={() => openModal(user)}
                          className={cn("transition-colors drop-shadow-sm", theme === 'modern' ? "text-blue-400 hover:text-blue-300" : "text-blue-400 hover:text-blue-300")}
                          title="Edit User"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteGate({ isOpen: true, id: user.id, name: user.name || user.employeeId || 'User' })}
                          className={cn("transition-colors drop-shadow-sm", theme === 'modern' ? "text-red-500 hover:text-red-400" : "text-red-500 hover:text-red-700")}
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className={cn("px-6 py-12 text-center font-mono text-xs uppercase tracking-widest", theme === 'modern' ? "bg-transparent text-slate-500" : "bg-gray-900 text-gray-500")}>
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Users className={cn("h-8 w-8", theme === 'modern' ? "text-slate-600" : "text-gray-700")} />
                        <span>No users found</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className={cn("relative z-10 w-full rounded-2xl border p-6 overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6", theme === 'modern' ? "bg-slate-900 border-red-900/30" : "bg-red-50/50 border-red-100")}>
         <div className={cn("absolute top-0 left-0 w-1 h-full", theme === 'modern' ? "bg-red-600" : "bg-red-500")}></div>
         <div className="flex items-center gap-5">
           <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border", theme === 'modern' ? "bg-red-950 border-red-900/50 text-red-500" : "bg-white border-red-100 text-red-600 shadow-sm")}>
              <RefreshCw className="h-7 w-7" />
           </div>
           <div>
             <h2 className={cn("text-xl font-black tracking-tight", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>Master Rollover System</h2>
             <p className={cn("text-sm font-medium mt-1 leading-relaxed max-w-xl", theme === 'modern' ? "text-slate-400" : "text-gray-600")}>
               Execute the year-end protocol to duplicate the primary category and plant hierarchy to a new cycle. Existing unresolved defects will automatically be marked correctly.
             </p>
           </div>
         </div>
         <Button 
            onClick={handleStartNewCycleFlow}
            disabled={(() => {
              const allYears = Array.from(new Set(categories.map((c: any) => c.financialYear).filter(Boolean)));
              allYears.sort();
              const maxYear = allYears[allYears.length - 1];
              return maxYear && activeCycle !== maxYear;
            })()}
            className={cn("text-white rounded-xl shadow-lg px-8 py-5 h-auto text-sm font-black uppercase tracking-widest transition-all duration-300 disabled:opacity-50 shrink-0", theme === 'modern' ? "bg-rose-600 hover:bg-rose-500 hover:shadow-[0_0_20px_rgba(225,29,72,0.5)]" : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20")}
          >
            Launch Rollover Dashboard
          </Button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn("rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border", theme === 'modern' ? "bg-slate-900/80 backdrop-blur-xl border-slate-700/50" : "bg-white border-gray-100")}
          >
            <div className={cn("px-6 py-5 border-b flex items-center justify-between", theme === 'modern' ? "border-slate-800 bg-slate-900/50" : "border-gray-100 bg-gray-50/50")}>
              <h3 className={cn("text-lg font-black flex items-center gap-2 tracking-tight", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>
                <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", theme === 'modern' ? "bg-slate-800/80" : "bg-blue-100")}>
                  <ShieldCheck className={cn("h-4 w-4", theme === 'modern' ? "text-[#D4AF37]" : "text-blue-600")} />
                </div>
                {editingUser ? 'Edit User Credentials' : 'Create New User'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className={cn("transition-colors p-2 rounded-full", theme === 'modern' ? "text-slate-400 hover:text-slate-300 hover:bg-slate-800" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className={cn("p-6 space-y-5", theme === 'modern' ? "bg-slate-900/60" : "bg-white")}>
              <div className="space-y-1.5">
                <label className={cn("text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5", theme === 'modern' ? "text-slate-400" : "text-gray-500")}>
                  <UserIcon className="h-3 w-3" /> Full Name
                </label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className={cn("w-full px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 transition-all", theme === 'modern' ? "bg-slate-800/80 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37]" : "bg-gray-50 border border-gray-200 text-gray-900 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-gray-400")}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="space-y-1.5">
                <label className={cn("text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5", theme === 'modern' ? "text-slate-400" : "text-gray-500")}>
                  <Mail className="h-3 w-3" /> Login ID / Employee ID
                </label>
                <input 
                  type="text" 
                  value={formData.employeeId}
                  onChange={e => setFormData({...formData, employeeId: e.target.value})}
                  className={cn("w-full px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 transition-all", theme === 'modern' ? "bg-slate-800/80 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37]" : "bg-gray-50 border border-gray-200 text-gray-900 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-gray-400")}
                  placeholder="e.g. EMP1002"
                />
              </div>

              <div className="space-y-1.5">
                <label className={cn("text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5", theme === 'modern' ? "text-slate-400" : "text-gray-500")}>
                  <Lock className="h-3 w-3" /> Password
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className={cn("w-full pl-4 pr-10 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 transition-all", theme === 'modern' ? "bg-slate-800/80 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37]" : "bg-gray-50 border border-gray-200 text-gray-900 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-gray-400")}
                    placeholder="Enter secure password"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={cn("absolute right-3 top-1/2 -translate-y-1/2", theme === 'modern' ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-600")}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className={cn("space-y-1.5 pt-2 border-t", theme === 'modern' ? "border-slate-800" : "border-gray-100")}>
                <label className={cn("text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5", theme === 'modern' ? "text-slate-400" : "text-gray-500")}>
                  <ShieldCheck className="h-3 w-3" /> App Role
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['Admin', 'Officer', 'Tester'].map(role => (
                    <button
                      key={role}
                      onClick={() => setFormData({...formData, role})}
                      className={cn(
                        "py-2.5 px-3 rounded-xl border text-sm font-bold transition-all",
                        formData.role === role 
                          ? (theme === 'modern' ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]" : "bg-blue-50 border-blue-200 text-blue-700 shadow-sm")
                          : (theme === 'modern' ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300")
                      )}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className={cn("p-6 border-t flex gap-3", theme === 'modern' ? "bg-slate-900/80 border-slate-800" : "bg-gray-50 border-gray-100")}>
              <Button 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-white hover:bg-gray-50 rounded-xl font-bold"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isProcessing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 font-bold"
              >
                {isProcessing ? 'Saving...' : (editingUser ? 'Update Details' : 'Create User')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {deleteGate && (
        <AdminDeleteGateModal
          isOpen={deleteGate.isOpen}
          onClose={() => setDeleteGate(null)}
          onConfirm={() => performDeleteUser(deleteGate.id)}
          targetName={deleteGate.name}
          targetType="user"
        />
      )}

      {/* Master Rollover Dashboard Modal */}
      <Dialog 
        isOpen={isRolloverModalOpen} 
        onClose={() => !isRollingOver && setIsRolloverModalOpen(false)} 
        title=""
        maxWidth="max-w-3xl"
      >
        <div className="flex flex-col p-8 bg-slate-950 text-slate-200 border border-slate-800 rounded-2xl relative overflow-hidden backdrop-blur-3xl shadow-2xl">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-rose-500 to-orange-500"></div>
           
           <div className="flex items-start justify-between mb-8">
             <div className="flex items-start gap-4">
               <div className="p-3 bg-red-950/40 rounded-xl border border-red-900/30">
                 <AlertOctagon className="h-8 w-8 text-rose-500 flex-shrink-0" />
               </div>
               <div>
                 <h3 className="text-2xl font-black text-rose-500 tracking-tight leading-tight mb-1">Master Rollover Protocol</h3>
                 <p className="text-sm text-slate-400 font-medium">
                   Duplicate core master hierarchy and preserve unresolved defects for the next cycle.
                 </p>
               </div>
             </div>
             
             <div className="flex flex-col items-end">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Target Year</label>
               <select 
                 className="h-10 rounded-xl bg-slate-900 border border-slate-700/50 text-slate-100 px-4 text-sm font-bold outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 w-40"
                 value={nextYearSelection}
                 onChange={async (e) => {
                   const val = e.target.value as FinancialYear;
                   setNextYearSelection(val);
                   if (val) {
                     setTargetYearExists(await dbApi.checkYearExists(val));
                   }
                 }}
                 disabled={isRollingOver}
               >
                 <option value="" disabled>-- Select Year --</option>
                 <option value="2025-26">2025-26</option>
                 <option value="2026-27">2026-27</option>
                 <option value="2027-28">2027-28</option>
                 <option value="2028-29">2028-29</option>
                 <option value="2029-30">2029-30</option>
               </select>
             </div>
           </div>

           <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                 <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Total Categories</div>
                 <div className="text-3xl font-black text-slate-100">{categories.length}</div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                 <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Total Sub-systems</div>
                 <div className="text-3xl font-black text-slate-100">{subSystems?.length || 0}</div> 
              </div>
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                 <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Total Plants</div>
                 <div className="text-3xl font-black text-slate-100">{plants?.length || 0}</div>
              </div>
           </div>
           
           <div className="flex items-center justify-center mb-8 gap-4 text-slate-500 font-mono text-xs">
              <div className="px-3 py-1.5 bg-slate-900 rounded-md border border-slate-800 font-bold">{activeCycle}</div>
              <div className="flex-1 max-w-[150px] h-px bg-slate-800 relative flex items-center justify-center">
                 <RefreshCw className="h-4 w-4 bg-slate-950 px-0.5 text-slate-600" />
              </div>
              <div className="px-3 py-1.5 bg-slate-900 rounded-md border border-slate-800 font-bold text-rose-400">{nextYearSelection || '????-??'}</div>
           </div>

           <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4 mb-6">
               <p className="text-sm text-slate-400 leading-relaxed font-medium text-center">
                 {targetYearExists ? (<span><span className="text-rose-500 font-bold">WIPE & REPLACE.</span> Data for this cycle already exists. Re-running the rollover will delete current records for <span className="text-emerald-400 font-bold">{nextYearSelection}</span> and replace them with a fresh copy from <span className="text-emerald-400 font-bold">{activeCycle}</span>.</span>) : (<span>Warning: This will perform a system rollover, cloning the master hierarchy to <span className="text-emerald-400 font-bold">{nextYearSelection || 'the target year'}</span>. Pre-flight check cleared.</span>)}
               </p>
           </div>

           <div className="space-y-4">
             <div className="relative max-w-sm mx-auto">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block text-center">Admin Password</label>
               <input
                 type="password"
                 value={rolloverPassword}
                 onChange={(e) => setRolloverPassword(e.target.value)}
                 disabled={isRollingOver || !nextYearSelection}
                 className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-sm font-mono text-rose-400 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all placeholder:text-slate-700 text-center"
                 placeholder="Enter Admin Password"
               />
             </div>

             <div className="flex gap-3 max-w-sm mx-auto">
               <Button 
                 variant="outline" 
                 className="flex-1 border-slate-800 text-slate-300 hover:bg-slate-800" 
                 onClick={() => setIsRolloverModalOpen(false)}
                 disabled={isRollingOver}
               >
                 Abort
               </Button>
               <Button 
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:bg-rose-900 justify-center whitespace-nowrap px-8" 
                onClick={handleCycleExecution}
                disabled={!rolloverPassword || isRollingOver || !nextYearSelection}
               >
                 {isRollingOver ? (
                   <span className="flex items-center"><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Executing...</span>
                 ) : (
                   'EXECUTE ROLLOVER'
                 )}
               </Button>
             </div>
           </div>
        </div>
      </Dialog>
    </motion.div>
  );
}
