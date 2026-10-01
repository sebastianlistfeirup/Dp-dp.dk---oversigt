# DP hovedpostkasse — ledelsesdashboard

Et privatlivssikkert webdashboard for Dansk Psykolog Forenings hovedpostkasse. Siden viser arbejdspres, routing, emner, tidsmønstre og datakvalitet i samme visuelle familie som [DPDashboard](https://github.com/sebastianlistfeirup/DPDashboard).

Dashboardet indeholder også:

- sammenligning af uge og måned med lige lange perioder samt samme periode sidste år
- lokal, fler-signal emneklassifikation med sikkerhed pr. emne og samlet for modellen
- klikbart drill-down på emner og destinationer med udvikling, undertyper, travleste dage og routingkvalitet

**GitHub Pages:** `https://sebastianlistfeirup.github.io/Dp-dp.dk---oversigt/`

## Privatliv

Kun aggregerede optællinger ligger i repositoryet. Afsenderadresser, emnelinjer og Body Preview publiceres ikke. Rå Excel-filer er ignoreret i `.gitignore`.

## Lokal udvikling

```bash
pnpm install
pnpm dev
```

Produktionskontrol:

```bash
pnpm check:data
pnpm lint
pnpm build
```

## Data

Frontendens eneste datakilde er `public/data/mail-dashboard.json`. Filen indeholder:

- daglige, ugentlige og månedlige optællinger
- periodetal og sammenligningsgrundlag
- routingkategorier og destinationer
- aggregerede indholdstemaer, undertyper, emneord og modelsikkerhed
- privatlivssikre drill-down-data uden afsender, emnelinje eller mailtekst
- ugedag/time-mønster
- datakvalitetsmål

Den nuværende fil er genereret fra mail-loggen i Excel. Klassifikationen kører lokalt på felterne Emneord, Opdelte Emneord, emnelinje, Body Preview og routing; ingen mailtekst sendes til en ekstern AI-model eller gemmes i repositoryet. Routingkvalitet vurderes på de mails, hvor tekstsignalerne alene giver et emne, så destinationen ikke bruges som sit eget facit.

Næste integrationstrin er at lade Power Automate eller Microsoft Graph opdatere den aggregerede JSON-fil uden at sende persondata til GitHub.

Den konkrete, privatlivssikre opskrift ligger i [docs/live-opdatering.md](docs/live-opdatering.md).

## Udgivelse

Et push til `main` kører GitHub Actions, validerer data, bygger Vite-applikationen og udgiver `dist/` på GitHub Pages. Hvis Pages ikke bliver aktiveret automatisk, vælg **Settings → Pages → Source: GitHub Actions**.
