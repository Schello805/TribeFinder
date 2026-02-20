import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hilfe",
};

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="tf-display text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
          Hilfe
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          TribeFinder hilft dir dabei, Tanzgruppen und Events zu finden, dich zu vernetzen und auf dem Laufenden zu bleiben.
          Hier findest du einen kurzen Überblick, was du in der App machen kannst.
        </p>
      </header>

      <div className="space-y-6">
        <section className="bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="tf-display text-xl font-bold mb-2">🗺️ Karte</h2>
          <p className="text-[var(--muted)]">
            Auf der Karte siehst du Gruppen und (wenn aktiviert) Events in deiner Nähe. Nutze die Filter, um nur bestimmte Tanzstile
            oder nur Gruppen/Events anzuzeigen.
          </p>
        </section>

        <section className="bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="tf-display text-xl font-bold mb-2">� Tänzerinnen</h2>
          <p className="text-[var(--muted)]">
            In der Tänzerinnen-Übersicht kannst du Profile finden und nach Kriterien filtern (z.B. Unterricht/Workshops).
            Wenn du selbst sichtbar sein möchtest, kannst du das in deinem Profil aktivieren.
          </p>
        </section>

        <section className="bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="tf-display text-xl font-bold mb-2">� Gruppen</h2>
          <p className="text-[var(--muted)]">
            Du kannst Gruppen entdecken, Favoriten speichern und Profile ansehen. Wenn du selbst eine Gruppe betreibst, kannst du einen
            Steckbrief erstellen, Bilder hochladen und Mitglieder verwalten.
          </p>
        </section>

        <section className="bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="tf-display text-xl font-bold mb-2">🧩 Gruppen-Details (neu)</h2>
          <p className="text-[var(--muted)]">
            Bei Tanzstilen kannst du jetzt auswählen, ob ihr vor allem Impro macht, Choreo oder beides.
            Zusätzlich gibt es ein optionales Feld für Accessoires (z.B. Schleier, Fächer), das im Gruppenprofil angezeigt wird.
          </p>
        </section>

        <section className="bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="tf-display text-xl font-bold mb-2">📅 Events</h2>
          <p className="text-[var(--muted)]">
            Events zeigen dir Workshops, Auftritte oder Treffen. Je nach Event kannst du teilnehmen bzw. dich registrieren.
            Auf Event-Seiten findest du Datum, Ort, ggf. Flyer und weitere Infos.
          </p>
        </section>

        <section className="bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="tf-display text-xl font-bold mb-2">🖼️ Uploads</h2>
          <p className="text-[var(--muted)]">
            Beim Hochladen von Bildern (z.B. Gruppenlogo oder Event-Flyer) gibt es eine Maximalgröße.
            Wenn ein Upload fehlschlägt, bekommst du jetzt eine klarere Fehlermeldung (z.B. &quot;Datei zu groß&quot;).
          </p>
        </section>

        <section className="bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="tf-display text-xl font-bold mb-2">💃 Tanzstile</h2>
          <p className="text-[var(--muted)]">
            Die Standard-Tanzstile wurden ergänzt. Falls du „Oriental Fusion“ suchst, sollte es jetzt in der Liste auftauchen.
          </p>
        </section>

        <section className="bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="tf-display text-xl font-bold mb-2">🛍️ Second-Hand</h2>
          <p className="text-[var(--muted)]">
            Im Second-Hand Bereich kannst du Inserate erstellen, durchsuchen und Kontakt mit anderen aufnehmen.
            Beim Erstellen/Bearbeiten sind einige Felder Pflicht (z.B. PLZ/Ort, Titel und Beschreibung). Der Preis ist bei „Ich biete“ Pflicht,
            bei „Ich suche“ optional.
            Wenn PLZ und Ort möglicherweise nicht zusammenpassen, bekommst du einen Hinweis – speichern ist trotzdem möglich.
          </p>
        </section>

        <section className="bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="tf-display text-xl font-bold mb-2">💬 Nachrichten</h2>
          <p className="text-[var(--muted)]">
            Über Nachrichten kannst du dich direkt mit anderen austauschen – z.B. für Kooperationen, Nachfragen oder Organisationsdetails.
            Bei neuen Direktnachrichten kannst du (wenn aktiviert) eine E-Mail Benachrichtigung erhalten.
          </p>
        </section>

        <section className="bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="tf-display text-xl font-bold mb-2">⚙️ Profil & Einstellungen</h2>
          <p className="text-[var(--muted)]">
            In deinem Profil kannst du deine Angaben pflegen. Du kannst außerdem Benachrichtigungen verwalten und – je nach Setup –
            E-Mail-Funktionen wie Verifizierung und Passwort-Reset nutzen.
          </p>
        </section>

        <section className="bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="tf-display text-xl font-bold mb-2">🛠️ Wartungsmodus</h2>
          <p className="text-[var(--muted)]">
            Wenn Wartungsmodus aktiv ist, sind Änderungen und Uploads vorübergehend deaktiviert. Du kannst dann weiterhin navigieren und
            Inhalte ansehen, aber Speichern/Erstellen/Löschen ist nicht möglich.
          </p>
        </section>

        <section className="bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="tf-display text-xl font-bold mb-2">✉️ Feedback</h2>
          <p className="text-[var(--muted)]">
            Unten in der App findest du ein Feedback-Widget. Wenn dir etwas auffällt (Bug, Verbesserungsidee, unklare Stelle), schick
            gerne eine kurze Nachricht – das hilft bei der Weiterentwicklung.
          </p>
        </section>
      </div>
    </div>
  );
}
