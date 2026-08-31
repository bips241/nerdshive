'use client';

import { useState } from 'react';
import RequestsDialog from './viewProjectReq';

interface ClientSideRequestsDialogProps {
  postId: string;
}

export default function ClientSideRequestsDialog({ postId }: ClientSideRequestsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openDialog = () => setIsOpen(true);
  const closeDialog = () => setIsOpen(false);

  return (
    <>
      <button
        onClick={openDialog}
        className="w-full absolute bottom-0 bg-sky-100/60 hover:bg-sky-200/80 dark:bg-sky-800/60 dark:hover:bg-sky-700/80 text-sky-700 dark:text-sky-200 font-semibold py-2 text-sm transition"
      >
        View Requests
      </button>

      {isOpen && <RequestsDialog isOpen={isOpen} onClose={closeDialog} postId={postId} />}
    </>
  );
}
