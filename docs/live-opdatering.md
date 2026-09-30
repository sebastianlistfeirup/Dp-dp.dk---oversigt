# Live-opdatering fra Power Automate

Dashboardet er bygget, så datakilden kan udskiftes uden at ændre brugerfladen. GitHub Pages henter kun den aggregerede fil `public/data/mail-dashboard.json`.

## Anbefalet produktionsflow

1. Power Automate udløses, når mail-loggen ændres, eller én gang i timen.
2. Flowet læser rækkerne fra Excel-tabellen eller den SharePoint-liste, som senere erstatter Excel.
3. Flowet samler tallene pr. dag, uge, måned, routingkategori, tema, ugedag og time.
4. Kun de samlede tal skrives til `public/data/mail-dashboard.json` via GitHub Contents API.
5. Ændringen udløser GitHub Actions, som validerer, bygger og udgiver siden.

## Sikkerhedsgrænse

Følgende må ikke skrives til GitHub:

- afsendernavn eller afsenderadresse
- emnelinje
- Body Preview eller øvrig mailtekst
- medlemsnummer eller andre personhenførbare værdier

GitHub-tokenet skal gemmes som en beskyttet forbindelse eller secret i Power Automate. Det må aldrig lægges i JavaScript-koden eller JSON-filen.

## Filformat

Den nuværende JSON-fil fungerer som kontrakt og indeholder disse hovedfelter:

- `meta`: tidspunkt, datoperiode og datakvalitet
- `summary`: ledelses-KPI'er
- `daily`, `weekly`, `monthly`: tidsserier
- `routing`: fordeling på destination
- `themes` og `keywords`: aggregerede emner
- `heatmap`: antal pr. ugedag og time

Kør `pnpm check:data` før udgivelse. Workflowet afviser en opdatering, hvis de nødvendige felter mangler.

## GitHub-kald fra Power Automate

Brug `PUT /repos/sebastianlistfeirup/Dp-dp.dk---oversigt/contents/public/data/mail-dashboard.json`. Kaldet skal sende den nye JSON som Base64 samt den aktuelle fils `sha`. Brug en teknisk GitHub-bruger eller et fint afgrænset token med adgang til kun dette repository.

## Senere migrering væk fra Excel

Når mailflowet skriver direkte til en SharePoint-liste eller Dataverse, behøver dashboardet ingen ændringer. Kun Power Automate-flowets læsetrin ændres; den aggregerede JSON-kontrakt forbliver den samme.
