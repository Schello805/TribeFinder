import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/user/ProfileForm";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="space-y-2">
      <h2 className="tf-display text-2xl font-bold text-[var(--foreground)]">Profil bearbeiten</h2>
      <p className="text-[var(--muted)]">
        Verwalte deine persönlichen Daten und wie du für andere sichtbar bist.
      </p>

      <ProfileForm />
    </div>
  );
}
