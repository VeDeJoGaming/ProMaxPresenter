# ProMax Presenter 1.3.0 – lokalt arbeid 22. oktober 2026

Gjeldende kode: `C:\ProMaxPresenter\release-work`. Les også `C:\ProMaxPresenter\FORTSETT-1.2.0.md` for restaureringshistorikk og private sikkerhetskopier.

## Endringer

- 42 visuals: alle de opprinnelige 22, åtte nye GPU-scener med Canvas-reserve og A/B/C-varianter, tolv nye animerte SVG-er. Totalt 24 prosedyrestiler og 18 SVG-løkker med statiske posters. Alle følger installasjonen og virker uten nett.
- Nye scener: dusk-ridges, tidal-caustics, petal-canopy, boreal-mist, celestial-arcs, lunar-eclipse, contour-dunes, luminous-vault.
- Nye SVG-er: Fjordlys, Stjernebris, Morgengry, Skogro, Lyskapell, Stille hav, Ildglød, Silkeløp, Fjellnatt, Regnglass, Kobberhvelv og Måneskog. Originalseks er byte-identiske med 1.2.0.
- Galleri med søk i navn/kategorier/stikkord, favoritter, eksempeltekst, tastaturnavigering og redusert bevegelse. Synlige miniatyrer lastes ved behov og bare én triptyk animeres. Åpning målte omtrent 50 ms på denne PC-en.
- Rettet synkronisering: samme medlem mottar nå også egne tidligere delte sanger ved gjenoppretting på en annen maskin. Én avvist automatisk opplasting blokkerer ikke lenger mottak; feilen vises i dialogen.

## Avgrensing av deling

Fellesbiblioteket er fortsatt invitasjonsbasert sangdeling. Nedlastede sanger merkes som mottatte og deles ikke automatisk videre. Dette er ikke full, toveis speiling av hele brukerprofilen. Nettjenesten svarte normalt under undersøkelsen; ingen produksjonssanger eller gruppedata ble endret. Rettelsene er i desktop-klienten og trenger den nye appversjonen.

## Kontroller

- 42 enhetstester.
- Tre isolerte delingsprofiler: uttrykkelig deling, mottak, revisjoner, konfliktbevaring, tilbakekalling, kryptert tilgang og gjenoppretting av eier på en ny profil uten duplikater.
- Alle 18 installerte SVG-løkker, 72 prosedyrevarianter, periodiske overganger og Canvas-reserve.
- Synlig galleritest: søk, stikkord, favoritter etter omstart, tastatur, tekst, redusert bevegelse, opprydding og kompakt visning.
- Native smoke/feature/release-test med syntetisk PowerPoint, Bibelen og medier. Bakgrunnsoverganger målte omtrent 60 fps på denne PC-en.
- Full sikkerhetskopi og gjenoppretting i separate profiler.
- Pakket 1.3.0-app: oppstart/omstart og alle 42 bakgrunner, synlig galleritest og native smoke/feature/release-test bestod. Pakkede visual- og delingsfiler er byte-identiske med endelig kilde.

`npm run test:visuals` kjører galleritesten; den støtter også en pakket exe som første argument. Den lange rendertesten bruker skjult vindu og krever derfor ikke at IntersectionObserver har lastet synlige miniatyrer; galleriet kontrolleres separat i et synlig testvindu.

## Bygg og brukerdata

Versjonen i package.json og låsefil er 1.3.0. Ferdig og testet lokal installer ligger i `dist\ProMax-Presenter-Setup-1.3.0.exe` (111 830 228 byte). SHA256: `40fae598558be4938930931d08c895ed09e59100bffe2403352028fdf667a895`. Sjekksummer for installer, blockmap og oppdateringsmetadata er i `dist\SHA256SUMS-1.3.0.txt`.

Ingen GitHub-commit, push eller publisering ble utført. Appen i brukerens vanlige installasjonsmappe er fortsatt den tidligere installerte 1.2.0 til brukeren installerer oppdateringen. Ingen privat profil er overskrevet. Original 1.2.0-installer er bevart.

Denne maskinen har pnpm-struktur i node_modules og mangler npm i PATH. For lokal bygging måtte den eksisterende interne pnpm-låsen midlertidig kopieres til pnpm-lock.yaml slik at electron-builder valgte korrekt samler. Kopien ble fjernet etter bygg. Vanlig npm ci på GitHub bruker package-lock.json som før. Se `artifacts\release-build-1.3.0.log`.

Bevar `C:\ProMaxPresenter-Transfer` og `C:\ProMaxPresenter-Backups`. Ikke bygg de gamle løse 1.0.3-filene. Ingen private sanger, bibeltekster, medier, profiler eller tilgangsnøkler skal legges i Git eller installasjonsfilen.
