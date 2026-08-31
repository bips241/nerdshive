'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';

interface ProjectRequest {
  _id: string;
  requesterId: { _id: string; user_name: string };
  status: string;
}

interface RequestsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export default function RequestsDialog({ isOpen, onClose, postId }: RequestsDialogProps) {
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/project-requests/${postId}`);
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId: string, action: 'accepted' | 'rejected') => {
    try {
      await fetch(`/api/project-requests/update/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      fetchRequests(); // Refresh list after accept/reject
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-md rounded bg-white dark:bg-neutral-900 p-6 space-y-4">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-center">Project Requests</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-center text-sm">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-center text-sm">No requests found.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req._id} className="flex items-center justify-between">
                <p className="text-sm font-medium">{req.requesterId?.user_name}</p>
                <div className="flex space-x-2">
                  {req.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleAction(req._id, 'accepted')}
                        className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleAction(req._id, 'rejected')}
                        className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-semibold capitalize">{req.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 text-sm font-semibold bg-sky-500 hover:bg-sky-600 text-white rounded"
        >
          Close
        </button>
      </DialogContent>
    </Dialog>
  );
}
