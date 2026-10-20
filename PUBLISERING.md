# Publisering av ProMax Presenter

## Første gang

1. Repositoryet er [VeDeJoGaming/ProMaxPresenter](https://github.com/VeDeJoGaming/ProMaxPresenter). Hold det offentlig slik at oppdateringer kan lastes ned uten innlogging. Prosjektet er foreløpig merket `UNLICENSED`: ingen åpen kildekodelisens er valgt. Avklar lisens før du eventuelt vil gi andre rett til å videreutvikle koden.
2. Pakk ut `ProMax-Presenter-source.zip` og legg **innholdet** i repositoryet, inkludert `.github`, `build` og `package-lock.json`. Ikke last opp selve ZIP-filen, `node_modules`, `dist`, sertifikater eller personlige sangbibliotek.
3. Åpne **Actions → Build Windows release → Run workflow**. Skriv `1.0.0` første gang.
4. Vent til kjøringen er grønn. Under **Releases** ligger et utkast med installasjonsfil og oppdateringsfiler. Last ned installasjonsfilen og prøv den på en Windows-maskin.
5. Skriv hva som er nytt og trykk **Publish release** når du er fornøyd. Brukerne laster ned `ProMax-Presenter-Setup-1.0.0.exe`.

Byggingen skriver riktig GitHub-adresse inn i appen automatisk. GitHub-tokenet brukes bare under bygging; det følger ikke med programmet. Behold samme repository, `appId`, produktnavn og installasjonstype ved senere oppdateringer. Ikke omdøp eller slett repositoryet som installerte programmer bruker.

## Nye oppdateringer

1. Legg de nye programfilene på GitHub.
2. Kjør **Build Windows release** med et høyere versjonsnummer, for eksempel `1.0.1`.
3. Test installasjonsfilen fra utkastet, skriv endringene og publiser utgivelsen.

Installerte programmer ser etter en ny versjon noen sekunder etter oppstart. Brukeren kan også trykke **Check for updates**. Deretter holder det å trykke **Update**: programmet laster ned, kontrollerer filen, tar en sikkerhetskopi av sangbiblioteket, installerer og starter igjen. Internett trengs bare til oppdateringen. Presentasjonsvinduet må være lukket før omstart. Det skjer aldri automatisk omstart uten at brukeren har startet en oppdatering.

Behold **alle** filene som byggingen legger i utgivelsen, særlig `.exe`, `.exe.blockmap` og `latest.yml`. Publiser en vanlig stabil utgivelse, ikke en prerelease. En publisert versjon skal aldri erstattes med andre filer: lag et nytt versjonsnummer. Oppdateringsrutinen tillater ikke nedgradering.

## Test oppdateringen før bred distribusjon

1. Installer den publiserte `1.0.0` på en testmaskin. Opprett en sang og legg til en bakgrunn.
2. Bygg og publiser `1.0.1` i samme repository.
3. Åpne `1.0.0`, trykk **Update** og kontroller at programmet starter som `1.0.1`, med sang, snarveier og bakgrunn bevart.
4. Kontroller også frakoblet bruk og at en åpen presentasjon utsetter installasjonen.

Denne testen krever to ekte publiserte versjoner. Den vedlagte installasjonsfilen er bygget med oppdateringsadressen `VeDeJoGaming/ProMaxPresenter`, men finner ingen oppdatering før utgivelsen er publisert. En lokal installasjonsfil fra `npm run dist` har bevisst ingen oppdateringsadresse.

## Signering før offentlig distribusjon

Det lokale prøvebygget er **usignert**. Windows kan vise en advarsel om ukjent utgiver. For en offentlig utgivelse bør installasjonsfilene signeres med et Windows-kodesigneringssertifikat. Velg utgivernavn og bruk samme sertifikatutgiver i senere oppdateringer.

For PFX-signering legger du Base64-innholdet av sertifikatet i GitHub Actions-hemmeligheten `WINDOWS_CERTIFICATE` og passordet i `WINDOWS_CERTIFICATE_PASSWORD`. Kryss av **Require a signing certificate** i arbeidsflyten. Byggingen stopper hvis signering mislykkes. En signatur gir også oppdatereren mulighet til å kontrollere utgiveren; nedlastede filer kontrolleres i tillegg mot oppdateringsmetadataenes sjekksum. Signering garanterer ikke at alle Windows-omdømmevarsler forsvinner umiddelbart.

## Lokal utvikling og bygging

Installer Node.js 24 og kjør:

```powershell
npm ci
npm start
npm test
npm run test:desktop
npm run dist
```

Installasjonsfilen ligger i `dist`. Sluttbrukeren trenger verken Node.js eller en nettleserserver.

`npm run dist:release` bruker `VeDeJoGaming/ProMaxPresenter` fra `release-config.json` og bygger filene uten å publisere dem. Hvis du vil bruke et annet repository, opprett `release-config.local.json`:

```json
{ "repository": "DITT-BRUKERNAVN/DITT-REPOSITORY" }
```

Kjør deretter `npm run dist:release`. Ved manuell opplasting må samme `.exe`, `.blockmap` og `latest.yml` lastes opp til en GitHub-utgivelse med samme versjonsnummer. Endre adressen før den første distribusjonen dersom du velger et annet repository; installerte programmer husker adressen de ble bygget med.

## Sanger, lagring og personvern

Sanger, innstillinger og bakgrunner lagres i brukerprofilen under `%APPDATA%\ProMax Presenter`. Oppdateringer erstatter programfilene og beholder denne mappen. Før en oppdatering lagres en JSON-kopi i `backups`; de siste ti beholdes. Disse kopiene inneholder sanger og innstillinger, ikke mediefilene. De kan hentes inn igjen med **Import library**.

Ved flytting fra nettleserversjonen: trykk **Export library** i den gamle nettleseren, og **Import library** i Windows-programmet. Bakgrunner må velges på nytt. Nettleserens data kan ikke hentes automatisk av skrivebordsprogrammet.

Det finnes ingen konto, statistikkinnsamling eller automatisk deling av sanger. Oppdateringssjekken kontakter GitHub. JSON-eksport kan deles manuelt med noen du ønsker; importen legger til sanger uten å overskrive eksisterende. Del bare innhold du har lov til å dele.

Idé for senere: et felles sangbibliotek med tre tydelige valg — **motta**, **motta og dele**, eller **ingen av delene**. Dette er ikke implementert, og ingen sanger lastes opp nå.
