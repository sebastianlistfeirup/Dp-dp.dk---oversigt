import { useEffect, useState } from 'react'

export interface CountPoint { count: number }
export interface DailyPoint extends CountPoint { date: string }
export interface WeeklyPoint extends CountPoint { week: string }
export interface MonthlyPoint extends CountPoint { month: string }
export interface Segment extends CountPoint { label: string; color: string }
export interface Route extends Segment { match: string; email: string }
export interface Theme extends Segment { share: number; summary: string; confidence: number; highConfidenceRate: number }
export interface HeatCell { weekday: number; hour: number; count: number }
export interface ConfidenceSummary { average: number; high: number; medium: number; low: number }
export interface PeriodComparison {
  key: 'week' | 'month' | 'year'
  label: string
  baseline: string
  current: number
  previous: number | null
  delta: number | null
  change: number | null
  available: boolean
  currentStart: string
  currentEnd: string
  previousStart: string
  previousEnd: string
}
export interface ThemeDrilldown {
  label: string
  count: number
  confidence: ConfidenceSummary
  subtypes: Segment[]
  routing: Segment[]
  daily: DailyPoint[]
  busiestDays: DailyPoint[]
}
export interface RouteDrilldown {
  label: string
  match: string
  count: number
  confidence: ConfidenceSummary
  routingQuality: number | null
  routingQualityCoverage: number
  themes: Segment[]
  subtypes: Segment[]
  daily: DailyPoint[]
  busiestDays: DailyPoint[]
}

export interface DashboardData {
  meta: {
    generatedAt: string
    sourceRows: number
    validRows: number
    missingTimestamp: number
    firstDate: string | null
    latestDate: string | null
    modelVersion: string
    privacy: string
  }
  summary: {
    latestDay: DailyPoint
    previousActiveDay: DailyPoint
    latestWeek: WeeklyPoint
    latestMonth: MonthlyPoint
    peakDay: DailyPoint
    activeAverage: number
    fallbackRows: number
    fallbackRate: number
    classifiedRows: number
    classifiedRate: number
  }
  comparisons: PeriodComparison[]
  classification: ConfidenceSummary & { method: string; unknown: number }
  daily: DailyPoint[]
  weekly: WeeklyPoint[]
  monthly: MonthlyPoint[]
  routing: Route[]
  themes: Theme[]
  keywords: Segment[]
  heatmap: HeatCell[]
  drilldowns: { themes: ThemeDrilldown[]; routes: RouteDrilldown[] }
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    fetch(`${import.meta.env.BASE_URL}data/mail-dashboard.json`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<DashboardData>
      })
      .then((payload) => live && setData(payload))
      .catch((reason: unknown) => live && setError(reason instanceof Error ? reason.message : 'Ukendt fejl'))
    return () => { live = false }
  }, [])
  return { data, error }
}

export const fmt = (value: number, decimals = 0) => value.toLocaleString('da-DK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
export const pct = (value: number, decimals = 1) => `${fmt(value * 100, decimals)} %`
export const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${fmt(Math.abs(value))}`

export function dateLabel(value: string | null, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('da-DK', options).format(new Date(`${value}T12:00:00Z`))
}

export function monthLabel(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('da-DK', { month: 'long', year: 'numeric' }).format(new Date(`${value}-01T12:00:00Z`))
}

export function relativeChange(current: number, previous: number) {
  if (!previous) return null
  return (current - previous) / previous
}

export const weekdayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag']
