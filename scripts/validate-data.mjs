import fs from 'node:fs'

const path = new URL('../public/data/mail-dashboard.json', import.meta.url)
const data = JSON.parse(fs.readFileSync(path, 'utf8'))
const required = ['meta', 'summary', 'daily', 'weekly', 'monthly', 'routing', 'themes', 'keywords', 'heatmap']
const missing = required.filter((key) => !(key in data))
if (missing.length) throw new Error(`Data mangler: ${missing.join(', ')}`)
if (!Array.isArray(data.daily) || data.daily.length === 0) throw new Error('daily er tom')
if (data.meta.sourceRows < data.meta.validRows) throw new Error('validRows kan ikke overstige sourceRows')
if (data.routing.some((item) => typeof item.count !== 'number')) throw new Error('Routing indeholder ugyldige tal')
console.log(`Data OK: ${data.meta.sourceRows} loglinjer, ${data.daily.length} aktive datoer, ${data.routing.length} routingkategorier`)
