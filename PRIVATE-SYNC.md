# Privat innhold mellom PC og laptop

Dette er en ny, separat del av Shared library. Sanggrupper og PMXA/PMX-tilgang gir aldri tilgang til et privat bibliotek. Privat synkronisering bruker en egen PMXP-nøkkel, som bare skal brukes på egne maskiner.

## Status

Klient, kryptering, logisk innholdseksport, konfliktdialog og testbar tjenestekjerne er implementert. Produksjonstjenesten er **ikke oppdatert**, og funksjonen er ikke aktivert for brukerens profiler. Ingen installer eller ny utgivelse er publisert. Native Electron-test gjenstår på en maskin med installerte avhengigheter.

## Bruk når tjenesten er oppdatert

1. Åpne Shared library og velg Create private library.
2. Kopier den private nøkkelen og oppbevar den sikkert. Ingen passordtilbakestilling finnes.
3. Kryss av Enable private sync og trykk Sync private content.
4. På den andre maskinen: Connect another computer, lim inn PMXP-nøkkelen og aktiver privat synkronisering.
5. Trykk Sync private content på maskinene når innholdet skal oppdateres. Dette er foreløpig manuell synkronisering, uavhengig av sanggruppens automatiske intervall.

Det overføres sanger, møtemapper med kjøreplan, innstillinger, lagret bakgrunn, importert Bibel, lagrede videoer, YouTube-lenker og konverterte PowerPoint-lysbilder. Midlertidig fremvisning av en uspart PDF eller en fil utenfor appens presentasjonsmappe inngår ikke. Videoer/YouTube fungerer fortsatt etter sine vanlige offline-/nettbetingelser.

Første synkronisering forener innholdet. Senere brukes en treveis sammenligning med sist anvendte innhold. Uavhengige tillegg beholdes. Uendrede kopier følger endringer og slettinger. Motstridende versjoner beholdes i konfliktdialogen. Keep current beholder den aktive versjonen; Use incoming erstatter den etter et uttrykkelig valg. Det opprettes også fem lokale sjekkpunkter under `private-sync-checkpoints` i appdatamappen. Disse inneholder privat innhold og skal aldri legges i Git. De er logiske JSON-eksporter, ikke Chromium-databaser.

## Tekniske grenser

- PMXP inneholder 256 tilfeldige bits. Separate HMAC-avledninger gir tjenestetoken og AES-256-GCM-nøkkel. Bare nøkkelens beskyttede Windows-kopi lagres i `private-access.enc`; rendereren får ikke nøkkelen gjennom IPC. Utklippstavlen brukes bare etter Copy private key.
- Tjenesten lagrer tokenhash og autentiserte, krypterte innholdsbiter. Private data er ende-til-ende-kryptert. Vanlig sangdeling beholder sin eksisterende modell.
- Gzip før kryptering, biter på 128 KiB, deterministisk HMAC-avledet nonce per identisk bit for gjenbruk av uendret kryptert innhold. Integritet kontrolleres både med hash og GCM-tag.
- Revisjonskontroll avviser samtidige manifestoppdateringer. En avvist synkronisering endrer ikke den andre maskinens publiserte versjon. Prøv på nytt for å forene endringene.
- Privat synkronisering er av etter oppretting/gjenoppretting og overfører ingenting før uttrykkelig aktivering og Sync. Ingen appprofil lastes opp til en sanggruppe.
- Grenser i denne implementasjonen: 160 MiB binære medier, 256 MiB logisk JSON per overføring, 512 MiB lagrede krypterte biter per privat bibliotek. Eldre biter beholdes for å unngå å slette pågående nedlastinger. En trygg oppryddings-/retensjonsjobb og mer effektiv overføring av svært store videobiblioteker gjenstår. Lagringsgrensen vises som feil; ingen lokal data slettes når den nås.
- Konverterte PNG-er får innholdsbaserte lokale stier. Forskjellige lokale filer overskrives aldri. Manglende/ukjente filstier avbryter synkroniseringen.
- Innhold leses gjennom appens objekter og IndexedDB-transaksjoner. Åpne Chromium-databaser kopieres ikke. Lokal endring under nettverksarbeidet hindrer anvendelse og krever en ny synkronisering. Sanggruppens klient og privat synkronisering kjører ikke samtidig.
- Det finnes ingen nøkkelrotasjon eller permanent sletting av privat tjenestelagring i denne første utgaven. Disconnect fjerner bare denne maskinens beskyttede tilgang; kopier og skyinnhold beholdes.

## Oppdater den eksisterende tjenesten

Eksisterende Sites-prosjekt: `appgprj_6ad725d515548191a4a312921bd8405e`, offentlig tilkoblingsside med autentiserte private API-er. Bevar gjeldende publikum og sanggruppenes tabeller/data.

1. Åpne eksisterende Sites-kilde med Sites-arbeidsflyten. På denne maskinen feilet henting fra kilde-Git på grunn av blokkert nettverk. Det finnes ingen ferdig endret eller publisert Sites-kopi i denne oppgaven.
2. Overfør `shared-service/library-api.mjs` og den nye `private-api.mjs` til tjenestens API-kjerne. Bevar eksisterende adapter/ruting. Alle metoder under `/api/v1/private` må sendes til samme handler før gruppeautentisering.
3. Legg `shared-service/private-schema.sql` til som en ny, additiv versjonert D1-migrering. Oppdater tjenestens Drizzle-skjema slik at tabellene beholdes i fremtidige migreringer. Ikke opprett eller tøm gruppetabellene på nytt.
4. Bygg og test tjenesten med migreringen, og publiser med samme prosjekt-ID. Desktopens origin i `shared-config.json` er uendret. Tjenesten må gi en tydelig feil på ukjent privat nøkkel og aldri akseptere en gruppeinvitasjon som privat tilgang.
5. Kjør native klienttest og en test med syntetiske profiler mot oppdatert tjeneste før faktisk appinnhold aktiveres. Ikke bruk en ekte tilgangsnøkkel som testdata.

## Kontroller

`npm test`: enhetstester, inkludert to private klienter mot en isolert SQLite-tjeneste, kryptering, isolasjon, slettinger, konflikter, revisjoner, filstier og feiltilfeller.

`npm run test:private`: separat nettlesertest av ekte appkode og levende IndexedDB-/localStorage-lagre. Krever Playwright Chromium. Ved eksisterende Chrome kan `PROMAX_BROWSER_PATH` settes til nettleserens exe. Testen lager og fjerner egne syntetiske profiler og skriver et skjermbilde til ignorert `test-results`.

`npm run test:desktop` og `npm run test:shared` krever Electron og må også bestå før en apputgivelse. Browser-testens desktop-bro er en testadapter, ikke bevis på native safeStorage/IPC-oppstart.
