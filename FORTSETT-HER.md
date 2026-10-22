# Fortsett ProMax på PC eller laptop

Felles utviklingsgren: `work/pc-laptop` i https://github.com/VeDeJoGaming/ProMaxPresenter.

Arbeid i denne grenen på begge maskiner. Hent siste endringer før du begynner, og send ferdig arbeid tilbake til GitHub før du bytter maskin. GitHub beholder en kopi uavhengig av om den andre maskinen er på. `AGENTS.md` instruerer Codex om å gjøre dette ved avslutning av oppgaver. Manuelle filendringer utenfor Codex må lagres med `Lagre prosjekt.cmd`.

## Ytelsesretting 22. oktober 2026

- Arbeidskopien for denne oppgaven ligger i `C:\SoundSync\promax-performance`. `C:\ProMaxPresenter` er bare lesbar i dette kjoremiljoet og er bevart. Kopien inneholder de 157 kildefilene fra `40686b61727b7520b0e71f0d4ba7fa0f712ad206`, verifisert med Git blob-SHA for redigering. Oppdaterte overleveringsnotater fra forrige oppgave er ogsa bevart her. Ingen privat appdata er kopiert.
- Funnet flaskehals: full serialisering, localStorage-skriving og kopiering av angrehistorikk for hvert tastetrykk. Inndata endrer fortsatt modellen umiddelbart; lagring samles etter 250 ms, med maks ett sekund under kontinuerlig skriving. Fokusbytte, ny handling, Ctrl+S, skjuling og lukking fullforer ventende lagring. Eksplisitt `save()` er fortsatt synkron og returnerer feil ved mislykket lagring.
- Sanglisten gjenbruker eksisterende knapper og oppdaterer bare endrede tekster/valg. Sok samles per animasjonsramme. Angrehistorikken unngar a kopiere hele biblioteket ved uendret innhold, og beholder valgte moteelementer i snapshots.
- Electron foretrekker na dedikert GPU med den dokumenterte `force_high_performance_gpu`-bryteren for oppstart. WebGL ba allerede om `high-performance`. Ingen vsync, driverkontroller eller sikkerhetsmekanismer er deaktivert. Faktisk NVIDIA-valg pa brukerens PC er ikke bekreftet; dette ma kontrolleres i en ny native bygging.
- Lokal stressmaling med 1500 syntetiske sanger og ca. 4,85 MB bibliotek: 20 raske tastetrykk brukte ca. 1814 ms i de gamle inndatahandlerne, mot ca. 2 ms etter endringen. Gamle handler skrev hele biblioteket 20 ganger; nye handler skriver null ganger under selve tastebursten og samler lagringen etterpa. Dette er en malingsserie av handlerarbeid, ikke total lagringstid eller et lofte om samme forbedring i alle deler av appen.
- 47 enhetstester og den private toprofiltesten bestod lokalt. Ny `npm run test:ui` tester 1000 sanger, utsatt lagring, angre/gjore om, gjenbruk av rader, sok/rekkefolge/sletting, Ctrl+S, fokusbytte, maksimumsventetid, lukking/omstart og synlig lagringsfeil. Den er lagt til GitHub Windows-kontrollene.
- Oppgaven publiserer kildekoderetting pa `work/pc-laptop`. Installert app og offentlig 1.3.0-release endres ikke automatisk. Native oppstart/integrasjon og faktisk GPU-valg ma bekreftes gjennom GitHub Windows-kontrollene og pa brukerens PC. Neste utgivelse ma bygges og installeres for at rettingen skal gjelde den vanlige appen.

## Status etter arbeid 22. oktober 2026

- Kildekoden fra `work/pc-laptop`, utgangspunkt `4327b64476758135b20d64fa97380a91edcb0f1b`, er hentet til prosjektroten. Alle 147 opprinnelige filer ble kontrollert byte for byte mot GitHub før redigering. Opprinnelige rotfiler er bevart i ignorert `workspace-before-fetch`. Ingen privat brukerprofil ble åpnet, endret eller lastet opp.
- Ny privat synkronisering er implementert i klienten og den testbare tjenestekjernen: egen PMXP-nøkkel, ende-til-ende-kryptering, sanger, møter, Bibel, medier, YouTube, portable PowerPoint-PNG-er, innstillinger, treveis sammenligning og konfliktdialog. Se `PRIVATE-SYNC.md` for nøyaktig status og grenser. Den er manuelt utløst og krever uttrykkelig aktivering.
- Den virkelige nettjenesten er IKKE oppdatert. Eksisterende Sites-prosjekt er `appgprj_6ad725d515548191a4a312921bd8405e`. Sites-kildehenting feilet fordi `git.chatgpt-team.site:443` er blokkert. Neste steg er å åpne eksisterende Sites-kilde, overføre API-filene og legge til `shared-service/private-schema.sql` som en additiv D1-/Drizzle-migrering. Bevar eksisterende sanggrupper og publikum. Instruksjoner i `PRIVATE-SYNC.md`.
- Appen starter uten JavaScript-feil i isolert Chrome. Nettlesertest med to syntetiske profiler verifiserer alle overførte innholdstyper, bærbare filstier, omstart og konflikter. 47 enhetstester består. Enhetstestene omfatter også kryptering, tilgangsisolasjon, slettinger, revisjonsavvisning og avbryting ved pause.
- Native Electron-oppstart og native integrasjonstester er IKKE verifisert her. Node 24.19 og Git finnes; npm finnes ikke i PATH. Tilgjengelig pnpm klarte verken nettinstallasjon (EACCES mot npm-registeret) eller offlineinstallasjon (Electron mangler i cache). Installer normale avhengigheter med `npm ci` på en maskin med nettilgang; kjør `npm test`, `npm run test:private`, `npm run test:desktop` og `npm run test:shared` før utgivelse.
- Viktig lokalt: den opprinnelige `.git`-mappen er skrivebeskyttet av kjøremiljøet. Derfor kunne verken `git fetch` eller lokalt grenbytte utføres. Rotens lokale Git-metadata viser fremdeles `codex/new-visuals`, selv om arbeidsfilene er fra `work/pc-laptop` pluss endringene beskrevet her. Ikke bruk `Lagre prosjekt.cmd` før metadata er forent. Kildehenting og lagring på GitHub gjøres via GitHub-tilkoblingen med kontrollert foreldrecommit. På neste maskin: hent `work/pc-laptop` i en vanlig checkout. På denne maskinen: bevar `workspace-before-fetch` og gjennomgå arbeidsfilene før metadata repareres i et miljø med tillatt Git-skriving. Ikke reset eller force-push.
- Stabil 1.3.0 er nå publisert som nyeste GitHub-utgave: https://github.com/VeDeJoGaming/ProMaxPresenter/releases/tag/v1.3.0. Etter brukerens uttrykkelige ønske om en oppdatering ble `main` hurtigspolt uten force fra `18ce2dede74376d20a1a2471604c0f8ac988aa08` til den tidligere testede `4327b64476758135b20d64fa97380a91edcb0f1b`. Den uferdige private synkroniseringen fra `40686b6` inngår ikke i denne utgaven. Ingen lokal appinstallasjon eller brukerprofil ble endret.
- Utgivelsesjobben https://github.com/VeDeJoGaming/ProMaxPresenter/actions/runs/39851766612 bestod installasjon av avhengigheter, enhetstester, native appstart, galleri, sangdeling, backup, bygging og kontroll av ferdig pakket app. Release er offentlig, ikke draft/prerelease, og inneholder exe, blockmap, latest.yml og SHA256SUMS.txt. Installer: `ProMax-Presenter-Setup-1.3.0.exe`, 111830228 byte, SHA256 `98dfe1492d2216664632b3fa144e166b797b66e260215cabfd99ee92f77cc6de`. Dette er GitHub-byggingen; den tidligere lokale installasjonsfilen i `FORTSETT-1.3.0.md` har en annen sjekksum.
- GitHub Windows-kontrollene for utviklingscommit `40686b6` bestod også: https://github.com/VeDeJoGaming/ProMaxPresenter/actions/runs/39850943685. Dette inkluderer `test:private`, `test:desktop`, `test:visuals` og `test:shared`. Lokale begrensninger over gjelder fortsatt; selve produksjonstjenesten for privat synkronisering er fremdeles ikke oppdatert eller aktivert.
- Installert versjon lot seg ikke bekrefte direkte i denne økten. Snarveien peker på den vanlige installasjonen i LocalAppData, men lesing av app.asar ble avvist av kjøremiljøet. Tidligere overlevering oppga 1.2.0. Brukeren kan nå bruke Check for updates/Update i appen eller laste ned den publiserte 1.3.0-installasjonsfilen.

## Laptop første gang

Installer Git for Windows og logg inn med GitHub-kontoen som har tilgang til prosjektet. Åpne PowerShell i en tom mappe og kjør:

```powershell
git clone --branch work/pc-laptop https://github.com/VeDeJoGaming/ProMaxPresenter.git ProMaxPresenter
```

Åpne den nye `ProMaxPresenter`-mappen som prosjekt i Codex. Den inneholder riktig kildekode og instruksjonene for å fortsette. Eksisterende appdata eller andre arbeidsmapper skal ikke overskrives. Installer utviklingsavhengigheter ved behov med `npm ci`.

Senere: bruk `Hent prosjekt.cmd` før du begynner, og `Lagre prosjekt.cmd` etter manuelle endringer. Hvis begge maskinene har endret prosjektet, stopper hjelpen og ber om at endringene forenes. Den overskriver ikke den andre maskinens arbeid.

Installasjonsfiler og testresultater er ikke med i Git. En annen maskin bygger dem fra koden, eller henter en faktisk publisert utgave fra GitHub Releases.
