import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

const ease = [0.22, 1, 0.36, 1] as const

export function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-dp-navy text-[0.9375rem] font-bold leading-none text-white" aria-hidden="true">DP</div>
      <div className="leading-none">
        <div className={`text-[0.6875rem] font-semibold uppercase tracking-[0.15em] ${onDark ? 'text-dp-navy-300' : 'text-dp-navy-500'}`}>Dansk Psykolog Forening</div>
        <div className={`mt-1 font-serif text-[0.9375rem] font-semibold ${onDark ? 'text-white' : 'text-dp-navy-900'}`}>Hovedpostkassen</div>
      </div>
    </div>
  )
}

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px -6% 0px' })
  const reduced = useReducedMotion()
  return (
    <motion.div ref={ref} className={className} initial={reduced ? false : { opacity: 0, y: 18 }} animate={inView || reduced ? { opacity: 1, y: 0 } : undefined} transition={{ duration: 0.65, ease, delay }}>
      {children}
    </motion.div>
  )
}

export function AnimatedNumber({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(reduced ? value : 0)
  const finalValue = value.toLocaleString('da-DK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  useEffect(() => {
    if (!inView) return
    if (reduced) { setShown(value); return }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1000)
      setShown(value * (1 - Math.pow(1 - t, 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, reduced, value])
  return (
    <>
      <span ref={ref} aria-hidden="true">{shown.toLocaleString('da-DK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>
      <span className="sr-only">{finalValue}{suffix}</span>
    </>
  )
}

export function Kicker({ children, color = '#df790d' }: { children: ReactNode; color?: string }) {
  return <div className="kicker" style={{ color }}>{children}</div>
}

export function SectionHeading({ kicker, title, lead, onDark = false, right }: { kicker: string; title: string; lead?: string; onDark?: boolean; right?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-3xl">
        <Kicker color={onDark ? '#8da6d6' : '#df790d'}>{kicker}</Kicker>
        <h2 className={`mt-3 text-display-md font-semibold ${onDark ? 'text-white' : 'text-dp-navy-900'}`}>{title}</h2>
        {lead && <p className={`mt-3 max-w-2xl text-[0.9375rem] leading-relaxed ${onDark ? 'text-dp-navy-300' : 'text-dp-navy-600'}`}>{lead}</p>}
      </div>
      {right}
    </div>
  )
}

export function Section({ id, children, tone = 'light' }: { id: string; children: ReactNode; tone?: 'light' | 'sunken' | 'dark' }) {
  return (
    <section id={id} className={`scroll-mt-52 ${tone === 'dark' ? 'bg-dp-navy-900' : tone === 'sunken' ? 'bg-dp-grey' : 'bg-white'}`}>
      <div className="mx-auto w-full max-w-[80rem] px-4 py-14 sm:px-6 sm:py-20">{children}</div>
    </section>
  )
}

export function ChartCard({ title, subtitle, children, table, className = '' }: { title: string; subtitle?: string; children: ReactNode; table?: ReactNode; className?: string }) {
  const [showTable, setShowTable] = useState(false)
  const id = useId()
  return (
    <article className={`card p-5 sm:p-6 ${className}`} aria-labelledby={id}>
      <header className="mb-5 flex items-start justify-between gap-5">
        <div>
          <h3 id={id} className="text-[1.0625rem] font-semibold text-dp-navy-900">{title}</h3>
          {subtitle && <p className="mt-1 text-[0.8125rem] leading-snug text-dp-navy-500">{subtitle}</p>}
        </div>
        {table && <button type="button" onClick={() => setShowTable((value) => !value)} className="shrink-0 rounded-full border border-dp-navy-100 px-3 py-1 text-[0.6875rem] font-semibold text-dp-navy-600 transition hover:border-dp-navy-300" aria-pressed={showTable}>{showTable ? 'Vis graf' : 'Vis tal'}</button>}
      </header>
      {showTable && table ? table : children}
    </article>
  )
}

export function Metric({ label, value, suffix, sub, accent = '#ffffff', delay = 0, badge }: { label: string; value: number; suffix?: string; sub: ReactNode; accent?: string; delay?: number; badge?: ReactNode }) {
  return (
    <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease, delay }} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[0.8125rem] font-semibold text-dp-navy-300">{label}</div>
        {badge}
      </div>
      <div className="tnum mt-2 font-serif text-[clamp(2.3rem,4vw,3.2rem)] font-semibold leading-none" style={{ color: accent }}><AnimatedNumber value={value} suffix={suffix} /></div>
      <div className="mt-4 border-t border-white/10 pt-3 text-[0.78rem] leading-relaxed text-dp-navy-300">{sub}</div>
    </motion.article>
  )
}

export function Badge({ children, color = '#4c7bbd' }: { children: ReactNode; color?: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold" style={{ color, background: `${color}1d` }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />{children}</span>
}

export function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="thin-scroll overflow-x-auto">
      <table className="w-full min-w-[26rem] border-collapse text-left text-[0.78rem]">
        <thead><tr>{headers.map((header) => <th key={header} className="border-b border-dp-navy-100 pb-2 pr-4 font-semibold text-dp-navy-500">{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i} className={`border-b border-dp-navy-50 py-2 pr-4 ${i ? 'tnum text-right font-medium' : 'text-dp-navy-800'}`}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}
