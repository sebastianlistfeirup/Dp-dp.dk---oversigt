import fs from 'node:fs'

const path = new URL('../public/data/mail-dashboard.json', import.meta.url)
const data = JSON.parse(fs.readFileSync(path, 'utf8'))
const required = ['meta', 'summary', 'comparisons', 'classification', 'daily', 'weekly', 'monthly', 'routing', 'themes', 'keywords', 'heatmap', 'drilldowns', 'filterFacts', 'keywordFacts']
const missing = required.filter((key) => !(key in data))
if (missing.length) throw new Error(`Data mangler: ${missing.join(', ')}`)
if (!Array.isArray(data.daily) || data.daily.length === 0) throw new Error('daily er tom')
if (data.meta.sourceRows < data.meta.validRows) throw new Error('validRows kan ikke overstige sourceRows')
if (data.routing.some((item) => typeof item.count !== 'number')) throw new Error('Routing indeholder ugyldige tal')
if (data.comparisons.length !== 3) throw new Error('Der skal være tre periodesammenligninger')
if (!data.drilldowns?.themes?.length || !data.drilldowns?.routes?.length) throw new Error('Drill-down-data mangler')
if (data.classification.average < 0 || data.classification.average > 1) throw new Error('Modelsikkerhed er ugyldig')
if (data.drilldowns.themes.some((item) => item.count !== item.subtypes.reduce((sum, subtype) => sum + subtype.count, 0))) throw new Error('Tema-undertyper stemmer ikke med totalen')
if (data.filterFacts.reduce((sum, item) => sum + item.count, 0) !== data.meta.sourceRows) throw new Error('Filterkuben stemmer ikke med kildetotalen')
if (data.filterFacts.some((item) => 'subject' in item || 'body' in item || 'sender' in item)) throw new Error('Filterkuben indeholder rå mailfelter')
console.log(`Data OK: ${data.meta.sourceRows} loglinjer, ${data.daily.length} aktive datoer, ${data.routing.length} routingkategorier, ${data.drilldowns.themes.length} emne-drilldowns, ${data.filterFacts.length} aggregerede filterceller`)
