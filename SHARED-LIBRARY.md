# Felles sangbibliotek

Åpne **Shared library** i Windows-programmet. Velg navnet ditt og ett av tre valg:

- **Off:** ingen automatisk kontakt med fellesbiblioteket.
- **Receive only:** hent gruppens sanger uten å laste opp egne.
- **Receive & share:** hent sanger og del de egne sangene du velger.

Opprett en gruppe, eller lim inn en invitasjonskode/lenke fra eieren. Ingen konto kreves. Å bli med laster aldri opp sanger. **Share selected song** og **Share my library…** krever et eget valg. Bare sanger og lysbilder deles; bakgrunnsbilder, videoer og PDF-filer holdes lokale. Del bare innhold du har tillatelse til å dele.

Programmet synkroniserer omtrent hvert minutt når det er åpent og mottak er aktivert. **Sync now** gjør det med en gang. Endringer i egne sanger som allerede er delt, lastes opp ved synkronisering. Mottatte sanger blir aldri automatisk delt videre. Gruppen støtter opptil 100 medlemmer, 1 000 sanger og 10 MiB med sangtekst/lysbilder.

Lokale sanger kan brukes uten internett. En urørt mottatt sang oppdateres på stedet. Hvis du har redigert den, eller den er valgt i arbeidsområdet, beholdes den og en nyere delt versjon legges til separat. Fjerning fra gruppen sletter ikke kopier som allerede finnes på andres maskiner.

## Invitasjoner og tilgang

Eieren kopierer en hemmelig invitasjonslenke fra programmet og sender den privat til venner. Den varer 30 dager. Alle med invitasjonen kan bli med. **Replace invitation…** erstatter gamle invitasjoner. **Manage people → Remove** fjerner medlemmet og ugyldiggjør alle eksisterende invitasjoner samtidig.

Under **Access & disconnect** kan alle kopiere sin personlige tilgangsnøkkel. Oppbevar den privat. Den gjenoppretter samme medlem på en annen maskin; eierens nøkkel gjenoppretter også gruppeadministrasjon. Det finnes ingen passordtilbakestilling. Invitasjon og personlig tilgangsnøkkel er to forskjellige ting.

Tilgangsnøkkelen lagres kryptert av Windows, utenfor sangbiblioteket. Eksport og sikkerhetskopier inneholder ingen tilgangsnøkler. Nettjenesten lagrer hashverdier av tilgang og invitasjoner. Sangtekst lagres på tjenesten, og gruppemedlemmer kan lese og lagre den; dette er ikke ende-til-ende-kryptering.

## Drift og utvikling

Nettjenesten er publisert med Sites, med privat gruppeinnhold bak invitasjons- og medlemskontroll. Den faste adressen finnes i `shared-config.json`. Klientens nettverkskall skjer i Electron-hovedprosessen og følger ikke videresendinger. Nettleserversjonen støtter fortsatt lokal import/eksport, mens grupper krever Windows-programmet.

`shared-service/library-api.mjs` og `schema.sql` er tjenestens testbare kjerne. Sites-kildeprosjektet har eget administrert Git-repository, Vinext-grensesnitt, Drizzle-skjema og versjonerte D1-migreringer. Endringer i API-kjernen må også publiseres i tjenesten. Kjør `npm test`, `npm run test:desktop` og `npm run test:shared` før en utgivelse. Sistnevnte starter en isolert testtjeneste og to separate app-profiler; den sender ingen virkelige sanger til nettet.
