import React from 'react'
import { getSession } from '@/lib/getSession';
import { redirect } from 'next/navigation';

const DashboardPage = async() => {
  const session = await getSession();
  const user = session?.user;
  if (!user) redirect("/login");
  return (
    <div>DashboardPage</div>
  )
}

export default DashboardPage;