import type {
  ConfidenceSummary,
  DashboardData,
  DailyPoint,
  FilterFact,
  HeatCell,
  MonthlyPoint,
  PeriodComparison,
  Route,
  RouteDrilldown,
  Segment,
  Theme,
  ThemeDrilldown,
  WeeklyPoint,
} from '@/lib/data'

export interface DashboardFilters {
  from: string
  to: string
  theme: string
  route: string
}

export interface ForecastResult {
  asOf: string | null
  available: boolean
  week: { actual: number; estimate: number; low: number; high: number; remaining: number }
  month: { actual: number; estimate: number; low: number; high: number; remaining: number }
  historyWeeks: number
}

export interface ChangeItem {
  label: string
  current: number
  previous: number
  delta: number
  change: number | null
  shareShift?: number
}

export interface MonthlyChangeResult {
  available: boolean
  currentMonth: string | null
  previousMonth: string | null
  current: number
  previous: number
  delta: number
  change: number | null
  increases: ChangeItem[]
  decreases: ChangeItem[]
  routeShifts: ChangeItem[]
}

export interface RuleQualityFinding {
  route: string
  total: number
  reviewed: number
  mismatches: number
  matchRate: number | null
  coverage: number
  mainMismatch: string | null
  mainMismatchCount: number
}

export interface AnalyticsResult {
  dashboard: DashboardData
  forecast: ForecastResult
  monthlyChange: MonthlyChangeResult
  ruleQuality: RuleQualityFinding[]
  filterActive: boolean
}

const UNKNOWN = 'Andet eller uklart'
const FALLBACK = 'Fallback'
const palette = ['#4c7bbd', '#df790d', '#179fa0', '#d24e46', '#4e4897', '#d8a90c', '#6b8f71', '#aa6380']

export function buildAnalytics(source: DashboardData, filters: DashboardFilters): AnalyticsResult {
  const filterActive = Boolean(filters.from || filters.to || filters.theme || filters.route)
  const facts = source.filterFacts.filter((fact) => factMatches(fact, filters))
  const scopeFacts = source.filterFacts.filter((fact) => factMatches(fact, { ...filters, from: '', to: '' }))
  const keywords = source.keywordFacts
    .filter((fact) => keywordMatches(fact, filters))
    .reduce((map, fact) => bump(map, fact.label, fact.count), new Map<string, number>())
  const total = sumFacts(facts)
  const valid = sumFacts(facts.filter((fact) => fact.date))
  const daily: DailyPoint[] = sortedEntries(groupCount(facts.filter((fact) => fact.date), (fact) => fact.date as string)).map(([date, count]) => ({ date, count }))
  const weekly: WeeklyPoint[] = sortedEntries(groupCount(facts.filter((fact) => fact.date), (fact) => weekKey(fact.date as string))).map(([week, count]) => ({ week, count }))
  const monthly: MonthlyPoint[] = sortedEntries(groupCount(facts.filter((fact) => fact.date), (fact) => (fact.date as string).slice(0, 7))).map(([month, count]) => ({ month, count }))
  const routing = buildRoutes(source.routing, facts)
  const themes = buildThemes(source.themes, facts, total)
  const classification = confidenceSummary(facts)
  const fallbackRows = sumFacts(facts.filter((fact) => fact.routeMatch === FALLBACK))
  const unknownRows = sumFacts(facts.filter((fact) => fact.theme === UNKNOWN))
  const latestDay = daily.at(-1) || { date: source.meta.latestDate || '', count: 0 }
  const previousActiveDay = daily.at(-2) || { date: latestDay.date, count: 0 }
  const latestWeek = weekly.at(-1) || { week: latestDay.date ? weekKey(latestDay.date) : '', count: 0 }
  const latestMonth = monthly.at(-1) || { month: latestDay.date?.slice(0, 7) || '', count: 0 }
  const peakDay = [...daily].sort((a, b) => b.count - a.count || b.date.localeCompare(a.date))[0] || latestDay
  const last20 = daily.slice(-20)
  const activeAverage = last20.length ? last20.reduce((sum, item) => sum + item.count, 0) / last20.length : 0
  const firstDate = daily[0]?.date || null
  const lastDate = daily.at(-1)?.date || null

  const dashboard: DashboardData = {
    ...source,
    meta: {
      ...source.meta,
      sourceRows: total,
      validRows: valid,
      missingTimestamp: total - valid,
      firstDate,
      latestDate: lastDate,
    },
    summary: {
      latestDay,
      previousActiveDay,
      latestWeek,
      latestMonth,
      peakDay,
      activeAverage,
      fallbackRows,
      fallbackRate: total ? fallbackRows / total : 0,
      classifiedRows: total - unknownRows,
      classifiedRate: total ? (total - unknownRows) / total : 0,
    },
    comparisons: buildComparisons(facts, source.meta.latestDate, firstDate),
    classification: {
      ...classification,
      method: source.classification.method,
      unknown: unknownRows,
    },
    daily,
    weekly,
    monthly,
    routing,
    themes,
    keywords: [...keywords.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'da'))
      .slice(0, 18)
      .map(([label, count], index) => ({ label, count, color: palette[index % palette.length] })),
    heatmap: buildHeatmap(facts),
    drilldowns: buildDrilldowns(facts, daily, themes, routing),
  }

  return {
    dashboard,
    forecast: buildForecast(scopeFacts, filters.to && source.meta.latestDate && filters.to < source.meta.latestDate ? null : source.meta.latestDate, source.daily),
    monthlyChange: buildMonthlyChange(facts, source.meta.latestDate, source.daily, filters),
    ruleQuality: buildRuleQuality(facts),
    filterActive,
  }
}

function factMatches(fact: FilterFact, filters: DashboardFilters) {
  if (filters.theme && fact.theme !== filters.theme) return false
  if (filters.route && fact.route !== filters.route) return false
  if (filters.from && (!fact.date || fact.date < filters.from)) return false
  if (filters.to && (!fact.date || fact.date > filters.to)) return false
  return true
}

function keywordMatches(fact: DashboardData['keywordFacts'][number], filters: DashboardFilters) {
  if (filters.theme && fact.theme !== filters.theme) return false
  if (filters.route && fact.route !== filters.route) return false
  if (filters.from && (!fact.date || fact.date < filters.from)) return false
  if (filters.to && (!fact.date || fact.date > filters.to)) return false
  return true
}

function buildRoutes(definitions: Route[], facts: FilterFact[]) {
  const counts = groupCount(facts, (fact) => fact.route)
  const known = definitions.map((route) => ({ ...route, count: counts.get(route.label) || 0 }))
  for (const [label, count] of counts) if (!known.some((route) => route.label === label)) known.push({ label, match: label, email: 'Ikke konfigureret', count, color: '#8299bb' })
  return known
}

function buildThemes(definitions: Theme[], facts: FilterFact[], total: number) {
  const counts = groupCount(facts, (fact) => fact.theme)
  return definitions.map((theme) => {
    const subset = facts.filter((fact) => fact.theme === theme.label)
    const confidence = confidenceSummary(subset)
    const count = counts.get(theme.label) || 0
    return { ...theme, count, share: total ? count / total : 0, confidence: confidence.average, highConfidenceRate: count ? confidence.high / count : 0 }
  })
}

function buildHeatmap(facts: FilterFact[]): HeatCell[] {
  const map = new Map<string, number>()
  for (const fact of facts) if (fact.weekday !== null && fact.hour !== null) bump(map, `${fact.weekday}-${fact.hour}`, fact.count)
  return [...map.entries()].map(([key, count]) => {
    const [weekday, hour] = key.split('-').map(Number)
    return { weekday, hour, count }
  })
}

function buildDrilldowns(facts: FilterFact[], daily: DailyPoint[], themes: Theme[], routes: Route[]) {
  const themeDrilldowns: ThemeDrilldown[] = themes.map((theme) => {
    const subset = facts.filter((fact) => fact.theme === theme.label)
    return {
      label: theme.label,
      count: sumFacts(subset),
      confidence: confidenceSummary(subset),
      subtypes: segments(groupCount(subset, (fact) => fact.subtype)),
      routing: segments(groupCount(subset, (fact) => fact.route)),
      daily: dailyTrend(subset, daily),
      busiestDays: busiest(dailyTrend(subset, daily)),
    }
  })
  const routeDrilldowns: RouteDrilldown[] = routes.map((route) => {
    const subset = facts.filter((fact) => fact.route === route.label)
    const reviewable = subset.filter((fact) => fact.routeReviewable)
    const reviewed = sumFacts(reviewable)
    const matched = sumFacts(reviewable.filter((fact) => fact.routeAligned))
    const count = sumFacts(subset)
    const trend = dailyTrend(subset, daily)
    return {
      label: route.label,
      match: route.match,
      count,
      confidence: confidenceSummary(subset),
      routingQuality: route.match === FALLBACK || !reviewed ? null : matched / reviewed,
      routingQualityCoverage: count ? reviewed / count : 0,
      themes: segments(groupCount(subset, (fact) => fact.theme)),
      subtypes: segments(groupCount(subset, (fact) => fact.subtype)),
      daily: trend,
      busiestDays: busiest(trend),
    }
  })
  return { themes: themeDrilldowns, routes: routeDrilldowns }
}

function buildForecast(facts: FilterFact[], asOf: string | null, coverage: DailyPoint[]): ForecastResult {
  const empty = { asOf, available: false, week: { actual: 0, estimate: 0, low: 0, high: 0, remaining: 0 }, month: { actual: 0, estimate: 0, low: 0, high: 0, remaining: 0 }, historyWeeks: 0 }
  if (!asOf) return empty
  const dated = facts.filter((fact) => fact.date && fact.date <= asOf)
  if (!dated.length) return empty
  const daily = groupCount(dated, (fact) => fact.date as string)
  const currentWeekStart = weekKey(asOf)
  const weekdayHistory = Array.from({ length: 7 }, () => [] as number[])
  for (const point of [...coverage].reverse()) {
    if (point.date >= currentWeekStart) continue
    const index = weekday(point.date)
    if (weekdayHistory[index].length < 8) weekdayHistory[index].push(daily.get(point.date) || 0)
  }
  const weekdayAverage = weekdayHistory.map((values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0)
  const historyWeeks = Math.max(...weekdayHistory.map((values) => values.length), 0)
  if (!historyWeeks) return empty
  const weekActual = countRange(daily, currentWeekStart, asOf)
  const weekEnd = addDays(currentWeekStart, 6)
  const weekRemaining = projectedRange(asOf, weekEnd, weekdayAverage)
  const monthStart = `${asOf.slice(0, 7)}-01`
  const monthEnd = endOfMonth(asOf)
  const monthActual = countRange(daily, monthStart, asOf)
  const monthRemaining = projectedRange(asOf, monthEnd, weekdayAverage)
  return {
    asOf,
    available: true,
    week: forecastBand(weekActual, weekRemaining),
    month: forecastBand(monthActual, monthRemaining),
    historyWeeks,
  }
}

function forecastBand(actual: number, remaining: number) {
  const estimate = Math.round(actual + remaining)
  const uncertainty = Math.max(2, Math.round(remaining * 0.2))
  return { actual, estimate, low: Math.max(actual, estimate - uncertainty), high: estimate + uncertainty, remaining: Math.max(0, Math.round(remaining)) }
}

function projectedRange(asOf: string, end: string, weekdayAverage: number[]) {
  let result = 0
  for (let day = addDays(asOf, 1); day <= end; day = addDays(day, 1)) result += weekdayAverage[weekday(day)] || 0
  return result
}

function buildMonthlyChange(facts: FilterFact[], asOf: string | null, coverage: DailyPoint[], filters: DashboardFilters): MonthlyChangeResult {
  const unavailable: MonthlyChangeResult = { available: false, currentMonth: null, previousMonth: null, current: 0, previous: 0, delta: 0, change: null, increases: [], decreases: [], routeShifts: [] }
  if (!asOf) return unavailable
  const completeMonths = [...new Set(coverage.map((point) => point.date.slice(0, 7)))]
    .filter((month) => month < asOf.slice(0, 7))
    .filter((month) => {
      const dates = coverage.filter((point) => point.date.startsWith(month)).map((point) => point.date)
      return dates[0] === `${month}-01` && dates.at(-1) === endOfMonth(`${month}-01`)
    })
    .sort()
  const currentMonth = completeMonths.at(-1) || null
  const previousMonth = completeMonths.at(-2) || null
  if (!currentMonth || !previousMonth) return unavailable
  const requiredStart = `${previousMonth}-01`
  const requiredEnd = endOfMonth(`${currentMonth}-01`)
  if ((filters.from && filters.from > requiredStart) || (filters.to && filters.to < requiredEnd)) return { ...unavailable, currentMonth, previousMonth }
  const currentFacts = facts.filter((fact) => fact.date?.startsWith(currentMonth))
  const previousFacts = facts.filter((fact) => fact.date?.startsWith(previousMonth))
  const current = sumFacts(currentFacts)
  const previous = sumFacts(previousFacts)
  const themeChanges = categoryChanges(currentFacts, previousFacts, (fact) => fact.theme)
  const routeChanges = categoryChanges(currentFacts, previousFacts, (fact) => fact.route).map((item) => ({ ...item, shareShift: item.current / current - item.previous / previous }))
  return {
    available: true,
    currentMonth,
    previousMonth,
    current,
    previous,
    delta: current - previous,
    change: previous ? (current - previous) / previous : null,
    increases: [...themeChanges].filter((item) => item.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5),
    decreases: [...themeChanges].filter((item) => item.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5),
    routeShifts: routeChanges.sort((a, b) => Math.abs(b.shareShift || 0) - Math.abs(a.shareShift || 0)).slice(0, 5),
  }
}

function categoryChanges(current: FilterFact[], previous: FilterFact[], key: (fact: FilterFact) => string): ChangeItem[] {
  const a = groupCount(current, key)
  const b = groupCount(previous, key)
  return [...new Set([...a.keys(), ...b.keys()])].map((label) => {
    const now = a.get(label) || 0
    const before = b.get(label) || 0
    return { label, current: now, previous: before, delta: now - before, change: before ? (now - before) / before : null }
  })
}

function buildRuleQuality(facts: FilterFact[]): RuleQualityFinding[] {
  const routes = [...new Set(facts.map((fact) => fact.route))].filter((route) => route !== 'Fallback / manuel sortering')
  return routes.map((route) => {
    const subset = facts.filter((fact) => fact.route === route)
    const reviewable = subset.filter((fact) => fact.routeReviewable)
    const mismatched = reviewable.filter((fact) => fact.routeAligned === false)
    const mismatchThemes = groupCount(mismatched, (fact) => fact.independentTheme)
    const main = [...mismatchThemes.entries()].sort((a, b) => b[1] - a[1])[0]
    const total = sumFacts(subset)
    const reviewed = sumFacts(reviewable)
    const mismatches = sumFacts(mismatched)
    return { route, total, reviewed, mismatches, matchRate: reviewed ? (reviewed - mismatches) / reviewed : null, coverage: total ? reviewed / total : 0, mainMismatch: main?.[0] || null, mainMismatchCount: main?.[1] || 0 }
  }).filter((item) => item.total > 0).sort((a, b) => (a.matchRate ?? 2) - (b.matchRate ?? 2) || b.mismatches - a.mismatches)
}

function buildComparisons(facts: FilterFact[], asOf: string | null, firstDate: string | null): PeriodComparison[] {
  if (!asOf) return []
  const daily = groupCount(facts.filter((fact) => fact.date), (fact) => fact.date as string)
  const make = (key: PeriodComparison['key'], label: string, currentStart: string, currentEnd: string, previousStart: string, previousEnd: string, baseline: string): PeriodComparison => {
    const current = countRange(daily, currentStart, currentEnd)
    const available = Boolean(firstDate && firstDate <= previousStart)
    const previous = available ? countRange(daily, previousStart, previousEnd) : null
    return { key, label, baseline, current, previous, delta: previous === null ? null : current - previous, change: previous ? (current - previous) / previous : null, available, currentStart, currentEnd, previousStart, previousEnd }
  }
  const weekStart = weekKey(asOf)
  const weekElapsed = daysBetween(weekStart, asOf)
  const previousWeek = addDays(weekStart, -7)
  const monthStart = `${asOf.slice(0, 7)}-01`
  const monthElapsed = daysBetween(monthStart, asOf)
  const previousMonthStart = `${previousMonthKey(asOf.slice(0, 7))}-01`
  const previousYearStart = `${Number(asOf.slice(0, 4)) - 1}${monthStart.slice(4)}`
  return [
    make('week', 'Uge til dato', weekStart, asOf, previousWeek, addDays(previousWeek, weekElapsed), 'Forrige uge, samme antal kalenderdage'),
    make('month', 'Måned til dato', monthStart, asOf, previousMonthStart, addDays(previousMonthStart, monthElapsed), 'Forrige måned, samme antal kalenderdage'),
    make('year', 'Samme periode sidste år', monthStart, asOf, previousYearStart, addDays(previousYearStart, monthElapsed), 'Samme måned og antal kalenderdage sidste år'),
  ]
}

function confidenceSummary(facts: FilterFact[]): ConfidenceSummary {
  const total = sumFacts(facts)
  const high = sumFacts(facts.filter((fact) => fact.confidenceBand === 'high'))
  const medium = sumFacts(facts.filter((fact) => fact.confidenceBand === 'medium'))
  const low = sumFacts(facts.filter((fact) => fact.confidenceBand === 'low'))
  return { average: total ? facts.reduce((sum, fact) => sum + fact.confidenceTotal, 0) / total : 0, high, medium, low }
}

function dailyTrend(facts: FilterFact[], daily: DailyPoint[]) {
  const map = groupCount(facts.filter((fact) => fact.date), (fact) => fact.date as string)
  return daily.map((point) => ({ date: point.date, count: map.get(point.date) || 0 }))
}

function busiest(points: DailyPoint[]) {
  return [...points].filter((item) => item.count > 0).sort((a, b) => b.count - a.count || b.date.localeCompare(a.date)).slice(0, 5)
}

function segments(map: Map<string, number>): Segment[] {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'da')).map(([label, count], index) => ({ label, count, color: palette[index % palette.length] }))
}

function groupCount(facts: FilterFact[], key: (fact: FilterFact) => string) {
  const map = new Map<string, number>()
  for (const fact of facts) bump(map, key(fact), fact.count)
  return map
}

function sumFacts(facts: FilterFact[]) { return facts.reduce((sum, fact) => sum + fact.count, 0) }
function bump(map: Map<string, number>, key: string, amount: number) { map.set(key, (map.get(key) || 0) + amount); return map }
function sortedEntries(map: Map<string, number>) { return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])) }

function weekKey(day: string) {
  const date = new Date(`${day}T12:00:00Z`)
  const current = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() - current + 1)
  return date.toISOString().slice(0, 10)
}

function weekday(day: string) { return new Date(`${day}T12:00:00Z`).getUTCDay() }
function addDays(day: string, amount: number) { const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10) }
function daysBetween(start: string, end: string) { return Math.round((new Date(`${end}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86400000) }
function endOfMonth(day: string) { const date = new Date(`${day.slice(0, 7)}-01T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + 1); date.setUTCDate(0); return date.toISOString().slice(0, 10) }
function previousMonthKey(month: string) { const date = new Date(`${month}-01T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() - 1); return date.toISOString().slice(0, 7) }
function countRange(map: Map<string, number>, start: string, end: string) { let total = 0; for (let day = start; day <= end; day = addDays(day, 1)) total += map.get(day) || 0; return total }

