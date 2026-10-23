# Publisering av ProMax Presenter

Repository: https://github.com/VeDeJoGaming/ProMaxPresenter

## Ny utgave

1. Gjør endringene i kildekoden. Behold appId `com.promax.presenter`, produktnavnet `ProMax Presenter` og brukerprofilen.
2. Øk versjonen i `package.json` og `package-lock.json`, og oppdater `RELEASE-NOTES.md`.
3. Kjør `npm test`, `npm run test:desktop`, `npm run test:shared` og `npm run test:backup`. Bruk også `npm run verify` på en Windows-PC med PowerPoint ved endringer i den opprinnelige presentasjonsfunksjonaliteten.
4. En versjonsøkning på `main` starter **Build Windows release**. Arbeidsflyten tester kildekode og ferdigpakket app før den publiserer installasjonsfil, `.blockmap`, `latest.yml` og `SHA256SUMS.txt`.
5. Kontroller utgivelsen på Releases og oppdateringsknappen i installert app. Eksisterende utgivelser overskrives ikke.

Manuell kjøring i **Actions → Build Windows release → Run workflow** lager et utkast. Versjonen må samsvare med package.json. Etter kontroll kan utkastet publiseres på GitHub.

## Lokal bygging

`npm ci` etterfulgt av `npm run dist:release` lager installasjon i `dist/`. `release-config.json` angir oppdateringsrepository. `npm run dist` lager en lokal prøveinstallasjon uten oppdateringsfeed.

Alle 29 kuraterte bakgrunner pakkes inn i appen som prosedyrekode og det originale vinterbildet. De gamle SVG-løkkene skal ikke gjeninnføres. `scripts/build-visuals.cjs` bygger den separate, valgfrie gallerisiden fra det gjeldende biblioteket og theme.css.

En vanlig oppdatering krever en ny versjon og en publisert GitHub-utgivelse; å sende kode til `work/pc-laptop` oppdaterer ikke installerte apper. En uttrykkelig bestilt utgivelse kan publiseres fra en kontrollert commit på utviklingsgrenen uten å endre main. Test kildekoden og ferdigpakket app først, last opp kun den nye installasjonsfilen, dens `.blockmap`, `latest.yml` og `SHA256SUMS.txt` til et nytt utkast, og publiser dette som siste stabile utgave etter kontroll. Overskriv aldri en gammel utgivelse. Kontroller at oppdateringsklienten i en eldre installasjon finner den nye versjonen.

Sertifikat kan konfigureres med GitHub-hemmelighetene `WINDOWS_CERTIFICATE` og `WINDOWS_CERTIFICATE_PASSWORD`. Velg `require_signing` for å kreve signering ved manuell bygging. Uten sertifikat er installasjonen usignert.

Ikke last opp personlige bibliotek, appdata, overføringspakker, innlogginger eller sertifikater. `node_modules`, `dist` og lokale testresultater skal ikke ligge i kildekoden. Bevar rådata og sikkerhetskopier lokalt.
