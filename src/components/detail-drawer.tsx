import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { AreaLine, HorizontalBars } from '@/components/charts'
import { Badge, Kicker } from '@/components/ui'
import { dateLabel, fmt, pct, type DashboardData } from '@/lib/data'

export type DetailSelection = { kind: 'theme' | 'route'; label: string } | null

export function DetailDrawer({ selection, data, onClose }: { selection: DetailSelection; data: DashboardData; onClose: () => void }) {
  useEffect(() => {
    if (!selection) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [selection, onClose])

  const theme = selection?.kind === 'theme' ? data.drilldowns.themes.find((item) => item.label === selection.label) : undefined
  const route = selection?.kind === 'route' ? data.drilldowns.routes.find((item) => item.label === selection.label) : undefined
  const detail = theme || route
  const source = selection?.kind === 'theme' ? data.themes.find((item) => item.label === selection.label) : data.routing.find((item) => item.label === selection?.label)

  return (
    <AnimatePresence>
      {selection && detail && (
        <motion.div className="fixed inset-0 z-[100] flex items-end justify-center bg-dp-navy-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.section role="dialog" aria-modal="true" aria-labelledby="detail-title" className="thin-scroll max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-white shadow-band sm:rounded-3xl" initial={{ opacity: 0, y: 36, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.28 }} onMouseDown={(event) => event.stopPropagation()}>
            <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-dp-navy-100 bg-white/95 px-5 py-5 backdrop-blur sm:px-8">
              <div>
                <Kicker color={source?.color || '#4c7bbd'}>{selection.kind === 'theme' ? 'Emne · drill-down' : 'Afdeling · drill-down'}</Kicker>
                <h2 id="detail-title" className="mt-2 font-serif text-2xl font-semibold text-dp-navy-900 sm:text-3xl">{detail.label}</h2>
              </div>
              <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-dp-navy-100 text-xl text-dp-navy-600 transition hover:border-dp-navy-300 hover:bg-dp-navy-50" aria-label="Luk detaljer">×</button>
            </header>

            <div className="space-y-7 p-5 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-3">
                <MiniMetric label="Henvendelser" value={fmt(detail.count)} text={`${pct(detail.count / data.meta.sourceRows)} af alle`} />
                <MiniMetric label="Modelsikkerhed" value={pct(detail.confidence.average, 0)} text={`${fmt(detail.confidence.high)} med høj sikkerhed`} />
                {route ? (
                  <MiniMetric
                    label="Routingkvalitet"
                    value={route.routingQuality === null ? 'Ikke beregnet' : pct(route.routingQuality, 0)}
                    text={route.match === 'Fallback'
                      ? 'Fallback er ikke automatisk routet'
                      : `${pct(route.routingQualityCoverage, 0)} kunne vurderes ud fra teksten alene`}
                  />
                ) : <MiniMetric label="Undertyper" value={fmt(theme?.subtypes.length || 0)} text="Aggregerede underemner" />}
              </div>

              <div className="rounded-2xl border border-dp-navy-100 p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-serif text-xl font-semibold text-dp-navy-900">Udvikling</h3><p className="mt-1 text-[0.75rem] text-dp-navy-500">Antal pr. aktiv dato i den samlede log</p></div><Badge color={source?.color || '#4c7bbd'}>{fmt(detail.count)} i alt</Badge></div>
                <AreaLine points={detail.daily.slice(-60).map((point) => ({ label: dateLabel(point.date, { day: '2-digit', month: '2-digit' }), value: point.count }))} color={source?.color || '#4c7bbd'} height={235} />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <DetailCard title="Undertyper" subtitle="De hyppigste underemner"><HorizontalBars items={detail.subtypes} limit={8} /></DetailCard>
                <DetailCard title={theme ? 'Hvor sendes emnet hen?' : 'Hvilke emner lander her?'} subtitle={theme ? 'Fordeling på destinationer' : 'Fordeling på klassificerede emner'}><HorizontalBars items={theme ? theme.routing : route?.themes || []} limit={8} /></DetailCard>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
                <DetailCard title="Travleste dage" subtitle="Højeste volumen for dette udsnit">
                  <ol className="space-y-2.5">{detail.busiestDays.map((day, index) => <li key={day.date} className="flex items-center justify-between gap-4 rounded-xl bg-dp-navy-50 px-3.5 py-2.5"><span className="text-[0.77rem] text-dp-navy-600">{index + 1}. {dateLabel(day.date)}</span><strong className="tnum text-sm text-dp-navy-900">{fmt(day.count)}</strong></li>)}</ol>
                </DetailCard>
                <DetailCard title="Fordeling af modelsikkerhed" subtitle="Lav sikkerhed bør bruges som kø til manuel kvalitetssikring">
                  <ConfidenceBar high={detail.confidence.high} medium={detail.confidence.medium} low={detail.confidence.low} />
                </DetailCard>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function MiniMetric({ label, value, text }: { label: string; value: string; text: string }) {
  return <article className="rounded-2xl bg-dp-navy-50 p-4"><div className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-dp-navy-500">{label}</div><div className="tnum mt-2 font-serif text-2xl font-semibold text-dp-navy-900">{value}</div><div className="mt-1 text-[0.7rem] text-dp-navy-500">{text}</div></article>
}

function DetailCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <article className="rounded-2xl border border-dp-navy-100 p-5"><h3 className="font-serif text-lg font-semibold text-dp-navy-900">{title}</h3><p className="mb-5 mt-1 text-[0.72rem] text-dp-navy-500">{subtitle}</p>{children}</article>
}

function ConfidenceBar({ high, medium, low }: { high: number; medium: number; low: number }) {
  const total = Math.max(1, high + medium + low)
  const bands = [
    ['Høj', high, '#179fa0'],
    ['Mellem', medium, '#d8a90c'],
    ['Lav', low, '#df790d'],
  ] as const
  return <div><div className="flex h-3 overflow-hidden rounded-full bg-dp-navy-50">{bands.map(([label, count, color]) => <div key={label} style={{ width: `${count / total * 100}%`, background: color }} title={`${label}: ${count}`} />)}</div><div className="mt-4 grid grid-cols-3 gap-2">{bands.map(([label, count, color]) => <div key={label}><div className="flex items-center gap-1.5 text-[0.67rem] text-dp-navy-500"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</div><div className="tnum mt-1 text-sm font-semibold text-dp-navy-900">{fmt(count)} <span className="font-normal text-dp-navy-400">· {pct(count / total, 0)}</span></div></div>)}</div></div>
}
