import React, { Suspense } from 'react'
import { getSession } from '@/lib/getSession';
import { redirect } from 'next/navigation';
import Posts from "@/components/Posts";
import { PostsSkeleton } from "@/components/Skeletons";

const DashboardPage = async() => {
  const session = await getSession();
  const user = session?.user;
  if (!user) redirect("/login");
  return (
    <main className="flex w-full flex-grow">
      <div className="flex flex-col flex-1 gap-y-8 max-w-lg mx-auto pb-20">
        <Suspense fallback={<PostsSkeleton />}>
          <Posts />
        </Suspense>
      </div>
    </main>
  )
}

export default DashboardPage;