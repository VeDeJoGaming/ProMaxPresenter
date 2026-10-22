# Fortsett ProMax på PC eller laptop

Felles utviklingsgren: `work/pc-laptop` i https://github.com/VeDeJoGaming/ProMaxPresenter.

Arbeid i denne grenen på begge maskiner. Hent siste endringer før du begynner, og send ferdig arbeid tilbake til GitHub før du bytter maskin. GitHub beholder en kopi uavhengig av om den andre maskinen er på. `AGENTS.md` instruerer Codex om å gjøre dette ved avslutning av oppgaver. Manuelle filendringer utenfor Codex må lagres med `Lagre prosjekt.cmd`.

## Status etter arbeid 22. oktober 2026

- Kildekoden fra `work/pc-laptop`, utgangspunkt `4327b64476758135b20d64fa97380a91edcb0f1b`, er hentet til prosjektroten. Alle 147 opprinnelige filer ble kontrollert byte for byte mot GitHub før redigering. Opprinnelige rotfiler er bevart i ignorert `workspace-before-fetch`. Ingen privat brukerprofil ble åpnet, endret eller lastet opp.
- Ny privat synkronisering er implementert i klienten og den testbare tjenestekjernen: egen PMXP-nøkkel, ende-til-ende-kryptering, sanger, møter, Bibel, medier, YouTube, portable PowerPoint-PNG-er, innstillinger, treveis sammenligning og konfliktdialog. Se `PRIVATE-SYNC.md` for nøyaktig status og grenser. Den er manuelt utløst og krever uttrykkelig aktivering.
- Den virkelige nettjenesten er IKKE oppdatert. Eksisterende Sites-prosjekt er `appgprj_6ad725d515548191a4a312921bd8405e`. Sites-kildehenting feilet fordi `git.chatgpt-team.site:443` er blokkert. Neste steg er å åpne eksisterende Sites-kilde, overføre API-filene og legge til `shared-service/private-schema.sql` som en additiv D1-/Drizzle-migrering. Bevar eksisterende sanggrupper og publikum. Instruksjoner i `PRIVATE-SYNC.md`.
- Appen starter uten JavaScript-feil i isolert Chrome. Nettlesertest med to syntetiske profiler verifiserer alle overførte innholdstyper, bærbare filstier, omstart og konflikter. 47 enhetstester består. Enhetstestene omfatter også kryptering, tilgangsisolasjon, slettinger, revisjonsavvisning og avbryting ved pause.
- Native Electron-oppstart og native integrasjonstester er IKKE verifisert her. Node 24.19 og Git finnes; npm finnes ikke i PATH. Tilgjengelig pnpm klarte verken nettinstallasjon (EACCES mot npm-registeret) eller offlineinstallasjon (Electron mangler i cache). Installer normale avhengigheter med `npm ci` på en maskin med nettilgang; kjør `npm test`, `npm run test:private`, `npm run test:desktop` og `npm run test:shared` før utgivelse.
- Viktig lokalt: den opprinnelige `.git`-mappen er skrivebeskyttet av kjøremiljøet. Derfor kunne verken `git fetch` eller lokalt grenbytte utføres. Rotens lokale Git-metadata viser fremdeles `codex/new-visuals`, selv om arbeidsfilene er fra `work/pc-laptop` pluss endringene beskrevet her. Ikke bruk `Lagre prosjekt.cmd` før metadata er forent. Kildehenting og lagring på GitHub gjøres via GitHub-tilkoblingen med kontrollert foreldrecommit. På neste maskin: hent `work/pc-laptop` i en vanlig checkout. På denne maskinen: bevar `workspace-before-fetch` og gjennomgå arbeidsfilene før metadata repareres i et miljø med tillatt Git-skriving. Ikke reset eller force-push.
- Versjon er fortsatt 1.3.0; ingen installer, main-merge eller release er publisert. Privat synkronisering er ikke aktivert i brukerens profiler. Se `FORTSETT-1.3.0.md` for tidligere utgivelsesarbeid.

## Laptop første gang

Installer Git for Windows og logg inn med GitHub-kontoen som har tilgang til prosjektet. Åpne PowerShell i en tom mappe og kjør:

```powershell
git clone --branch work/pc-laptop https://github.com/VeDeJoGaming/ProMaxPresenter.git ProMaxPresenter
```

Åpne den nye `ProMaxPresenter`-mappen som prosjekt i Codex. Den inneholder riktig kildekode og instruksjonene for å fortsette. Eksisterende appdata eller andre arbeidsmapper skal ikke overskrives. Installer utviklingsavhengigheter ved behov med `npm ci`.

Senere: bruk `Hent prosjekt.cmd` før du begynner, og `Lagre prosjekt.cmd` etter manuelle endringer. Hvis begge maskinene har endret prosjektet, stopper hjelpen og ber om at endringene forenes. Den overskriver ikke den andre maskinens arbeid.

Installasjonsfiler og testresultater er ikke med i Git. En annen maskin bygger dem fra koden, eller henter en faktisk publisert utgave fra GitHub Releases.
