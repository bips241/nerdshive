'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export const DevPostModal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();

  return (
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[88vh] overflow-y-auto p-4 sm:p-6 bg-background border border-border text-foreground rounded-2xl">
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default DevPostModal;
