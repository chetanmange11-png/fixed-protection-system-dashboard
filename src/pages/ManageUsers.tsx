import * as React from 'react';
import { 
  Users, UserPlus, Shield, Star, 
  UserCheck, ShieldAlert, Eye,
  Edit3, Save, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AppInput } from '../components/ui/AppInput';
import { Badge } from '../components/ui/Badge';
import { dbApi } from '../db/storage';
import { User } from '../types';
import { Dialog } from '../components/ui/Dialog';
import { cn } from '../lib/utils';

export default function ManageUsers() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [newUser, setNewUser] = React.useState({ name: '', role: 'Viewer' as const });
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = React.useState(false);
  const [adminPassword, setAdminPassword] = React.useState('');
  const [userToDelete, setUserToDelete] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      await dbApi.init();
      setUsers(await dbApi.getUsers());
    };
    load();
  }, []);

  const handleAddUser = async () => {
    if (!newUser.name) return;
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: newUser.name,
      role: newUser.role,
      lastLogin: '-'
    };
    await dbApi.saveUser(user);
    setUsers(await dbApi.getUsers());
    setNewUser({ name: '', role: 'Viewer' });
    setIsAddModalOpen(false);
  };

  const handleUpdateRole = async () => {
    if (!editingUser) return;
    await dbApi.saveUser(editingUser);
    setUsers(await dbApi.getUsers());
    setIsEditModalOpen(false);
    setEditingUser(null);
  };

  const handleDeleteConfirm = async () => {
    const settings = await dbApi.getSettings();
    if (adminPassword === (settings.adminPassword || 'admin')) {
      if (userToDelete) {
        await dbApi.deleteUser(userToDelete);
        setUsers(await dbApi.getUsers());
        setIsAdminAuthOpen(false);
        setUserToDelete(null);
        setAdminPassword('');
      }
    } else {
      alert('Invalid Administrator Password');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Access Management</h1>
          <p className="text-sm text-gray-500">Manage team roles and system permissions</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <UserPlus className="h-5 w-5 mr-2" />
          Add Authorized User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="bg-blue-600 text-white border-none">
            <CardHeader className="pb-2">
               <Shield className="h-6 w-6 text-blue-200 mb-2" />
               <CardTitle className="text-white text-lg font-bold uppercase tracking-wider text-opacity-80">Access Integrity</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-3xl font-bold">Encrypted</p>
               <p className="text-sm text-blue-100 mt-2">All login credentials and user sessions are secured via local AES-256 equivalent standards.</p>
            </CardContent>
         </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members & Permissions</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">User Name</th>
                <th className="px-6 py-4">Access Role</th>
                <th className="px-6 py-4">Last Activity</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                     <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">{user.name}</td>
                  <td className="px-6 py-4">
                     <div className="flex items-center space-x-2">
                        {user.role === 'Admin' ? (
                          <div className="p-1 px-2 rounded bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-100 flex items-center">
                            <Shield className="h-3 w-3 mr-1" />
                            ADMIN
                          </div>
                        ) : user.role === 'Technician' ? (
                          <div className="p-1 px-2 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100 flex items-center">
                            <Star className="h-3 w-3 mr-1" />
                            TECHNICIAN
                          </div>
                        ) : (
                          <div className="p-1 px-2 rounded bg-gray-50 text-gray-600 text-[10px] font-bold border border-gray-100 flex items-center">
                            <Eye className="h-3 w-3 mr-1" />
                            VIEWER
                          </div>
                        )}
                     </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400 font-mono text-xs">{user.lastLogin || 'N/A'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => {
                          setEditingUser(user);
                          setIsEditModalOpen(true);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-gray-400 hover:bg-red-50 hover:text-red-500"
                        onClick={() => {
                          setUserToDelete(user.id);
                          setIsAdminAuthOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Edit User/Role Modal */}
      <Dialog 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title={`Modify User: ${editingUser?.name}`}
      >
        <div className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center space-x-4">
             <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
               {editingUser?.name[0].toUpperCase()}
             </div>
             <div>
                <h4 className="font-bold text-gray-900 leading-tight">{editingUser?.name}</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Current Role: {editingUser?.role}</p>
             </div>
          </div>

          <div className="space-y-4">
             <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Assign New Permission Group</label>
                <div className="grid grid-cols-3 gap-2">
                   {[
                     { val: 'Admin', icon: ShieldAlert, desc: 'Full Access' },
                     { val: 'Technician', icon: UserCheck, desc: 'Read/Write' },
                     { val: 'Viewer', icon: Eye, desc: 'Read Only' }
                   ].map((role) => (
                     <button
                       key={role.val}
                       onClick={() => setEditingUser(editingUser ? { ...editingUser, role: role.val as any } : null)}
                       className={cn(
                         "p-3 rounded-xl border flex flex-col items-center text-center transition-all",
                         editingUser?.role === role.val 
                           ? "bg-blue-600 border-blue-600 text-white shadow-lg" 
                           : "bg-white border-gray-200 text-gray-600 hover:border-blue-200"
                       )}
                     >
                       <role.icon className="h-5 w-5 mb-1" />
                       <span className="text-xs font-bold">{role.val}</span>
                       <span className="text-[10px] opacity-60 font-medium">{role.desc}</span>
                     </button>
                   ))}
                </div>
             </div>
          </div>

          <div className="flex space-x-3 pt-2">
             <Button variant="outline" className="flex-1" onClick={() => setIsEditModalOpen(false)}>
                Cancel
             </Button>
             <Button className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold" onClick={handleUpdateRole}>
                <Save className="h-4 w-4 mr-2" />
                Apply Changes
             </Button>
          </div>
        </div>
      </Dialog>

      <Dialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Access Role">
         <div className="space-y-4">
            <AppInput 
              label="Full Name" 
              placeholder="e.g. John Doe" 
              value={newUser.name}
              onChange={(e) => setNewUser({...newUser, name: e.target.value})}
            />
            <div className="space-y-2">
               <label className="text-sm font-medium text-gray-700">Permission Category</label>
               <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'Admin', icon: ShieldAlert, desc: 'Full Access' },
                    { val: 'Technician', icon: UserCheck, desc: 'Read/Write' },
                    { val: 'Viewer', icon: Eye, desc: 'Read Only' }
                  ].map((role) => (
                    <button
                      key={role.val}
                      onClick={() => setNewUser({...newUser, role: role.val as any})}
                      className={cn(
                        "p-3 rounded-xl border flex flex-col items-center text-center transition-all",
                        newUser.role === role.val 
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg" 
                          : "bg-white border-gray-200 text-gray-600 hover:border-blue-200"
                      )}
                    >
                      <role.icon className="h-5 w-5 mb-1" />
                      <span className="text-xs font-bold">{role.val}</span>
                      <span className="text-[10px] opacity-60 font-medium">{role.desc}</span>
                    </button>
                  ))}
               </div>
            </div>
            <div className="pt-4 flex flex-col space-y-2">
               <Button onClick={handleAddUser} className="w-full">Activate Access Account</Button>
               <p className="text-[10px] text-center text-gray-400 italic">User will be assigned a temporary password 'fps123' based on current security protocols.</p>
            </div>
         </div>
      </Dialog>

      <Dialog isOpen={isAdminAuthOpen} onClose={() => setIsAdminAuthOpen(false)} title="Security Authorization Required">
          <div className="space-y-4">
             <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 flex items-center space-x-3">
                <ShieldAlert className="h-5 w-5" />
                <p className="text-xs font-bold uppercase tracking-widest">Administrator Verification Needed</p>
             </div>
             <p className="text-xs text-gray-500">Please enter the Administrator Password to confirm user removal. This action is irreversible.</p>
             <AppInput 
               label="Security Password" 
               type="password" 
               placeholder="Confirm Password" 
               value={adminPassword}
               onChange={(e) => setAdminPassword(e.target.value)}
             />
             <div className="flex space-x-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsAdminAuthOpen(false)}>Abort</Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 font-bold" onClick={handleDeleteConfirm}>Confirm Delete</Button>
             </div>
          </div>
      </Dialog>
    </div>
  );
}
