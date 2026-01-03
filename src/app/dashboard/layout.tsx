import DashboardNav from "@/components/user/DashboardNav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mein Bereich</h1>
      <DashboardNav />
      {children}
    </div>
  );
}
