import { motion } from 'framer-motion'
import { Badge, Kicker } from '@/components/ui'
import { dateLabel, fmt, monthLabel, pct, signed, type DashboardData } from '@/lib/data'
import type { DashboardFilters, ForecastResult, MonthlyChangeResult, RuleQualityFinding } from '@/lib/analytics'

export function FilterBar({ source, filters, onChange }: { source: DashboardData; filters: DashboardFilters; onChange: (filters: DashboardFilters) => void }) {
  const activeCount = [Boolean(filters.from || filters.to), Boolean(filters.theme), Boolean(filters.route)].filter(Boolean).length
  const set = (key: keyof DashboardFilters, value: string) => onChange({ ...filters, [key]: value })
  const latest = source.meta.latestDate || ''
  const preset = (days: number | 'month' | 'all') => {
    if (days === 'all') return onChange({ ...filters, from: '', to: '' })
    if (!latest) return
    if (days === 'month') return onChange({ ...filters, from: `${latest.slice(0, 7)}-01`, to: latest })
    const date = new Date(`${latest}T12:00:00Z`)
    date.setUTCDate(date.getUTCDate() - days + 1)
    onChange({ ...filters, from: date.toISOString().slice(0, 10), to: latest })
  }
  return (
    <section className="border-b border-dp-navy-100 bg-dp-grey/95 shadow-sm backdrop-blur-md print:hidden lg:sticky lg:top-[4.1rem] lg:z-40" aria-label="Filtre">
      <div className="mx-auto w-full max-w-[80rem] px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="mr-auto min-w-[11rem]"><Kicker color="#179fa0">Aktiv visning</Kicker><div className="mt-1 text-sm font-semibold text-dp-navy-900">{activeCount ? `${activeCount} filtre anvendt` : 'Hele datagrundlaget'}</div></div>
          <FilterField label="Fra"><input aria-label="Fra dato" type="date" min={source.meta.firstDate || undefined} max={filters.to || latest || undefined} value={filters.from} onChange={(event) => set('from', event.target.value)} className="filter-control" /></FilterField>
          <FilterField label="Til"><input aria-label="Til dato" type="date" min={filters.from || source.meta.firstDate || undefined} max={latest || undefined} value={filters.to} onChange={(event) => set('to', event.target.value)} className="filter-control" /></FilterField>
          <FilterField label="Emne"><select aria-label="Emne" value={filters.theme} onChange={(event) => set('theme', event.target.value)} className="filter-control"><option value="">Alle emner</option>{source.themes.filter((item) => item.count > 0).map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}</select></FilterField>
          <FilterField label="Destination"><select aria-label="Destination" value={filters.route} onChange={(event) => set('route', event.target.value)} className="filter-control"><option value="">Alle destinationer</option>{source.routing.filter((item) => item.count > 0).map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}</select></FilterField>
          <button type="button" onClick={() => onChange({ from: '', to: '', theme: '', route: '' })} className="h-[2.4rem] rounded-lg border border-dp-navy-200 bg-white px-3 text-[0.72rem] font-semibold text-dp-navy-700 transition hover:border-dp-navy-400">Nulstil</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[0.68rem]"><span className="py-1.5 text-dp-navy-500">Hurtig periode:</span>{([['all', 'Alt'], [30, '30 dage'], [90, '90 dage'], ['month', 'Denne måned']] as const).map(([value, label]) => <button type="button" key={label} onClick={() => preset(value)} className="rounded-full border border-dp-navy-100 bg-white px-3 py-1.5 font-semibold text-dp-navy-600 transition hover:border-dp-blaa hover:text-dp-navy-900">{label}</button>)}</div>
      </div>
    </section>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-[0.1em] text-dp-navy-500">{label}</span>{children}</label>
}

export function ForecastPanel({ forecast }: { forecast: ForecastResult }) {
  if (!forecast.available) return <EmptyPanel title="Prognosen kan ikke beregnes" text="Den valgte filtrering indeholder ikke nok historik frem til seneste datodato." />
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ForecastCard title="Forventet uge" period={`Pr. ${dateLabel(forecast.asOf)}`} result={forecast.week} color="#179fa0" />
      <ForecastCard title="Forventet måned" period={`Pr. ${dateLabel(forecast.asOf)}`} result={forecast.month} color="#4e4897" />
      <p className="lg:col-span-2 text-[0.72rem] leading-relaxed text-dp-navy-500">Estimatet bruger gennemsnittet for hver ugedag i de seneste {forecast.historyWeeks} uger. Intervallet viser et enkelt usikkerhedsspænd på cirka 20 % af den resterende forventede volumen.</p>
    </div>
  )
}

function ForecastCard({ title, period, result, color }: { title: string; period: string; result: ForecastResult['week']; color: string }) {
  return <motion.article className="card overflow-hidden" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}><div className="h-1.5" style={{ background: color }} /><div className="p-6 sm:p-7"><div className="flex items-start justify-between gap-4"><div><div className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-dp-navy-500">{title}</div><div className="mt-1 text-[0.72rem] text-dp-navy-400">{period}</div></div><Badge color={color}>{fmt(result.low)}–{fmt(result.high)}</Badge></div><div className="mt-6 flex items-end justify-between gap-5"><div><div className="tnum font-serif text-5xl font-semibold text-dp-navy-900">{fmt(result.estimate)}</div><div className="mt-1 text-[0.72rem] text-dp-navy-500">forventede mails i alt</div></div><div className="text-right"><div className="tnum text-lg font-semibold" style={{ color }}>{fmt(result.remaining)}</div><div className="text-[0.68rem] text-dp-navy-500">forventes resten</div></div></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-dp-navy-50"><div className="h-full rounded-full" style={{ width: `${Math.min(100, result.estimate ? result.actual / result.estimate * 100 : 0)}%`, background: color }} /></div><div className="mt-2 flex justify-between text-[0.68rem] text-dp-navy-500"><span>{fmt(result.actual)} modtaget</span><span>{fmt(result.estimate)} estimeret</span></div></div></motion.article>
}

export function MonthlyChanges({ changes }: { changes: MonthlyChangeResult }) {
  if (!changes.available) return <EmptyPanel title="Månedsændringer kræver to hele måneder" text="Udvid datofilteret, så både seneste og forrige afsluttede måned indgår." />
  const changeColor = changes.delta > 0 ? '#df790d' : '#179fa0'
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <article className="overflow-hidden rounded-2xl bg-dp-navy-900 p-6 text-white shadow-band sm:p-8"><Kicker color="#edac73">{monthLabel(changes.currentMonth)} mod {monthLabel(changes.previousMonth)}</Kicker><div className="mt-5 flex items-end justify-between gap-5"><div><div className="tnum font-serif text-5xl font-semibold">{fmt(changes.current)}</div><div className="mt-1 text-[0.72rem] text-dp-navy-300">mails i seneste hele måned</div></div><Badge color={changeColor}>{signed(changes.delta)} · {changes.change === null ? '—' : `${changes.change >= 0 ? '+' : ''}${pct(changes.change, 0)}`}</Badge></div><div className="mt-7 border-t border-white/10 pt-5 text-[0.78rem] leading-relaxed text-dp-navy-300">Forrige måned havde {fmt(changes.previous)} mails. Visningen følger de valgte emne- og destinationsfiltre.</div></article>
      <div className="grid gap-5 md:grid-cols-3">
        <ChangeList title="Voksede mest" items={changes.increases} color="#df790d" />
        <ChangeList title="Faldt mest" items={changes.decreases} color="#179fa0" />
        <ChangeList title="Routing flyttede sig" items={changes.routeShifts} color="#4e4897" share />
      </div>
    </div>
  )
}

function ChangeList({ title, items, color, share = false }: { title: string; items: MonthlyChangeResult['increases']; color: string; share?: boolean }) {
  return <article className="card p-5"><div className="mb-4 text-[0.68rem] font-bold uppercase tracking-[0.13em]" style={{ color }}>{title}</div>{items.length ? <ol className="space-y-3">{items.map((item) => <li key={item.label} className="border-b border-dp-navy-100 pb-3 last:border-0 last:pb-0"><div className="truncate text-[0.75rem] font-semibold text-dp-navy-900" title={item.label}>{item.label}</div><div className="mt-1 flex justify-between gap-3 text-[0.68rem] text-dp-navy-500"><span>{fmt(item.previous)} → {fmt(item.current)}</span><strong style={{ color }}>{share ? `${(item.shareShift || 0) >= 0 ? '+' : ''}${fmt((item.shareShift || 0) * 100, 1)} point` : signed(item.delta)}</strong></div></li>)}</ol> : <p className="text-[0.74rem] leading-relaxed text-dp-navy-400">Ingen ændringer i denne retning.</p>}</article>
}

export function RuleQualityPanel({ findings }: { findings: RuleQualityFinding[] }) {
  if (!findings.length) return <EmptyPanel title="Ingen regler kan vurderes" text="Der er ingen automatisk routede mails i den valgte visning." />
  return <div className="thin-scroll overflow-x-auto rounded-2xl border border-dp-navy-100 bg-white shadow-card"><div className="min-w-[42rem]"><div className="grid grid-cols-[1.3fr_0.7fr_0.7fr_1.5fr] gap-3 border-b border-dp-navy-100 bg-dp-navy-50 px-4 py-3 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-dp-navy-500"><span>Destination</span><span>Match</span><span>Uenige</span><span>Hyppigste uenighed</span></div><div className="divide-y divide-dp-navy-100">{findings.map((finding) => { const color = finding.matchRate === null ? '#8299bb' : finding.matchRate < 0.6 ? '#d24e46' : finding.matchRate < 0.85 ? '#df790d' : '#179fa0'; return <div key={finding.route} className="grid grid-cols-[1.3fr_0.7fr_0.7fr_1.5fr] items-center gap-3 px-4 py-4 text-[0.74rem]"><div><div className="font-semibold text-dp-navy-900">{finding.route}</div><div className="mt-0.5 text-[0.65rem] text-dp-navy-400">{pct(finding.coverage, 0)} vurderet</div></div><strong className="tnum" style={{ color }}>{finding.matchRate === null ? '—' : pct(finding.matchRate, 0)}</strong><span className="tnum text-dp-navy-700">{fmt(finding.mismatches)}</span><div className="text-dp-navy-600">{finding.mainMismatch ? <>{finding.mainMismatch} <span className="tnum text-dp-navy-400">({fmt(finding.mainMismatchCount)})</span></> : 'Ingen tydelig uenighed'}</div></div> })}</div></div></div>
}

function EmptyPanel({ title, text }: { title: string; text: string }) {
  return <article className="rounded-2xl border border-dashed border-dp-navy-200 bg-white p-7"><h3 className="font-serif text-xl font-semibold text-dp-navy-900">{title}</h3><p className="mt-2 text-[0.78rem] leading-relaxed text-dp-navy-500">{text}</p></article>
}

