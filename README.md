# DP hovedpostkasse — ledelsesdashboard

Et privatlivssikkert webdashboard for Dansk Psykolog Forenings hovedpostkasse. Siden viser arbejdspres, routing, emner, tidsmønstre og datakvalitet i samme visuelle familie som [DPDashboard](https://github.com/sebastianlistfeirup/DPDashboard).

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
- routingkategorier og destinationer
- aggregerede indholdstemaer og emneord
- ugedag/time-mønster
- datakvalitetsmål

Den nuværende fil er genereret fra mail-loggen i Excel. Næste integrationstrin er at lade Power Automate eller Microsoft Graph opdatere den aggregerede JSON-fil uden at sende persondata til GitHub.

Den konkrete, privatlivssikre opskrift ligger i [docs/live-opdatering.md](docs/live-opdatering.md).

## Udgivelse

Et push til `main` kører GitHub Actions, validerer data, bygger Vite-applikationen og udgiver `dist/` på GitHub Pages. Hvis Pages ikke bliver aktiveret automatisk, vælg **Settings → Pages → Source: GitHub Actions**.
