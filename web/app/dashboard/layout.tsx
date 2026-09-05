import SideNav from "@/components/SideNav";
import { FeedProvider } from "@/components/FeedProvider";
import { Toaster } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen relative flex-col md:flex-row md:overflow-hidden bg-background">
      <div className="w-20 flex-none lg:w-60 md:border-r border-border/60">
        <SideNav />
        <Toaster />
      </div>
      <div className="flex-grow mt-12 md:mt-0 flex-1 w-full md:overflow-y-auto sm:px-6 md:px-8 py-6 max-w-7xl mx-auto">
        <FeedProvider>
          {children}
        </FeedProvider>
      </div>
    </div>
  );
}