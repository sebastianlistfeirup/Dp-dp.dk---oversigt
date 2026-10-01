import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import type { HeatCell, Segment } from '@/lib/data'
import { fmt, weekdayNames } from '@/lib/data'

const grid = '#e7ebef'
const muted = '#7a8798'

export function AreaLine({ points, color = '#4c7bbd', height = 270 }: { points: { label: string; value: number }[]; color?: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const width = 760
  const pad = { top: 18, right: 14, bottom: 36, left: 42 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const max = Math.max(1, ...points.map((point) => point.value))
  const x = (index: number) => pad.left + (points.length <= 1 ? 0 : index / (points.length - 1)) * innerW
  const y = (value: number) => pad.top + innerH - (value / max) * innerH
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point.value)}`).join(' ')
  const area = points.length ? `${line} L${x(points.length - 1)},${pad.top + innerH} L${x(0)},${pad.top + innerH} Z` : ''
  const ticks = [0, 0.25, 0.5, 0.75, 1]
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible" role="img" aria-label="Udvikling over tid">
        <defs><linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.28" /><stop offset="100%" stopColor={color} stopOpacity="0.015" /></linearGradient></defs>
        {ticks.map((tick) => {
          const yy = pad.top + innerH - tick * innerH
          return <g key={tick}><line x1={pad.left} x2={width - pad.right} y1={yy} y2={yy} stroke={grid} /><text x={pad.left - 9} y={yy + 4} textAnchor="end" fill={muted} fontSize="10">{fmt(max * tick)}</text></g>
        })}
        {points.length > 1 && <motion.path d={area} fill="url(#area-fill)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} />}
        {points.length > 1 && <motion.path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />}
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)}>
            <rect x={x(index) - Math.max(5, innerW / Math.max(1, points.length) / 2)} y={pad.top} width={Math.max(10, innerW / Math.max(1, points.length))} height={innerH} fill="transparent" />
            {hover === index && <><line x1={x(index)} x2={x(index)} y1={pad.top} y2={pad.top + innerH} stroke={color} strokeDasharray="3 4" /><circle cx={x(index)} cy={y(point.value)} r="5" fill="white" stroke={color} strokeWidth="3" /></>}
          </g>
        ))}
        {points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.max(1, Math.round(points.length / 6)) === 0).map((point) => {
          const index = points.indexOf(point)
          return <text key={`${point.label}-axis`} x={x(index)} y={height - 10} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} fill={muted} fontSize="10">{point.label}</text>
        })}
      </svg>
      {hover !== null && points[hover] && <div className="pointer-events-none absolute right-3 top-3 rounded-xl border border-dp-navy-100 bg-white/95 px-3 py-2 shadow-card backdrop-blur"><div className="text-[0.68rem] font-semibold uppercase tracking-wider text-dp-navy-500">{points[hover].label}</div><div className="tnum mt-0.5 font-serif text-xl font-semibold text-dp-navy-900">{fmt(points[hover].value)}</div></div>}
    </div>
  )
}

export function Columns({ points, color = '#179fa0', height = 260 }: { points: { label: string; value: number }[]; color?: string; height?: number }) {
  const max = Math.max(1, ...points.map((point) => point.value))
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {points.map((point, index) => (
        <div key={point.label} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2" style={{ height: '100%' }}>
          <div className="tnum invisible text-[0.65rem] font-semibold text-dp-navy-700 group-hover:visible">{fmt(point.value)}</div>
          <div className="relative flex w-full flex-1 items-end overflow-hidden rounded-t-lg bg-dp-navy-50">
            <motion.div className="w-full rounded-t-lg" style={{ background: color }} initial={{ height: 0 }} whileInView={{ height: `${Math.max(point.value ? 2 : 0, (point.value / max) * 100)}%` }} viewport={{ once: true }} transition={{ duration: 0.75, delay: index * 0.035, ease: [0.22, 1, 0.36, 1] }} title={`${point.label}: ${point.value}`} />
          </div>
          <div className="w-full truncate text-center text-[0.62rem] text-dp-navy-500" title={point.label}>{point.label}</div>
        </div>
      ))}
    </div>
  )
}

export function HorizontalBars({ items, limit = 12, onSelect }: { items: Segment[]; limit?: number; onSelect?: (item: Segment) => void }) {
  const shown = useMemo(() => [...items].sort((a, b) => b.count - a.count).slice(0, limit), [items, limit])
  const max = Math.max(1, ...shown.map((item) => item.count))
  return (
    <div className="space-y-3.5">
      {shown.map((item, index) => {
        const content = <>
          <div className="mb-1.5 flex items-baseline justify-between gap-4 text-[0.78rem]"><span className="truncate font-medium text-dp-navy-800" title={item.label}>{item.label}</span><span className="tnum shrink-0 font-semibold text-dp-navy-900">{fmt(item.count)}</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-dp-navy-50"><motion.div className="h-full rounded-full" style={{ background: item.color }} initial={{ width: 0 }} whileInView={{ width: `${(item.count / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.75, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }} /></div>
        </>
        return onSelect ? <button key={item.label} type="button" onClick={() => onSelect(item)} className="group w-full rounded-lg p-1 text-left transition hover:bg-dp-navy-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-dp-blaa">{content}<span className="mt-1 hidden text-[0.65rem] font-semibold text-dp-blaa group-hover:block">Åbn detaljer</span></button> : <div key={item.label}>{content}</div>
      })}
    </div>
  )
}

export function Donut({ value, color, label }: { value: number; color: string; label: string }) {
  const degrees = Math.max(0, Math.min(1, value)) * 360
  return (
    <div className="flex items-center gap-4">
      <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${degrees}deg, #e7ebef ${degrees}deg)` }}>
        <div className="grid h-14 w-14 place-items-center rounded-full bg-white font-serif text-[0.95rem] font-semibold text-dp-navy-900">{Math.round(value * 100)}%</div>
      </div>
      <div><div className="text-sm font-semibold text-dp-navy-900">{label}</div><div className="mt-1 text-[0.75rem] leading-relaxed text-dp-navy-500">Andel af alle loggede henvendelser</div></div>
    </div>
  )
}

export function Heatmap({ cells }: { cells: HeatCell[] }) {
  const weekdays = [1, 2, 3, 4, 5, 6, 0]
  const hours = Array.from({ length: 15 }, (_, index) => index + 6)
  const lookup = new Map(cells.map((cell) => [`${cell.weekday}-${cell.hour}`, cell.count]))
  const max = Math.max(1, ...cells.map((cell) => cell.count))
  const shade = (count: number) => count === 0 ? '#f3f5f7' : `rgba(58,85,125,${0.14 + 0.86 * (count / max)})`
  return (
    <div className="thin-scroll overflow-x-auto">
      <div className="min-w-[43rem]">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `5.5rem repeat(${hours.length}, minmax(1.7rem,1fr))` }}>
          <div />{hours.map((hour) => <div key={hour} className="text-center text-[0.62rem] text-dp-navy-400">{hour}</div>)}
          {weekdays.map((weekday) => <div key={weekday} className="contents"><div className="flex items-center text-[0.68rem] font-medium text-dp-navy-600">{weekdayNames[weekday]}</div>{hours.map((hour) => { const count = lookup.get(`${weekday}-${hour}`) || 0; return <div key={hour} className="aspect-square rounded-[5px] transition hover:ring-2 hover:ring-dp-orange" style={{ background: shade(count) }} title={`${weekdayNames[weekday]} kl. ${hour}: ${count} mails`} /> })}</div>)}
        </div>
        <div className="mt-3 flex items-center justify-end gap-1 text-[0.65rem] text-dp-navy-400"><span>Lav</span>{[0.15, 0.3, 0.45, 0.6, 0.8, 1].map((opacity) => <span key={opacity} className="h-3 w-5 rounded-[2px]" style={{ background: `rgba(58,85,125,${opacity})` }} />)}<span>Høj</span></div>
      </div>
    </div>
  )
}
