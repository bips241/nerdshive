'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import ReactPlayer from 'react-player';

interface MediaProps {
  fileUrl: string;
}

const Media: React.FC<MediaProps> = ({ fileUrl }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="sm:rounded-md bg-gray-200 w-full h-full"></div>;
  }

  return (
    <div className="relative h-[450px] w-full overflow-hidden rounded-none sm:rounded-md">
      <ReactPlayer
        url={fileUrl}
        controls
        width="100%"
        height="100%"
        className="sm:rounded-md"
        playing
        volume={1}
      />
    </div>
  );
};

export default Media;
