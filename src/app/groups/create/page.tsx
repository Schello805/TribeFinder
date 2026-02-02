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
        <h1 className="tf-display text-3xl font-bold text-[var(--foreground)]">Neue Gruppe erstellen</h1>
        <p className="text-[var(--muted)] mt-2">In wenigen Schritten zur eigenen Tanzgruppe</p>
      </div>
      <GroupCreateWizard />
    </div>
  );
}
