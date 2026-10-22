# Fortsett ProMax på PC eller laptop

Felles utviklingsgren: `work/pc-laptop` i https://github.com/VeDeJoGaming/ProMaxPresenter.

Arbeid i denne grenen på begge maskiner. Hent siste endringer før du begynner, og send ferdig arbeid tilbake til GitHub før du bytter maskin. GitHub beholder en kopi uavhengig av om den andre maskinen er på. `AGENTS.md` instruerer Codex om å gjøre dette ved avslutning av oppgaver. Manuelle filendringer utenfor Codex må lagres med `Lagre prosjekt.cmd`.

## Status 22. oktober 2026

- Lokal 1.3.0 er ferdig bygd og testet: 42 visuals, raskt galleri, to rettelser i sangsynkronisering. Se `FORTSETT-1.3.0.md`.
- Brukeren ønsker både videreføring av utviklingsprosjektet og privat synkronisering av hele appinnholdet mellom PC og laptop.
- GitHub brukes til kildekode og disse notatene. Private appdata skal gå gjennom Shared library.
- Shared library støtter foreløpig sanger. Full synkronisering av møtemapper, Bibelen, medier og innstillinger er ikke implementert eller aktivert. Den må bevare begge maskiners endringer, ha privat tilgang og konflikthåndtering, og aldri kopiere åpne Chromium-databaser direkte.
- Den installerte appen på PC-en er fortsatt tidligere 1.2.0. En lokal installer er ikke det samme som en publisert GitHub-utgave.

## Laptop første gang

Installer Git for Windows og logg inn med GitHub-kontoen som har tilgang til prosjektet. Åpne PowerShell i en tom mappe og kjør:

```powershell
git clone --branch work/pc-laptop https://github.com/VeDeJoGaming/ProMaxPresenter.git ProMaxPresenter
```

Åpne den nye `ProMaxPresenter`-mappen som prosjekt i Codex. Den inneholder riktig kildekode og instruksjonene for å fortsette. Eksisterende appdata eller andre arbeidsmapper skal ikke overskrives. Installer utviklingsavhengigheter ved behov med `npm ci`.

Senere: bruk `Hent prosjekt.cmd` før du begynner, og `Lagre prosjekt.cmd` etter manuelle endringer. Hvis begge maskinene har endret prosjektet, stopper hjelpen og ber om at endringene forenes. Den overskriver ikke den andre maskinens arbeid.

Installasjonsfiler og testresultater er ikke med i Git. En annen maskin bygger dem fra koden, eller henter en faktisk publisert utgave fra GitHub Releases.
