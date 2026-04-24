import * as React from 'react';
import { ShieldCheck, X, AlertOctagon, Key } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { AppInput } from '../ui/AppInput';
import { dbApi } from '../../db/storage';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionTitle: string;
}

export function AdminAuthModal({ isOpen, onClose, onConfirm, actionTitle }: AdminAuthModalProps) {
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState(false);

  const handleVerify = async () => {
    const settings = await dbApi.getSettings();
    if (password === (settings.adminPassword || 'admin')) {
      setError(false);
      setPassword('');
      onConfirm();
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Administrative Authentication">
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="p-3 bg-white rounded-xl shadow-sm mb-3">
            <ShieldCheck className="h-10 w-10 text-rose-500" />
          </div>
          <h3 className="font-bold text-gray-900 leading-tight">Privileged Action Required</h3>
          <p className="text-xs text-gray-500 mt-2">
            You are attempting to: <span className="text-rose-600 font-bold">"{actionTitle}"</span>.
            This action requires your administrative password.
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <AppInput 
              label="Admin Password" 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            />
            {error && (
              <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center">
                <AlertOctagon className="h-3 w-3 mr-1" />
                Invalid credentials. Please contact your system head.
              </p>
            )}
          </div>

          <div className="flex space-x-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={handleVerify}>
              Verify & Proceed
            </Button>
          </div>
        </div>
        
        <p className="text-[10px] text-gray-400 text-center uppercase font-bold tracking-widest">
           FPS Secure Core • Protocol Alpha
        </p>
      </div>
    </Dialog>
  );
}
