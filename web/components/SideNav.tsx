import React from 'react';
import Logo from './logo';
import NavLinks from './NavLinks';
import MoreDropdown from './MoreDropdown';
import ProfileLink from './ProfileLink';
import { auth } from '@/auth';

async function SideNav() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="flex h-full flex-col p-3 md:p-3">
      <div className="border-t border-border/60 -ml-3 md:ml-0 bg-background/95 backdrop-blur-md h-16 justify-evenly fixed z-50 flex-1 w-full md:relative md:h-full bottom-0 md:border-none flex flex-row md:justify-between items-center md:items-stretch md:flex-col p-1.5 md:p-0">
        <div className="flex flex-row md:flex-col gap-1 w-full min-w-0">
          <Logo />
          <NavLinks />
          <ProfileLink user={user} />
        </div>

        <div className="hidden md:flex relative md:mt-auto w-full pt-3 border-t border-border/40">
          <MoreDropdown />
        </div>
      </div>
    </div>
  );
}

export default SideNav;