# Fortsett på den stasjonære PC-en

Programoppdateringen og utviklingskoden hentes på to forskjellige måter.

## Bruke programmet

Åpne ProMax Presenter og velg **Check for updates → Update**. Den nye utgaven er **1.4.0**. Den kan også lastes ned fra https://github.com/VeDeJoGaming/ProMaxPresenter/releases/latest . Eksisterende sanger og innstillinger beholdes på PC-en. Personlig innhold er ikke lagt i GitHub-utgaven.

## Fortsette utviklingen i Codex

Åpne det eksisterende ProMaxPresenter-prosjektet på PC-en. Be Codex:

> Les AGENTS.md og FORTSETT-HER.md. Hent origin/work/pc-laptop og fortsett fra siste utviklingskode. Bevar lokale endringer, brukerinnhold og innstillinger. Ikke reset eller force-push. Bygg og oppdater den installerte appen etter ferdige appendringer, og send ferdig arbeid tilbake til work/pc-laptop.

Den felles grenen heter **work/pc-laptop**. På en ren checkout som allerede bruker grenen kan **Hent prosjekt.cmd** brukes før arbeidet starter. Hvis grenen eller lokale filer avviker, la Codex forene dem først. Ikke kopier den gamle, uforente rotmappen fra denne maskinen over PC-ens prosjekt.

Hvis prosjektet ikke finnes på PC-en, klon det i en ny, tom mappe:

```powershell
git clone --branch work/pc-laptop https://github.com/VeDeJoGaming/ProMaxPresenter.git ProMaxPresenter
```

Åpne den nye mappen i Codex. Avhengigheter installeres med npm ci ved behov. Ferdig arbeid synkroniseres med GitHub; den andre maskinen trenger ikke å være på. Biblioteker og private medier må overføres via programmets egne funksjoner, ikke gjennom Git.
