export const revalidate = 15;

import React, { Suspense } from 'react';
import { getSession } from '@/lib/getSession';
import { redirect } from 'next/navigation';
import Posts from "@/components/Posts";
import { PostsSkeleton } from "@/components/Skeletons";
import DashboardRightRail from "@/components/DashboardRightRail";

const DashboardPage = async () => {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user) {
      redirect("/login");
    }

    return (
      <main className="flex w-full justify-center gap-8 pb-20">
        {/* Main Feed Column */}
        <div className="flex flex-col flex-1 max-w-2xl w-full min-w-0">
          <Suspense fallback={<PostsSkeleton />}>
            <Posts />
          </Suspense>
        </div>

        {/* Desktop Developer Pulse Rail */}
        <div className="hidden xl:block w-80 shrink-0">
          <DashboardRightRail />
        </div>
      </main>
    );
  } catch (error) {
    console.error("Error in DashboardPage:", error);
    return <div>Error loading dashboard</div>;
  }
};

export default DashboardPage;
