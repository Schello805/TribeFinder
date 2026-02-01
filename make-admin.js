const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const emailArg = process.argv[2];

  const user = emailArg
    ? await prisma.user.findUnique({ where: { email: String(emailArg) } })
    : await prisma.user.findFirst();
  
  if (!user) {
    if (emailArg) {
      console.log(`❌ Kein Benutzer mit Email '${emailArg}' gefunden.`);
      console.log('Bitte prüfe die Email oder registriere dich erst auf der Webseite.');
    } else {
      console.log('❌ Kein Benutzer in der Datenbank gefunden.');
      console.log('Bitte registriere dich erst auf der Webseite.');
    }
    return;
  }

  // Update zum Admin
  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'ADMIN' },
  });

  console.log(`✅ Benutzer '${user.email}' wurde erfolgreich zum ADMIN befördert.`);
  console.log('Bitte logge dich einmal aus und wieder ein, damit die Änderungen wirksam werden!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
