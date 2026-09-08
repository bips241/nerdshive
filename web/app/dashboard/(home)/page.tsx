export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import { getSession } from '@/lib/getSession';
import { redirect } from 'next/navigation';
import Posts from "@/components/Posts";
import { PostsSkeleton } from "@/components/Skeletons";
import DashboardCockpitRail from "@/components/DashboardCockpitRail";

const DashboardPage = async () => {
  const session = await getSession();
  const user = session?.user;

  if (!user) {
    redirect("/login");
  }

  const currentUser = {
    _id: user._id?.toString() || (user as any).id?.toString() || '',
    user_name: user.user_name || 'Developer',
    name: (user as any).name || user.user_name || '',
    image: user.image || '',
  };

  return (
    <main className="flex w-full justify-center gap-7 items-start">
      {/* Main Feed Column */}
      <div className="flex flex-col flex-1 max-w-2xl w-full min-w-0 pb-20">
        <Suspense fallback={<PostsSkeleton />}>
          <Posts />
        </Suspense>
      </div>

      {/* Desktop Developer Cockpit - Pinned & Non-scrolling with feed */}
      <div className="hidden xl:flex flex-col w-[380px] shrink-0 sticky top-1 self-start h-[calc(100vh-2.5rem)]">
        <DashboardCockpitRail currentUser={currentUser} />
      </div>
    </main>
  );
};

export default DashboardPage;
