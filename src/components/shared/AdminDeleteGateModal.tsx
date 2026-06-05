import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useGlobalStore } from '../../store/useGlobalStore';
import { cn } from '../../lib/utils';
import { AlertTriangle, ShieldX, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { dbApi } from '../../db/storage';

interface AdminDeleteGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetName: string;
  targetType: 'record' | 'folder' | 'user' | string;
}

export function AdminDeleteGateModal({ isOpen, onClose, onConfirm, targetName, targetType }: AdminDeleteGateModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const { theme } = useGlobalStore();

  const handleConfirm = async () => {
    if (!password) return;
    setIsValidating(true);
    setError(false);

    try {
      const currentUser = useGlobalStore.getState().currentUser;
      if (!currentUser || currentUser.role !== 'Admin') {
         setError(true);
         setIsValidating(false);
         return;
      }

      let isPasswordValid = false;
      if (currentUser.id === 'admin-id') {
         const settings = await dbApi.getSettings();
         if (password === (settings.adminPassword || 'admin')) {
           isPasswordValid = true;
         }
      } else {
         const userSnap = await getDoc(doc(db, 'users', currentUser.id));
         if (userSnap.exists() && userSnap.data().password === password) {
           isPasswordValid = true;
         }
      }

      if (isPasswordValid) {
        onConfirm();
        toast.success('Data Deleted Successfully');
        setPassword('');
        setError(false);
        onClose();
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError(false);
    onClose();
  };

  const getWarningMessage = () => {
     if (targetType === 'folder') {
        return `Warning: You are attempting to delete the structural asset folder ${targetName}. This will delete all historical logs contained inside it.`;
     }
     if (targetType === 'user') {
        return `Are you sure you want to permanently remove the credentials and access for user ${targetName}?`;
     }
     return `Are you sure you want to permanently remove the compliance inspection record for ${targetName}?`;
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="" maxWidth="max-w-md">
      <div className={cn(
        "p-8 flex flex-col items-center text-center rounded-2xl relative overflow-hidden transition-all duration-300",
        theme === 'modern' ? "bg-slate-900/95 backdrop-blur-xl border border-slate-800 text-slate-200" : "bg-white border border-slate-200 text-slate-900"
      )}>
        {theme === 'modern' && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-600"></div>}
        
        <div className={cn("p-5 rounded-3xl mb-5", theme === 'modern' ? "bg-rose-950/40 border border-rose-900/50 text-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.15)]" : "bg-red-50 border border-red-100 text-red-600")}>
          <ShieldX className="h-12 w-12" />
        </div>

        <h3 className={cn("text-2xl font-black mb-3 tracking-tight", theme === 'modern' ? "text-rose-500" : "text-red-600")}>
          Administrative Override
        </h3>

        <p className={cn("text-sm mb-8 leading-relaxed font-medium mx-2", theme === 'modern' ? "text-slate-400" : "text-slate-600")}>
          {getWarningMessage()}
        </p>

        <div className="w-full space-y-5">
          <div className="relative">
            <input
              type="password"
              placeholder="Enter Admin Password"
              value={password}
              disabled={isValidating}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
              }}
              className={cn(
                "w-full h-14 rounded-xl px-5 font-mono text-center border-2 transition-all outline-none",
                theme === 'modern' 
                  ? "bg-slate-950/50 text-rose-200 border-slate-800 focus:border-rose-500/50 focus:bg-slate-900/80 placeholder:text-slate-600" 
                  : "bg-slate-50 text-slate-900 border-slate-200 focus:border-red-400",
                error && (theme === 'modern' ? "border-rose-500/80 ring-4 ring-rose-500/20 bg-rose-950/20 text-rose-500" : "border-red-500 ring-4 ring-red-500/20 text-red-600"),
                isValidating && "opacity-50"
              )}
            />
            {error && (
              <div className={cn("absolute -bottom-6 left-0 right-0 flex items-center justify-center space-x-1.5", theme === 'modern' ? "text-rose-400" : "text-red-500")}>
                <AlertTriangle className="h-3 w-3 animate-pulse" />
                <span className="text-[11px] font-bold tracking-wide uppercase">Unauthorized Access: Invalid Admin Password</span>
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-6">
            <Button variant="outline" disabled={isValidating} className={cn("flex-1 h-12 text-sm font-bold uppercase tracking-wider", theme === 'modern' ? "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200" : "text-slate-600")} onClick={handleClose}>
              Cancel
            </Button>
            <Button 
               disabled={isValidating || !password}
               className={cn("flex-1 h-12 text-sm font-bold uppercase tracking-wider text-white border-0 transition-all", theme === 'modern' ? "bg-rose-600 hover:bg-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:shadow-[0_0_25px_rgba(225,29,72,0.6)]" : "bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20")}
               onClick={handleConfirm}
            >
              {isValidating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Confirm Delete'
              )}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
