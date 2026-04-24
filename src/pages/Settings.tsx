import * as React from 'react';
import { 
  ShieldCheck, Lock, User, Save, 
  RefreshCcw, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AppInput } from '../components/ui/AppInput';
import { cn } from '../lib/utils';
import { dbApi } from '../db/storage';

export default function Settings() {
  const [currentId, setCurrentId] = React.useState('');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newId, setNewId] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  
  const [status, setStatus] = React.useState<{type: 'success' | 'error', message: string} | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const settings = await dbApi.getSettings();
    const adminId = settings.adminId || 'admin';
    const adminPass = settings.adminPassword || 'admin';

    if (currentId !== adminId || currentPassword !== adminPass) {
      setStatus({ type: 'error', message: 'Current credentials do not match our records.' });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    await dbApi.saveSettings({
      adminId: newId || adminId,
      adminPassword: newPassword || adminPass
    });

    setStatus({ type: 'success', message: 'Security credentials updated successfully. Please note them for your next login.' });
    
    // Clear passwords
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-4">
        <div className="p-3 bg-blue-600 rounded-xl text-white">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Configuration</h1>
          <p className="text-sm text-gray-500">Reset master administrator ID and password</p>
        </div>
      </div>

      <form onSubmit={handleReset} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-700 flex items-center">
               <Lock className="h-4 w-4 mr-2" />
               Identity Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <AppInput 
               label="Current Manager ID" 
               placeholder="Current ID" 
               value={currentId}
               onChange={(e) => setCurrentId(e.target.value)}
               required
             />
             <AppInput 
               label="Current Security Password" 
               type="password" 
               placeholder="Current Password" 
               value={currentPassword}
               onChange={(e) => setCurrentPassword(e.target.value)}
               required
             />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-700 flex items-center">
               <RefreshCcw className="h-4 w-4 mr-2" />
               New Security Credentials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <AppInput 
               label="New Manager ID (Optional)" 
               placeholder="Leave blank to keep current" 
               value={newId}
               onChange={(e) => setNewId(e.target.value)}
             />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <AppInput 
                 label="New Security Password" 
                 type="password" 
                 placeholder="Min. 8 characters" 
                 value={newPassword}
                 onChange={(e) => setNewPassword(e.target.value)}
               />
               <AppInput 
                 label="Confirm New Password" 
                 type="password" 
                 placeholder="Must match" 
                 value={confirmPassword}
                 onChange={(e) => setConfirmPassword(e.target.value)}
               />
             </div>
          </CardContent>
        </Card>

        {status && (
          <div className={cn(
            "p-4 rounded-xl flex items-start space-x-3 border",
            status.type === 'success' ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"
          )}>
            {status.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
            <span className="text-sm font-medium">{status.message}</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" size="lg" className="px-10">
            <Save className="h-5 w-5 mr-2" />
            Apply Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
