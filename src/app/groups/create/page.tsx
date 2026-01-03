import GroupCreateWizard from "@/components/groups/GroupCreateWizard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CreateGroupPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="py-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Neue Gruppe erstellen</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">In wenigen Schritten zur eigenen Tanzgruppe</p>
      </div>
      <GroupCreateWizard />
    </div>
  );
}
