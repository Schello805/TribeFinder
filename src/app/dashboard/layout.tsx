import DashboardNav from "@/components/user/DashboardNav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <h1 className="tf-display text-3xl font-bold text-[var(--foreground)]">Mein Bereich</h1>
      <DashboardNav />
      {children}
    </div>
  );
}
