import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Dialog({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }: DialogProps) {
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
              "relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden",
              maxWidth
            )}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[80vh]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
