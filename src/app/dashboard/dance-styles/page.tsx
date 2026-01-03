import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DanceStylesEditor from "@/components/user/DanceStylesEditor";

export default async function DashboardDanceStylesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Tanzstile</h2>
      <DanceStylesEditor />
    </div>
  );
}
