import React from 'react';

export default function ImpressumPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8 bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow rounded-lg">
      <h1 className="tf-display text-3xl font-bold text-[var(--foreground)] mb-8">Impressum</h1>

      <div className="space-y-6 text-[var(--muted)]">
        <section>
          <h2 className="tf-display text-xl font-semibold text-[var(--foreground)] mb-2">Angaben gemäß § 5 TMG</h2>
          <p>
            Michael Schellenberger<br />
            91572 Bechhofen
          </p>
          <p className="mt-2">
            Privatperson / Betreiber dieser Website
          </p>
          <p className="mt-2">
            Online-Angebot: tribefinder.de
          </p>
        </section>

        <section>
          <h2 className="tf-display text-xl font-semibold text-[var(--foreground)] mb-2">Kontakt</h2>
          <p>
            Telefon: 09822/9899386<br />
            E-Mail: info@schellenberger.biz
          </p>
        </section>

        <section>
          <h2 className="tf-display text-xl font-semibold text-[var(--foreground)] mb-2">Redaktionell verantwortlich</h2>
          <p>
            Michael Schellenberger<br />
            91572 Bechhofen
          </p>
        </section>

        <section>
          <h2 className="tf-display text-xl font-semibold text-[var(--foreground)] mb-2">Haftung für Inhalte</h2>
          <p>
            Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
          </p>
          <p className="mt-2">
            Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
          </p>
        </section>
      </div>
    </div>
  );
}
