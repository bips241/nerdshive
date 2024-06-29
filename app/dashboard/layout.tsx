import SideNav from "@/components/SideNav";
export default function DashboardLayout({
  children,
}:{
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
        <div>
            <SideNav/>
        </div>
    </div>
  );
}
