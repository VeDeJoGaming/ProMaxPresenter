# Changelog – arbeidsøkten 29. oktober 2026

Avsluttet 30. oktober etter brukerens beskjed. Endringene er videreutvikling av lokal 1.4.1 på `work/pc-laptop`; de er ikke en ny publisert utgave. Øktens kode går fra `380f1d6` til `831e1c6`. Ved avslutningen er også den nyere poengtellingen fra `4ac10da` hentet uten å overskrive arbeid fra den andre arbeidskopien.

## Møteplan og hurtigfinner

- Ny kjøreplan med starttid, varighet per innslag, samlet tid og beregnet slutt, også over midnatt. Ukjent varighet vises som ukjent i senere klokkeslett.
- Kopier kjøreplan som tekst eller lag en A4-PDF med gjentatte tabelloverskrifter og sidetall. Operatørnotater tas bare med etter et aktivt valg hver gang dialogen åpnes; sangtekst og mediestier følger ikke eksporten.
- Notatpanelet kan vise hele møtets notater eller bare valgt innslag.
- Ctrl+K søker på tvers av sanger, møter, Bibel og medier, med filtre og begrensede resultatlister. Bibeltreff åpner kapittelet med markert vers; medietreff åpner forberedelse.

## Tryggere live-kontroll

- LIVE- og BLACKOUT-merker følger innslaget som faktisk vises, uavhengig av hva operatøren forbereder. Gjentatte forekomster av samme sang skilles fra hverandre.
- «Open live item» går tilbake til riktig møteinnslag. «Open live song» gjør tilsvarende for en sang startet direkte fra biblioteket.
- Å åpne den aktive sangen igjen beholder gjeldende lysbilde og neste-posisjon, uten å sende en ny cue eller endre blackout.
- F5/F6/Escape reagerer én gang når tasten holdes nede. Presentasjonskontroll fungerer også fra den innebygde YouTube-flaten.
- Tomme eller ugyldige forberedelser kobler ikke fra en video eller presentasjon som allerede er live. Gjentatt Enter etter «Read chapter» sender ikke et vers utilsiktet.

## Video og nedtelling

- Lokale videoer har tidslinje, forløpt/gjenstående tid, spoling og hopp på ti sekunder. Pause, blackout og ferdig avspilling får tydelige tilstander.
- Ferdigspilte videoer starter først igjen ved «Replay», også etter omtegning eller lydendring. Forhåndsvisningen er dempet.
- Nedtelling har Pause/Resume, nøyaktig bevart resttid og et monotont tidsgrunnlag. Den ender på 0:00; en ny cue avbryter den slik at et gammelt tidsintervall ikke overskriver annet innhold.

## Sikrere lagring, import og gjenoppretting

- Native autolagring og sluttlagring bruker én kø. Nyeste ventende innhold beholdes, feil kan prøves igjen, og sene autolagringsmeldinger kan ikke overskrive siste godkjente snapshot under avslutning.
- Siste tekstendring tas med ved lukking. Native gjenopprettingslagring forsøkes også når nettleserlagring feiler, og eldre gyldige snapshots kan brukes hvis de nyeste kopiene er skadet.
- Gjenopprettede biblioteker gjøres redigerbare; frosne data fra native-grensesnittet blokkerer ikke lenger endringer.
- For store recovery-data gir en synlig feilmelding og bevarer tidligere godkjente kopier.
- Samtidige videoimporter, fjerning og mediehistorikk behandles i rekkefølge, slik at importene ikke overskriver hverandre. Lagringsfeil etterlater ikke en feilaktig oppdatert liste.
- YouTube-metadata endres først etter vellykket lagring. En sen filtilkobling gjenoppretter ikke en oppføring som allerede er slettet.
- «Attach local copy» bruker nøyaktig videoen fra sitt eget importkall, også ved samtidige importer. Ferdige bakgrunnsoperasjoner overstyrer ikke en nyere valgt arbeidsfane.

## Tastatur og lysbilder

- Clear, Edit og andre knapper bruker vanlig Enter/Space-aktivering. Tastetrykket viser ikke samtidig neste lysbilde.
- Felles tilgjengelige filvelgere for bakgrunn, PDF, Bibel, video og lokale YouTube-kopier, med opptattstatus og trygg tilbakeføring av fokus.
- «Generate slides» beholder ID-er, egne eller tomme hurtigtaster og metadata for uendrede lysbilder. Uendret generering lager ikke et ekstra angresteg.
- Live-posisjonen beholdes når et uendret lysbilde flyttes ved regenerering.
- Dupliserte lokale lysbilde-/møte-ID-er repareres deterministisk uten innholdstap. Valgt møteinnslag følger sin reparerte identitet; reparasjonen er stabil ved omstart.

## Nyere arbeid bevart ved avslutningen

Poengtellingen fra den andre arbeidskopien er inkludert i sluttbygget: tre lag som standard, 2–64 lag, pluss/minus og nøyaktige poeng, delte plasseringer, angre/gjenta, lagring mellom omstarter og egen live-poengtavle som beholder blackout. Dette er separat arbeid fra 30. oktober, ikke en ekstra funksjon laget i den opprinnelige kveldsøkten.

## Kontroller og avgrensning

- Øktens sluttkode bestod 93 enhetstester og full GitHub-kontroll: [40954460850](https://github.com/VeDeJoGaming/ProMaxPresenter/actions/runs/40954460850).
- Med den nyere poengtellingen består 96 enhetstester og [GitHub-kontroll 41034253741](https://github.com/VeDeJoGaming/ProMaxPresenter/actions/runs/41034253741).
- Funksjonene er kontrollert i separate syntetiske profiler fra kilde, ferdig pakke og installert app. Native presentasjon, blackout, tastatur, omstart, lagringsfeil, samtidighet og angre/gjenta inngår der det er relevant.
- Lokal oppdatering er fullført 30. oktober: live-sangretur, filvelgere, poengtavle og komplett-app-test består mot installert exe. Alle 710 aktuelle profilfiler er byte-identiske med en fersk full sikkerhetskopi. Sluttpakken består også full native smoke-/feature-/release-test. Kontrollsummer og videreføringsstatus står øverst i `FORTSETT-HER.md`.
- Varmt mørkt rødt/oransje tema og alle 41 visualfamilier er beholdt. Private sanger, Bibeltekster, medier, profiler og nøkler inngår ikke i Git eller installasjonsfilene. Ingen ny release, tagg eller main-endring er publisert.

En midlertidig mappe med syntetiske recovery-testdata ble liggende etter at automatisk kontroll avviste sletting med «blocked by policy». Ingen privat profil ligger i denne mappen; se videreføringsnotatene.
