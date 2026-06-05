import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useGlobalStore } from '../../store/useGlobalStore';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export function Dialog({ isOpen, onClose, title, children, maxWidth = 'max-w-md', className }: DialogProps) {
  const { theme } = useGlobalStore();
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "relative w-full rounded-2xl shadow-2xl overflow-hidden",
              maxWidth,
              className || (theme === 'modern' ? "bg-slate-900/80 backdrop-blur-xl border border-slate-700/50" : "bg-white")
            )}
          >
            {title && (
              <div className={cn("flex items-center justify-between p-6 border-b", theme === 'modern' ? "border-slate-800" : "border-gray-100")}>
                <h3 className={cn("text-xl font-semibold", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>{title}</h3>
                <Button variant="ghost" size="icon" onClick={onClose} className={theme === 'modern' ? "text-slate-300 hover:bg-slate-800" : ""}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}
            <div className={cn("p-6 overflow-y-auto max-h-[80vh]", !title && "pt-6")}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
