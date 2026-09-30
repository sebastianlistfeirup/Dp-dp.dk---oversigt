import { useEffect, useState } from 'react'

export interface CountPoint { count: number }
export interface DailyPoint extends CountPoint { date: string }
export interface WeeklyPoint extends CountPoint { week: string }
export interface MonthlyPoint extends CountPoint { month: string }
export interface Segment extends CountPoint { label: string; color: string }
export interface Route extends Segment { match: string; email: string }
export interface Theme extends Segment { share: number; summary: string }
export interface HeatCell { weekday: number; hour: number; count: number }

export interface DashboardData {
  meta: {
    generatedAt: string
    sourceRows: number
    validRows: number
    missingTimestamp: number
    firstDate: string | null
    latestDate: string | null
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
  daily: DailyPoint[]
  weekly: WeeklyPoint[]
  monthly: MonthlyPoint[]
  routing: Route[]
  themes: Theme[]
  keywords: Segment[]
  heatmap: HeatCell[]
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
