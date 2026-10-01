import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AreaLine, Columns, Donut, Heatmap, HorizontalBars } from '@/components/charts'
import { DetailDrawer, type DetailSelection } from '@/components/detail-drawer'
import { FilterBar, ForecastPanel, MonthlyChanges, RuleQualityPanel } from '@/components/management-features'
import { Badge, ChartCard, DataTable, Kicker, Metric, Reveal, Section, SectionHeading, Wordmark } from '@/components/ui'
import { buildAnalytics, type DashboardFilters } from '@/lib/analytics'
import { dateLabel, fmt, monthLabel, pct, relativeChange, signed, useDashboard, type DailyPoint, type DashboardData, type PeriodComparison } from '@/lib/data'

const NAV = [
  ['status', 'Status'],
  ['udvikling', 'Udvikling'],
  ['sammenligning', 'Sammenligning'],
  ['prognose', 'Prognose'],
  ['maaned', 'Månedsblik'],
  ['routing', 'Routing'],
  ['emner', 'Emner'],
  ['kvalitet', 'Datakvalitet'],
] as const

export default function App() {
  const { data: sourceData, error } = useDashboard()
  const [period, setPeriod] = useState<'30' | '90' | 'all'>('90')
  const [detail, setDetail] = useState<DetailSelection>(null)
  const [filters, setFilters] = useState<DashboardFilters>({ from: '', to: '', theme: '', route: '' })
  const analytics = useMemo(() => sourceData ? buildAnalytics(sourceData, filters) : null, [sourceData, filters])
  const data = analytics?.dashboard || null

  const daily = useMemo(() => {
    if (!data) return []
    if (period === 'all') return data.daily
    return data.daily.slice(-Number(period))
  }, [data, period])

  if (error && !sourceData) return <LoadError message={error} />
  if (!sourceData || !data || !analytics) return <Splash />

  const s = data.summary
  const dayChange = s.latestDay.count - s.previousActiveDay.count
  const dayChangePct = relativeChange(s.latestDay.count, s.previousActiveDay.count)
  const topRoute = [...data.routing].sort((a, b) => b.count - a.count)[0]
  const topTheme = [...data.themes].sort((a, b) => b.count - a.count)[0]
  const unknown = data.themes.find((theme) => theme.label === 'Andet eller uklart')
  const weekly = data.weekly.slice(-14)
  const monthly = data.monthly.slice(-12)

  return (
    <div className="min-h-screen overflow-x-clip bg-white">
      <header className="sticky top-0 z-50 border-b border-dp-navy-100 bg-white/95 backdrop-blur-md print:hidden">
        <div className="mx-auto flex w-full max-w-[80rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Wordmark />
          <nav aria-label="Sektioner" className="hidden items-center gap-1 lg:flex">
            {NAV.map(([id, label]) => <a key={id} href={`#${id}`} className="rounded-full px-3 py-1.5 text-[0.75rem] font-semibold text-dp-navy-600 transition hover:bg-dp-navy-50 hover:text-dp-navy-900">{label}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <Badge color="#179fa0">Aggregeret</Badge>
            <button type="button" onClick={() => window.print()} className="rounded-full border border-dp-navy-200 px-3 py-1.5 text-[0.72rem] font-semibold text-dp-navy-700 transition hover:border-dp-navy-400">Gem som PDF</button>
          </div>
        </div>
      </header>

      <FilterBar source={sourceData} filters={filters} onChange={(next) => { setFilters(next); setDetail(null) }} />

      <main>
        <section id="status" className="scroll-mt-24 overflow-hidden bg-dp-navy-900 text-white">
          <div className="relative mx-auto w-full max-w-[80rem] px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden"><div className="absolute -right-32 -top-52 h-[36rem] w-[36rem] rounded-full bg-dp-blaa/25 blur-3xl" /><div className="absolute -bottom-52 left-1/4 h-[30rem] w-[30rem] rounded-full bg-dp-orange/20 blur-3xl" /></div>
            <div className="relative">
              <Reveal>
                <Kicker color="#edac73">Hovedpostkassen · {dateLabel(s.latestDay.date)}</Kicker>
                <h1 className="mt-4 max-w-4xl text-display-lg font-semibold text-white">
                  {fmt(s.latestDay.count)} henvendelser på seneste aktive dag. {topTheme.label.toLowerCase()} fylder mest i indholdet.
                </h1>
                <p className="mt-5 max-w-2xl text-[0.95rem] leading-relaxed text-dp-navy-300">
                  Et ledelsesoverblik over arbejdspres, indhold og routing. Alle tal er aggregerede; afsendere, emnelinjer og mailtekst forlader aldrig kildesystemet.
                </p>
              </Reveal>
              <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Seneste dag" value={s.latestDay.count} accent="#ffffff" delay={0.05} badge={<Badge color={dayChange >= 0 ? '#8ebec0' : '#e39687'}>{signed(dayChange)}</Badge>} sub={<>{dateLabel(s.latestDay.date)}{dayChangePct !== null && <> · {dayChangePct >= 0 ? '+' : ''}{pct(dayChangePct)} mod forrige aktive dag</>}</>} />
                <Metric label="Seneste uge" value={s.latestWeek.count} accent="#f2d57a" delay={0.12} sub={<>Ugen fra {dateLabel(s.latestWeek.week, { day: 'numeric', month: 'short' })}</>} />
                <Metric label="Seneste måned" value={s.latestMonth.count} accent="#bcbbde" delay={0.19} sub={<>{monthLabel(s.latestMonth.month)} · {fmt(s.activeAverage, 1)} mails pr. aktiv dag i seneste 20 aktive dage</>} />
                <Metric label="Manuel sortering" value={s.fallbackRate * 100} suffix=" %" accent="#edac73" delay={0.26} sub={<>{fmt(s.fallbackRows)} mails er landet i fallback. Det er det største automatiseringspotentiale.</>} />
              </div>
            </div>
          </div>
        </section>

        <Section id="udvikling">
          <SectionHeading kicker="Arbejdspres" title="Hvornår kommer henvendelserne?" lead="Skift tidshorisont og se både den korte puls og den langsigtede udvikling." right={<PeriodPicker value={period} onChange={setPeriod} />} />
          <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
            <ChartCard title="Mails pr. dag" subtitle={`${daily.length} aktive datoer i visningen`} table={<DataTable headers={['Dato', 'Mails']} rows={daily.slice().reverse().map((point) => [dateLabel(point.date), point.count])} />}>
              <AreaLine points={daily.map((point) => ({ label: dateLabel(point.date, { day: '2-digit', month: '2-digit' }), value: point.count }))} />
            </ChartCard>
            <div className="grid gap-6">
              <ChartCard title="Seneste 14 uger" subtitle="Ugentlig belastning"><Columns points={weekly.map((point) => ({ label: dateLabel(point.week, { day: '2-digit', month: '2-digit' }), value: point.count }))} color="#179fa0" height={210} /></ChartCard>
              <ChartCard title="Seneste 12 måneder" subtitle="Månedlig volumen"><Columns points={monthly.map((point) => ({ label: point.month.slice(5), value: point.count }))} color="#4e4897" height={190} /></ChartCard>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Insight eyebrow="Topdag" value={`${fmt(s.peakDay.count)} mails`} text={dateLabel(s.peakDay.date)} color="#4c7bbd" />
            <Insight eyebrow="Dataperiode" value={`${dateLabel(data.meta.firstDate)} → ${dateLabel(data.meta.latestDate)}`} text={`${fmt(data.meta.validRows)} mails med gyldigt tidspunkt`} color="#179fa0" />
            <Insight eyebrow="Seneste aktive snit" value={`${fmt(s.activeAverage, 1)} pr. dag`} text="Baseret på de seneste 20 aktive datoer" color="#df790d" />
          </div>
        </Section>

        <Section id="sammenligning" tone="sunken">
          <SectionHeading kicker="Sammenligning" title="Hvordan ændrer belastningen sig?" lead="Perioderne sammenlignes med samme antal kalenderdage. Det gør uge- og månedstal retvisende, selv når den aktuelle periode ikke er afsluttet." />
          <div className="grid gap-5 lg:grid-cols-3">
            {data.comparisons.map((comparison, index) => <ComparisonCard key={comparison.key} comparison={comparison} delay={index * 0.06} />)}
          </div>
          <p className="mt-5 text-[0.74rem] leading-relaxed text-dp-navy-500">En ændring vises først som procent, når sammenligningsperioden indeholder mindst én mail. Manglende årshistorik markeres tydeligt og bliver automatisk udfyldt, når datagrundlaget når et helt år.</p>
        </Section>

        <Section id="prognose">
          <SectionHeading kicker="Forventet mailmængde" title="Hvor ender ugen og måneden?" lead="Prognosen kombinerer det allerede modtagne med det normale mønster for de resterende ugedage. Emne og destination indgår; prognosen vises kun, når datofilteret omfatter den seneste dato." />
          <ForecastPanel forecast={analytics.forecast} />
        </Section>

        <Section id="maaned" tone="sunken">
          <SectionHeading kicker="Månedens vigtigste ændringer" title="Hvad voksede, faldt eller flyttede sig?" lead="Den seneste afsluttede måned sammenlignes med måneden før. Emner vises som antal, mens routing også vises som ændring i andel." />
          <MonthlyChanges changes={analytics.monthlyChange} />
        </Section>

        <Section id="routing">
          <SectionHeading kicker="Fordeling" title="Hvor bliver arbejdet sendt hen?" lead="Routing viser både belastningen på de enkelte funktioner og hvor meget der stadig kræver manuel sortering." />
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
            <ChartCard title="Routing og videresendelse" subtitle="Sorteret efter antal mails" table={<DataTable headers={['Destination', 'Mails']} rows={[...data.routing].sort((a, b) => b.count - a.count).map((route) => [route.label, route.count])} />}>
              <HorizontalBars items={data.routing} onSelect={(item) => setDetail({ kind: 'route', label: item.label })} />
            </ChartCard>
            <div className="grid gap-5">
              <article className="card p-6"><Donut value={s.fallbackRate} color="#df790d" label="Fallback / manuel sortering" /><p className="mt-5 border-t border-dp-navy-100 pt-4 text-[0.82rem] leading-relaxed text-dp-navy-600">{fmt(s.fallbackRows)} af {fmt(data.meta.sourceRows)} mails er ikke sikkert routet. Hver forbedret regel flytter arbejde fra sortering til behandling.</p></article>
              <article className="card p-6"><div className="text-[0.69rem] font-bold uppercase tracking-[0.14em] text-dp-navy-500">Største destination</div><div className="mt-2 font-serif text-3xl font-semibold text-dp-navy-900">{topRoute.label}</div><div className="tnum mt-1 text-sm font-semibold text-dp-orange">{fmt(topRoute.count)} mails</div><p className="mt-4 text-[0.78rem] leading-relaxed text-dp-navy-500">{topRoute.email}</p></article>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.routing.filter((route) => route.email !== 'Ikke konfigureret').map((route) => <button type="button" onClick={() => setDetail({ kind: 'route', label: route.label })} key={route.label} className="group rounded-xl border border-dp-navy-100 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-dp-blaa hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-dp-blaa"><div className="flex items-center justify-between gap-4"><span className="font-semibold text-dp-navy-900">{route.label}</span><span className="tnum text-sm font-semibold" style={{ color: route.color }}>{fmt(route.count)}</span></div><div className="mt-1 flex items-center justify-between gap-3"><span className="truncate text-[0.7rem] text-dp-navy-500">{route.email}</span><span className="text-[0.65rem] font-semibold text-dp-blaa opacity-0 transition group-hover:opacity-100">Detaljer</span></div></button>)}
          </div>
        </Section>

        <Section id="emner">
          <SectionHeading kicker="Indhold" title="Hvad skriver medlemmerne om?" lead="Den lokale klassifikationsmodel kombinerer emneord, emnelinje, Body Preview og routing. Kun aggregerede resultater og modellens sikkerhed vises." />
          <ClassificationOverview data={data} />
          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.15fr]">
            <ChartCard title="Indholdstemaer" subtitle="Andel og volumen" table={<DataTable headers={['Tema', 'Mails', 'Andel']} rows={[...data.themes].sort((a, b) => b.count - a.count).map((theme) => [theme.label, theme.count, pct(theme.share)])} />}>
              <HorizontalBars items={data.themes} onSelect={(item) => setDetail({ kind: 'theme', label: item.label })} />
            </ChartCard>
            <div className="grid gap-4 sm:grid-cols-2">
              {[...data.themes].sort((a, b) => b.count - a.count).slice(0, 6).map((theme, index) => (
                <Reveal key={theme.label} delay={index * 0.045}>
                  <button type="button" onClick={() => setDetail({ kind: 'theme', label: theme.label })} className="card card-hover group h-full w-full p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-dp-blaa">
                    <div className="flex items-start justify-between gap-3"><span className="h-3 w-3 rounded-[4px]" style={{ background: theme.color }} /><span className="tnum font-serif text-2xl font-semibold text-dp-navy-900">{fmt(theme.count)}</span></div>
                    <h3 className="mt-4 font-serif text-lg font-semibold text-dp-navy-900">{theme.label}</h3>
                    <p className="mt-2 text-[0.78rem] leading-relaxed text-dp-navy-500">{theme.summary}</p>
                    <div className="mt-4 flex items-center justify-between gap-3 text-[0.68rem]"><span className="font-semibold text-dp-navy-500">Sikkerhed {pct(theme.confidence, 0)}</span><span className="font-semibold text-dp-blaa opacity-0 transition group-hover:opacity-100">Åbn detaljer</span></div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-dp-navy-50"><motion.div className="h-full rounded-full" style={{ background: theme.color }} initial={{ width: 0 }} whileInView={{ width: `${theme.share * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8 }} /></div>
                  </button>
                </Reveal>
              ))}
            </div>
          </div>
          <div className="mt-6 card p-6"><div className="mb-4 flex items-end justify-between gap-4"><div><div className="text-[0.69rem] font-bold uppercase tracking-[0.14em] text-dp-orange">Emneord</div><h3 className="mt-1 font-serif text-xl font-semibold text-dp-navy-900">Hyppigste signaler i sorteringen</h3></div><span className="text-[0.72rem] text-dp-navy-400">Top {data.keywords.length}</span></div><div className="flex flex-wrap gap-2">{data.keywords.map((keyword) => <span key={keyword.label} className="inline-flex items-center gap-2 rounded-full border border-dp-navy-100 bg-dp-navy-50 px-3 py-1.5 text-[0.74rem] font-medium text-dp-navy-700"><span className="h-2 w-2 rounded-full" style={{ background: keyword.color }} />{keyword.label}<strong className="tnum text-dp-navy-900">{keyword.count}</strong></span>)}</div></div>
        </Section>

        <Section id="moenstre" tone="dark">
          <SectionHeading kicker="Kapacitetsplanlægning" title="Hvornår på ugen opstår presset?" lead="Tidsmønstret kan bruges til bemanding, vagtdækning og planlægning af fokustid." onDark />
          <div className="rounded-2xl border border-white/10 bg-white p-5 shadow-band sm:p-7"><Heatmap cells={data.heatmap} /></div>
        </Section>

        <Section id="kvalitet" tone="sunken">
          <SectionHeading kicker="Kvalitetsovervågning" title="Hvor er routingreglerne uenige med indholdet?" lead="Tekstens uafhængige emneklassifikation sammenholdes med den valgte destination. Lavt match peger på regler, der bør gennemgås." />
          <RuleQualityPanel findings={analytics.ruleQuality} />
          <div className="mb-5 mt-10"><Kicker color="#4e4897">Datakvalitet</Kicker><h3 className="mt-3 font-serif text-2xl font-semibold text-dp-navy-900">Grundlaget for analysen</h3></div>
          <div className="grid gap-5 md:grid-cols-3">
            <QualityCard title="Routing" value={1 - s.fallbackRate} good="Automatisk routet" bad={`${fmt(s.fallbackRows)} i fallback`} color="#df790d" />
            <QualityCard title="Indhold" value={s.classifiedRate} good="Tematisk klassificeret" bad={`${fmt(unknown?.count ?? 0)} uklare`} color="#4e4897" />
            <QualityCard title="Tidsstempel" value={data.meta.sourceRows ? data.meta.validRows / data.meta.sourceRows : 0} good="Har gyldigt tidspunkt" bad={`${fmt(data.meta.missingTimestamp)} mangler`} color="#179fa0" />
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="card p-6 sm:p-8"><Kicker>Næste ledelsesgreb</Kicker><h3 className="mt-3 font-serif text-2xl font-semibold text-dp-navy-900">Fra overblik til styring</h3><ol className="mt-6 space-y-5">{[
              ['1', 'Reducer fallback', 'Start med de hyppigste emneord blandt fallback-mails og omsæt dem til Power Automate-regler.'],
              ['2', 'Fastlæg servicemål', 'Kobl modtagelsestidspunkt med første handling, så dashboardet kan vise svartid og restancer.'],
              ['3', 'Fordel kapacitet', 'Brug uge- og timeprofilen til at placere bemanding dér, hvor presset faktisk opstår.'],
            ].map(([number, title, text]) => <li key={number} className="flex gap-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-dp-orange-15 text-sm font-bold text-dp-orange">{number}</span><div><div className="font-semibold text-dp-navy-900">{title}</div><p className="mt-1 text-[0.8rem] leading-relaxed text-dp-navy-500">{text}</p></div></li>)}</ol></article>
            <article className="card p-6 sm:p-8"><Kicker color="#179fa0">Om data</Kicker><h3 className="mt-3 font-serif text-2xl font-semibold text-dp-navy-900">Sikker at dele internt</h3><p className="mt-4 text-[0.85rem] leading-relaxed text-dp-navy-600">{data.meta.privacy}</p><dl className="mt-6 divide-y divide-dp-navy-100 border-y border-dp-navy-100 text-[0.78rem]">{[
              ['Loglinjer', fmt(data.meta.sourceRows)],
              ['Periode', `${dateLabel(data.meta.firstDate)} – ${dateLabel(data.meta.latestDate)}`],
              ['Data genereret', new Date(data.meta.generatedAt).toLocaleString('da-DK', { dateStyle: 'medium', timeStyle: 'short' })],
            ].map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-3"><dt className="text-dp-navy-500">{label}</dt><dd className="tnum text-right font-semibold text-dp-navy-900">{value}</dd></div>)}</dl></article>
          </div>
        </Section>
      </main>

      <DetailDrawer selection={detail} data={data} onClose={() => setDetail(null)} />

      <footer className="border-t border-dp-navy-100 bg-white"><div className="mx-auto flex w-full max-w-[80rem] flex-wrap items-center justify-between gap-5 px-4 py-8 text-[0.74rem] text-dp-navy-500 sm:px-6"><Wordmark /><p className="max-w-2xl leading-relaxed">Ledelsesoverblik over DP's hovedpostkasse. Kilden er den aggregerede datafil i GitHub-repositoryet; ingen persondata indgår.</p></div></footer>
    </div>
  )
}

function PeriodPicker({ value, onChange }: { value: '30' | '90' | 'all'; onChange: (value: '30' | '90' | 'all') => void }) {
  return <div className="inline-flex rounded-full border border-dp-navy-100 bg-dp-navy-50 p-1">{([['30', '30 dage'], ['90', '90 dage'], ['all', 'Alt']] as const).map(([key, label]) => <button key={key} type="button" onClick={() => onChange(key)} className={`rounded-full px-3 py-1.5 text-[0.72rem] font-semibold transition ${value === key ? 'bg-white text-dp-navy-900 shadow-sm' : 'text-dp-navy-500 hover:text-dp-navy-900'}`}>{label}</button>)}</div>
}

function Insight({ eyebrow, value, text, color }: { eyebrow: string; value: string; text: string; color: string }) {
  return <article className="rounded-xl border border-dp-navy-100 bg-white p-5"><div className="text-[0.65rem] font-bold uppercase tracking-[0.14em]" style={{ color }}>{eyebrow}</div><div className="mt-2 font-serif text-xl font-semibold text-dp-navy-900">{value}</div><p className="mt-1 text-[0.75rem] text-dp-navy-500">{text}</p></article>
}

function ComparisonCard({ comparison, delay }: { comparison: PeriodComparison; delay: number }) {
  const positive = (comparison.delta || 0) >= 0
  const color = comparison.available ? (positive ? '#df790d' : '#179fa0') : '#8299bb'
  const currentPeriod = periodRange(comparison.currentStart, comparison.currentEnd)
  const previousPeriod = periodRange(comparison.previousStart, comparison.previousEnd)
  const changeLabel = !comparison.available ? 'Ikke nok historik' : comparison.change === null ? (comparison.previous === 0 ? `${signed(comparison.delta || 0)} fra en periode med 0` : 'Procent kan ikke beregnes') : `${comparison.change >= 0 ? '+' : ''}${pct(comparison.change, 0)}`
  return <motion.article className="card overflow-hidden" initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, delay }}><div className="h-1.5" style={{ background: color }} /><div className="p-6"><div className="flex items-start justify-between gap-4"><div><div className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-dp-navy-500">{comparison.label}</div><div className="mt-2 text-[0.72rem] text-dp-navy-400">{currentPeriod}</div></div><Badge color={color}>{changeLabel}</Badge></div><div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-end gap-4"><div><div className="tnum font-serif text-4xl font-semibold text-dp-navy-900">{fmt(comparison.current)}</div><div className="mt-1 text-[0.68rem] text-dp-navy-500">Aktuel periode</div></div><div className="pb-5 text-dp-navy-200">mod</div><div className="text-right"><div className="tnum font-serif text-3xl font-semibold text-dp-navy-500">{comparison.previous === null ? '—' : fmt(comparison.previous)}</div><div className="mt-1 text-[0.68rem] text-dp-navy-500">{comparison.available ? previousPeriod : 'Historik mangler'}</div></div></div><p className="mt-5 border-t border-dp-navy-100 pt-4 text-[0.72rem] leading-relaxed text-dp-navy-500">{comparison.baseline}</p></div></motion.article>
}

function periodRange(start: string, end: string) {
  if (start === end) return dateLabel(start, { day: 'numeric', month: 'short', year: 'numeric' })
  return `${dateLabel(start, { day: 'numeric', month: 'short' })} – ${dateLabel(end, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function ClassificationOverview({ data }: { data: DashboardData }) {
  const model = data.classification
  const total = Math.max(1, model.high + model.medium + model.low)
  const bands = [
    ['Høj', model.high, '#179fa0'],
    ['Mellem', model.medium, '#d8a90c'],
    ['Lav', model.low, '#df790d'],
  ] as const
  return <article className="overflow-hidden rounded-2xl bg-dp-navy-900 text-white shadow-band"><div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[1.15fr_1fr]"><div><Kicker color="#edac73">{data.meta.modelVersion}</Kicker><h3 className="mt-3 font-serif text-2xl font-semibold">Klassifikation med synlig sikkerhed</h3><p className="mt-3 max-w-xl text-[0.82rem] leading-relaxed text-dp-navy-300">{model.method}</p><div className="mt-5 flex flex-wrap gap-2"><Badge color="#8ebec0">{pct(data.summary.classifiedRate, 0)} klassificeret</Badge><Badge color="#edac73">{fmt(model.unknown)} uklare</Badge></div></div><div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5"><div className="flex items-end justify-between gap-4"><div><div className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-dp-navy-300">Gennemsnitlig sikkerhed</div><div className="tnum mt-2 font-serif text-4xl font-semibold text-white">{pct(model.average, 0)}</div></div><div className="text-right text-[0.7rem] leading-relaxed text-dp-navy-300">Høj sikkerhed kræver<br />flere samstemmende signaler</div></div><div className="mt-5 flex h-3 overflow-hidden rounded-full bg-white/10">{bands.map(([label, count, color]) => <div key={label} style={{ width: `${count / total * 100}%`, background: color }} title={`${label}: ${count}`} />)}</div><div className="mt-4 grid grid-cols-3 gap-2">{bands.map(([label, count, color]) => <div key={label}><div className="flex items-center gap-1.5 text-[0.67rem] text-dp-navy-300"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</div><div className="tnum mt-1 text-sm font-semibold text-white">{fmt(count)} <span className="font-normal text-dp-navy-300">· {pct(count / total, 0)}</span></div></div>)}</div></div></div></article>
}

function QualityCard({ title, value, good, bad, color }: { title: string; value: number; good: string; bad: string; color: string }) {
  return <article className="card p-6"><div className="flex items-start justify-between gap-4"><div><div className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-dp-navy-500">{title}</div><div className="tnum mt-2 font-serif text-4xl font-semibold text-dp-navy-900">{pct(value, 0)}</div></div><div className="grid h-12 w-12 place-items-center rounded-full" style={{ background: `${color}18` }}><span className="h-3 w-3 rounded-full" style={{ background: color }} /></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-dp-navy-50"><motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} whileInView={{ width: `${value * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.9 }} /></div><div className="mt-3 flex justify-between gap-3 text-[0.72rem]"><span className="text-dp-navy-600">{good}</span><span className="font-semibold text-dp-navy-900">{bad}</span></div></article>
}

function Splash() {
  return <div className="grid min-h-screen place-items-center bg-white"><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center"><Wordmark /><p className="mt-6 text-sm text-dp-navy-500">Henter mailoverblikket…</p></motion.div></div>
}

function LoadError({ message }: { message: string }) {
  return <div className="grid min-h-screen place-items-center bg-dp-grey px-4"><div className="card max-w-md p-7 text-center"><Wordmark /><h1 className="mt-6 font-serif text-2xl font-semibold text-dp-navy-900">Data kunne ikke hentes</h1><p className="mt-3 text-sm leading-relaxed text-dp-navy-600">{message}. Kontrollér at <code className="rounded bg-dp-navy-50 px-1.5 py-0.5">public/data/mail-dashboard.json</code> findes.</p></div></div>
}

export function activeDays(points: DailyPoint[]) { return points.filter((point) => point.count > 0).length }
