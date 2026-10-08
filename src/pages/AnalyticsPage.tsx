import { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, BarChart,
  CartesianGrid, XAxis, YAxis, Tooltip, Line, Bar, Legend,
} from 'recharts'
import { format, startOfWeek, addWeeks, isBefore } from 'date-fns'
import { useAllRuns } from '../lib/hooks/useRuns'
import { useExperiments } from '../lib/hooks/useExperiments'
import { PageLayout } from '../components/layout/PageLayout'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { PageSpinner } from '../components/ui/Spinner'
import type { ExperimentRun } from '../types'

// ── color palette ─────────────────────────────────────────────────────────────

const COLORS = [
  '#E879A0', // pink
  '#7C3AED', // violet
  '#2563EB', // blue
  '#059669', // emerald
  '#D97706', // amber
  '#DC2626', // red
  '#0891B2', // cyan
  '#9333EA', // purple
]

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-neutral-100 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-neutral-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value.toFixed(2)}
          {p.name.toLowerCase().includes('accuracy') || p.name.toLowerCase().includes('%') ? '%' : ''}
        </p>
      ))}
    </div>
  )
}

function PercentTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-neutral-100 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-neutral-700 mb-0.5">{label}</p>
      <p className="text-pink font-semibold">{payload[0].value.toFixed(2)}%</p>
    </div>
  )
}

function NumericTooltip({ active, payload, label, unit = '' }: { active?: boolean; payload?: { value: number }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-neutral-100 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-neutral-700 mb-0.5">{label}</p>
      <p className="text-pink font-semibold">{payload[0].value.toFixed(1)}{unit}</p>
    </div>
  )
}

function CountTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-neutral-100 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-neutral-700 mb-0.5">{label}</p>
      <p className="text-pink font-semibold">{payload[0].value} experiment{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

// ── Empty chart state ─────────────────────────────────────────────────────────

function ChartEmpty({ chartName }: { chartName: string }) {
  return (
    <div className="flex items-center justify-center h-52 text-center px-4">
      <p className="text-sm text-neutral-400 italic">
        Add more experiments to see {chartName} here.
      </p>
    </div>
  )
}

// ── 1. Accuracy Over Time ─────────────────────────────────────────────────────

type AllRunRow = {
  id: string
  accuracy: number | null
  created_at: string
  experiment_id: string
  experiment?: { name: string; model_id?: string | null; model?: { name: string } | null } | null
}

interface AccuracyOverTimeChartProps {
  allRuns: AllRunRow[]
}

function AccuracyOverTimeChart({ allRuns }: AccuracyOverTimeChartProps) {
  const { experimentNames, dateMap } = useMemo(() => {
    // Get unique experiment names
    const expNames = new Set<string>()
    for (const r of allRuns) {
      if (r.accuracy !== null) {
        expNames.add(r.experiment?.name ?? r.experiment_id)
      }
    }
    const experimentNames = Array.from(expNames).slice(0, 8) // limit to 8 lines

    // Build date → { expName: accuracy } map
    const dateMap = new Map<string, Record<string, number>>()
    for (const r of allRuns) {
      if (r.accuracy === null) continue
      const expName = r.experiment?.name ?? r.experiment_id
      if (!experimentNames.includes(expName)) continue
      const dateKey = format(new Date(r.created_at), 'MMM d')
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, {})
      const entry = dateMap.get(dateKey)!
      const acc = Math.round(r.accuracy * 10000) / 100
      // Keep highest accuracy for that date+experiment
      if (entry[expName] === undefined || acc > entry[expName]) {
        entry[expName] = acc
      }
    }

    return { experimentNames, dateMap }
  }, [allRuns])

  const data = useMemo(() => {
    return Array.from(dateMap.entries()).map(([date, values]) => ({
      date,
      ...values,
    }))
  }, [dateMap])

  const hasData = data.length >= 2

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accuracy Over Time</CardTitle>
      </CardHeader>
      <p className="text-xs text-neutral-400 mb-4">Best accuracy per date, one line per experiment.</p>
      {!hasData ? (
        <ChartEmpty chartName="Accuracy Over Time" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
            <Tooltip content={<ChartTooltip />} />
            {experimentNames.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {experimentNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 0, fill: COLORS[i % COLORS.length] }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

// ── 2. Accuracy by Model ──────────────────────────────────────────────────────

interface AccuracyByModelChartProps {
  allRuns: AllRunRow[]
}

function AccuracyByModelChart({ allRuns }: AccuracyByModelChartProps) {
  const data = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of allRuns) {
      if (r.accuracy === null) continue
      const modelName = r.experiment?.model?.name ?? 'Unknown'
      const prev = map.get(modelName) ?? 0
      if (r.accuracy > prev) map.set(modelName, r.accuracy)
    }
    return Array.from(map.entries())
      .map(([model, accuracy]) => ({
        model,
        accuracy: Math.round(accuracy * 10000) / 100,
      }))
      .sort((a, b) => b.accuracy - a.accuracy)
  }, [allRuns])

  const hasData = data.length >= 2

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accuracy by Model</CardTitle>
      </CardHeader>
      <p className="text-xs text-neutral-400 mb-4">Best accuracy achieved per model.</p>
      {!hasData ? (
        <ChartEmpty chartName="Accuracy by Model" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="model"
              tick={{ fontSize: 11, fill: '#888' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => v.length > 10 ? v.slice(0, 10) + '…' : v}
            />
            <YAxis tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
            <Tooltip content={<PercentTooltip />} />
            <Bar dataKey="accuracy" fill="#E879A0" radius={[4, 4, 0, 0]} maxBarSize={60} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

// ── 3. Training Time Distribution ────────────────────────────────────────────

interface TrainingTimeChartProps {
  allRuns: AllRunRow[]
}

type AllRunWithTime = AllRunRow & { training_time_seconds?: number | null }

function TrainingTimeChart({ allRuns }: TrainingTimeChartProps) {
  const data = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of allRuns as AllRunWithTime[]) {
      if (!r.training_time_seconds) continue
      const expName = r.experiment?.name ?? r.experiment_id
      const prev = map.get(expName) ?? 0
      // Use the maximum training time per experiment
      if (r.training_time_seconds > prev) map.set(expName, r.training_time_seconds)
    }
    return Array.from(map.entries())
      .map(([experiment, time]) => ({ experiment, time }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 12)
  }, [allRuns])

  const hasData = data.length >= 2

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training Time Distribution</CardTitle>
      </CardHeader>
      <p className="text-xs text-neutral-400 mb-4">Max training time per experiment in seconds.</p>
      {!hasData ? (
        <ChartEmpty chartName="Training Time Distribution" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="experiment"
              tick={{ fontSize: 11, fill: '#888' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => v.length > 10 ? v.slice(0, 10) + '…' : v}
            />
            <YAxis tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} unit="s" />
            <Tooltip content={<NumericTooltip unit="s" />} />
            <Bar dataKey="time" fill="#E879A0" radius={[4, 4, 0, 0]} maxBarSize={60} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

// ── 4. Experiment Activity ────────────────────────────────────────────────────

interface ExperimentActivityChartProps {
  experiments: Array<{ created_at: string }>
}

function ExperimentActivityChart({ experiments }: ExperimentActivityChartProps) {
  const data = useMemo(() => {
    if (experiments.length < 2) return []

    // Find the date range
    const dates = experiments.map(e => new Date(e.created_at))
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

    // Generate weekly buckets
    const weekStart = startOfWeek(minDate, { weekStartsOn: 1 })
    const buckets: { week: string; count: number }[] = []
    let cursor = weekStart

    while (isBefore(cursor, addWeeks(maxDate, 1))) {
      const label = format(cursor, 'MMM d')
      const weekEnd = addWeeks(cursor, 1)
      const count = experiments.filter(e => {
        const d = new Date(e.created_at)
        return d >= cursor && d < weekEnd
      }).length
      buckets.push({ week: label, count })
      cursor = weekEnd
    }

    return buckets
  }, [experiments])

  const hasData = data.length >= 2

  return (
    <Card>
      <CardHeader>
        <CardTitle>Experiment Activity</CardTitle>
      </CardHeader>
      <p className="text-xs text-neutral-400 mb-4">Number of experiments created per week.</p>
      {!hasData ? (
        <ChartEmpty chartName="Experiment Activity" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<CountTooltip />} />
            <Bar dataKey="count" fill="#E879A0" radius={[4, 4, 0, 0]} maxBarSize={60} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

// ── 5. Performance by Dataset ─────────────────────────────────────────────────

interface PerformanceByDatasetChartProps {
  allRuns: AllRunRow[]
  experiments: Array<{ id: string; dataset?: { name: string } | null }>
}

function PerformanceByDatasetChart({ allRuns, experiments }: PerformanceByDatasetChartProps) {
  const data = useMemo(() => {
    // Build experiment_id → dataset name map
    const expDatasetMap = new Map<string, string>()
    for (const exp of experiments) {
      if (exp.dataset?.name) expDatasetMap.set(exp.id, exp.dataset.name)
    }

    const map = new Map<string, number>()
    for (const r of allRuns) {
      if (r.accuracy === null) continue
      const dataset = expDatasetMap.get(r.experiment_id) ?? null
      if (!dataset) continue
      const prev = map.get(dataset) ?? 0
      if (r.accuracy > prev) map.set(dataset, r.accuracy)
    }

    return Array.from(map.entries())
      .map(([dataset, accuracy]) => ({
        dataset,
        accuracy: Math.round(accuracy * 10000) / 100,
      }))
      .sort((a, b) => b.accuracy - a.accuracy)
  }, [allRuns, experiments])

  const hasData = data.length >= 2

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance by Dataset</CardTitle>
      </CardHeader>
      <p className="text-xs text-neutral-400 mb-4">Best accuracy achieved per dataset.</p>
      {!hasData ? (
        <ChartEmpty chartName="Performance by Dataset" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="dataset"
              tick={{ fontSize: 11, fill: '#888' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => v.length > 10 ? v.slice(0, 10) + '…' : v}
            />
            <YAxis tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
            <Tooltip content={<PercentTooltip />} />
            <Bar dataKey="accuracy" fill="#E879A0" radius={[4, 4, 0, 0]} maxBarSize={60} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data: allRunsRaw, isLoading: runsLoading } = useAllRuns()
  const { data: experiments = [], isLoading: expsLoading } = useExperiments()

  const isLoading = runsLoading || expsLoading

  // Type cast allRuns to include the nested experiment relation returned by useAllRuns
  const allRuns = (allRunsRaw ?? []) as Array<ExperimentRun & {
    experiment?: { name: string; model_id?: string | null; model?: { name: string } | null } | null
  }>

  return (
    <PageLayout
      title="Analytics"
      description="Visualize trends and patterns across all your experiments."
    >
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="xl:col-span-2">
            <AccuracyOverTimeChart allRuns={allRuns} />
          </div>
          <AccuracyByModelChart allRuns={allRuns} />
          <TrainingTimeChart allRuns={allRuns} />
          <ExperimentActivityChart experiments={experiments} />
          <PerformanceByDatasetChart allRuns={allRuns} experiments={experiments} />
        </div>
      )}
    </PageLayout>
  )
}
