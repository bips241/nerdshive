'use client';

import React, { useEffect, useState } from 'react';
import { checkExistingRequest, createCollabRequest } from '@/lib/actions'; // Adjust the import path as necessary

interface CollabReqButtonProps {
  postId: string;
  userId: string;
}

const CollabReqButton: React.FC<CollabReqButtonProps> = ({ postId, userId }) => {
  const [buttonLabel, setButtonLabel] = useState<string>('Request Collaboration');
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!userId) return;

      const result = await checkExistingRequest(postId, userId);
      if (result.status === 'pending' || result.status === 'accepted') {
        setButtonLabel(result.status.charAt(0).toUpperCase() + result.status.slice(1)); // Capitalize
        setIsDisabled(true);
      }
    };

    fetchStatus();
  }, [postId, userId]);

  const handleClick = async () => {
    if (!userId) return;

    setButtonLabel('Pending...');
    setIsDisabled(true);

    const result = await createCollabRequest(postId, userId);

    if (result.status) {
      setButtonLabel(result.status.charAt(0).toUpperCase() + result.status.slice(1));
      setIsDisabled(true);
    } else {
      setButtonLabel('Request Collaboration');
      setIsDisabled(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-sm font-semibold rounded-md transition"
    >
      {buttonLabel}
    </button>
  );
};

export default CollabReqButton;
