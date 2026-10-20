# ProMax Presenter 1.0.2

Bakgrunnsbytter glir nå over i hverandre over 1,5 sekund. Bevegelsesbakgrunnene bruker samme grafikkflate gjennom overgangen. Ved raske gjentatte bytter fortsetter overgangen fra bildet som allerede vises, uten et nytt kutt. Teksten holdes separat, og blackout reagerer umiddelbart.

Bilde- og videobakgrunner får også en myk overgang. Den gamle bakgrunnen beholdes som et stillbilde mens det nye mediet gjøres klart. Overgangene bruker ikke flere aktive bevegelsesbakgrunner eller videodekodere samtidig.

Versjon 1.0.1 gjorde det mulig å lukke Settings, Shortcuts og de andre dialogene ved å klikke utenfor dem.

# ProMax Presenter 1.0

Denne utgaven prioriterer jevn presentasjon, trygg lagring og en enklere ferdig Windows-app.

- Bevegelsesbakgrunnene sikter mot 60 bilder per sekund. Alle de 16 bakgrunnene målte rundt 60 bilder per sekund på denne maskinen med automatisk kvalitet. Ytelsen vil avhenge av maskin og skjerm.
- Automatisk kvalitet tilpasser bakgrunnens oppløsning ved vedvarende lav bildefrekvens. «Smooth playback» gir lavere grafikkbelastning. Teksten vises fortsatt i skjermens fulle oppløsning.
- Lysbildebytter gjenbruker miniatyrer og den aktive animasjonen. Kontrollvinduet bruker enklere forhåndsvisninger og pauser skjulte forhåndsvisninger.
- Videobakgrunner deler et stillbilde i miniatyrene. Inaktive avspillere frigjøres, og maksimalt tre kommende lokale videoer forhåndslastes.
- Blackout fryser lokale videoklipp på riktig sted. Lang bibeltekst tilpasses skjermen med langt færre størrelsesberegninger.
- Settings gir valg av presentasjonsskjerm, grafikkvalitet, full sikkerhetskopiering, gjenoppretting og tilgang til datamappen. Live-status viser også når utgangen er av eller i blackout.
- Ekstra gjenopprettingskopier beskytter sanger, møter og innstillinger. Full sikkerhetskopi inkluderer også bibeltekst, video, bakgrunner, YouTube-lenker og importerte PowerPoint-bilder.
- Full sikkerhetskopi tas mens datalagrene er lukket. Hver fil kontrolleres med størrelse og kontrollsum. Gjenoppretting lager først en sikkerhetskopi av nåværende data.

Start med **Start ProMax.cmd**, eller bruk snarveien på skrivebordet. Åpne **Settings** og behold **Automatic** som standard for grafikkvalitet.

Sanger, møter, redigering/angring, bibelimport, video, PowerPoint, presentasjonsvindu, lagring og full gjenoppretting er testet. YouTube-avspilling trenger internett, og første import av PowerPoint trenger Microsoft PowerPoint. Lokalt lagret innhold fungerer uten internett.

Den forrige utgaven, kildekoden og eksisterende appdata er sikkerhetskopiert i `C:\ProMaxPresenter-Backups\20261015-194546`.
