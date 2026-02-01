import React from 'react';

export default function DatenschutzPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8 bg-white shadow rounded-lg">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Datenschutzerklärung</h1>

      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Datenschutz auf einen Blick</h2>
          <h3 className="font-medium text-gray-900 mt-4">Allgemeine Hinweise</h3>
          <p>
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
          </p>
          <h3 className="font-medium text-gray-900 mt-4">Datenerfassung auf dieser Website</h3>
          <p>
            <strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong><br />
            Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
          </p>
          <p className="mt-2">
            <strong>Wie erfassen wir Ihre Daten?</strong><br />
            Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie in ein Kontaktformular eingeben oder bei der Registrierung angeben.
          </p>
          <p className="mt-2">
            Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Hosting</h2>
          <p>
            Diese Website wird privat betrieben und auf einem Server in Deutschland gehostet.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">3. Öffentliche Inhalte</h2>
          <p>
            Inhalte wie Gruppenprofile, Events und Beiträge können öffentlich sichtbar sein und von Suchmaschinen indexiert werden. Bitte veröffentliche keine personenbezogenen Daten,
            die nicht öffentlich werden sollen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">4. Allgemeine Hinweise und Pflichtinformationen</h2>
          <h3 className="font-medium text-gray-900 mt-4">Datenschutz</h3>
          <p>
            Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">5. Datenerfassung auf dieser Website</h2>
          <h3 className="font-medium text-gray-900 mt-4">Cookies</h3>
          <p>
            Unsere Internetseiten verwenden so genannte „Cookies“. Cookies sind kleine Textdateien und richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder dauerhaft (permanente Cookies) auf Ihrem Endgerät gespeichert. Session-Cookies werden nach Ende Ihres Besuchs automatisch gelöscht.
          </p>
          
          <h3 className="font-medium text-gray-900 mt-4">Matomo (ehemals Piwik)</h3>
          <p>
            Diese Website benutzt den Open Source Webanalysedienst Matomo. Matomo wird von uns selbst betrieben (Self-Hosting). Die durch Matomo erhobenen Informationen über die Benutzung dieser Website werden auf unserem Server gespeichert. Die IP-Adresse wird vor der Speicherung anonymisiert.
          </p>
          <p className="mt-2">
            Mit Hilfe von Matomo sind wir in der Lage, Daten über die Nutzung unserer Website durch die Websitebesucher zu erfassen und zu analysieren. Hierdurch können wir u. a. herausfinden, wann welche Seitenaufrufe getätigt wurden und aus welcher Region sie kommen. Außerdem erfassen wir verschiedene Logdateien (z. B. IP-Adresse, Referrer, verwendete Browser und Betriebssysteme) und können messen, ob unsere Websitebesucher bestimmte Aktionen durchführen (z. B. Klicks).
          </p>
          <p className="mt-2">
            Die Nutzung dieses Analyse-Tools erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Der Websitebetreiber hat ein berechtigtes Interesse an der anonymisierten Analyse des Nutzerverhaltens, um sowohl sein Webangebot als auch seine Werbung zu optimieren. Sofern eine entsprechende Einwilligung abgefragt wurde, erfolgt die Verarbeitung ausschließlich auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TTDSG, soweit die Einwilligung die Speicherung von Cookies oder den Zugriff auf Informationen im Endgerät des Nutzers (z. B. Device-Fingerprinting) im Sinne des TTDSG umfasst. Die Einwilligung ist jederzeit widerrufbar.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">6. Registrierung und Nutzerkonto</h2>
          <p>
            Wenn du ein Nutzerkonto erstellst, verarbeiten wir die von dir angegebenen Daten (z. B. Name, E-Mail-Adresse und Passwort in gehashter Form), um dein Konto zu erstellen,
            dich zu authentifizieren und dir die Nutzung der Plattform zu ermöglichen.
          </p>
          <p className="mt-2">
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertrag/vertragsähnliches Nutzungsverhältnis).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">7. E-Mails</h2>
          <p>
            Für bestimmte Funktionen (z. B. Passwort-Reset) versenden wir E-Mails an die von dir angegebene Adresse. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">8. Plugins und Tools</h2>
          <h3 className="font-medium text-gray-900 mt-4">OpenStreetMap</h3>
          <p>
            Wir nutzen den Kartendienst von OpenStreetMap (OSM). Anbieterin ist die Open-Street-Map Foundation (OSMF), 132 Maney Hill Road, Sutton Coldfield, West Midlands, B72 1JU, United Kingdom.
          </p>
          <p className="mt-2">
            Wenn Sie eine Website besuchen, auf der OpenStreetMap eingebunden ist, werden u. a. Ihre IP-Adresse und weitere Informationen über Ihr Verhalten auf dieser Website an die OSMF weitergeleitet. OpenStreetMap speichert hierzu unter Umständen Cookies in Ihrem Browser oder setzt vergleichbare Wiedererkennungstechnologien ein.
          </p>
          <p className="mt-2">
            Ferner kann Ihr Standort erfasst werden, wenn Sie dies in Ihren Geräteeinstellungen – z. B. auf Ihrem Handy – zugelassen haben. Der Anbieter dieser Seite hat keinen Einfluss auf diese Datenübertragung. Details entnehmen Sie der Datenschutzerklärung von OpenStreetMap unter folgendem Link: <a href="https://wiki.osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">https://wiki.osmfoundation.org/wiki/Privacy_Policy</a>.
          </p>
          <p className="mt-2">
            Die Nutzung von OpenStreetMap erfolgt im Interesse einer ansprechenden Darstellung unserer Online-Angebote und einer leichten Auffindbarkeit der von uns auf der Website angegebenen Orte. Dies stellt ein berechtigtes Interesse im Sinne von Art. 6 Abs. 1 lit. f DSGVO dar.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">9. Server-Fehlerprotokollierung</h2>
          <p>
            Zur Sicherstellung der technischen Stabilität und zur Fehleranalyse protokollieren wir Serverfehler (z. B. Statuscode, betroffene Route, Fehlermeldung und technische Details). Die Protokollierung erfolgt grundsätzlich in pseudonymisierter Form; offensichtliche personenbezogene Daten (z. B. E-Mail-Adressen oder IP-Adressen) werden vor der Speicherung bestmöglich entfernt.
          </p>
          <p className="mt-2">
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der sicheren Bereitstellung des Dienstes).
          </p>
          <p className="mt-2">
            Die Fehlerprotokolle werden nur so lange gespeichert, wie dies für die Fehleranalyse erforderlich ist, und können durch Administratoren gelöscht werden.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">10. Deine Rechte</h2>
          <p>
            Du hast im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf unentgeltliche Auskunft über deine gespeicherten personenbezogenen Daten, deren Herkunft
            und Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten.
          </p>
          <p className="mt-2">
            Hierzu sowie zu weiteren Fragen zum Thema Datenschutz kannst du dich jederzeit an die im Impressum angegebenen Kontaktdaten wenden.
          </p>
        </section>
      </div>
    </div>
  );
}
