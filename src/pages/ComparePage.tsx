import { useState, useMemo } from 'react'
import { X, BarChart2 } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar,
} from 'recharts'
import { useExperiments } from '../lib/hooks/useExperiments'
import { PageLayout } from '../components/layout/PageLayout'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'
import { cn, formatAccuracy } from '../lib/utils'
import type { Experiment, ExperimentRun } from '../types'

// ── helpers ───────────────────────────────────────────────────────────────────

const MAX_SELECTED = 5

interface BestRunData {
  accuracy: number | null
  precision_score: number | null
  recall: number | null
  f1_score: number | null
  loss: number | null
  training_time_seconds: number | null
  epochs: number | null
  learning_rate: number | null
  batch_size: number | null
}

function computeBestRun(runs: ExperimentRun[]): BestRunData {
  if (!runs || runs.length === 0) {
    return {
      accuracy: null, precision_score: null, recall: null, f1_score: null,
      loss: null, training_time_seconds: null, epochs: null, learning_rate: null, batch_size: null,
    }
  }
  // Best = run with highest accuracy; fall back to latest if no accuracy
  const withAcc = runs.filter(r => r.accuracy !== null)
  const best = withAcc.length > 0
    ? withAcc.reduce((a, b) => (b.accuracy! > a.accuracy! ? b : a))
    : runs[runs.length - 1]
  return {
    accuracy: best.accuracy,
    precision_score: best.precision_score,
    recall: best.recall,
    f1_score: best.f1_score,
    loss: best.loss,
    training_time_seconds: best.training_time_seconds,
    epochs: best.epochs,
    learning_rate: best.learning_rate,
    batch_size: best.batch_size,
  }
}

type RowMetric = {
  label: string
  key: keyof BestRunData
  higherBetter: boolean
  format: (v: number | null) => string
}

const METRICS: RowMetric[] = [
  { label: 'Accuracy', key: 'accuracy', higherBetter: true, format: formatAccuracy },
  { label: 'Precision', key: 'precision_score', higherBetter: true, format: formatAccuracy },
  { label: 'Recall', key: 'recall', higherBetter: true, format: formatAccuracy },
  { label: 'F1 Score', key: 'f1_score', higherBetter: true, format: formatAccuracy },
  { label: 'Loss', key: 'loss', higherBetter: false, format: v => v !== null ? v.toFixed(4) : '—' },
  { label: 'Training Time (s)', key: 'training_time_seconds', higherBetter: false, format: v => v !== null ? v.toFixed(1) : '—' },
  { label: 'Epochs', key: 'epochs', higherBetter: false, format: v => v !== null ? String(v) : '—' },
  { label: 'Learning Rate', key: 'learning_rate', higherBetter: false, format: v => v !== null ? v.toString() : '—' },
  { label: 'Batch Size', key: 'batch_size', higherBetter: false, format: v => v !== null ? String(v) : '—' },
]

function findBestIdx(values: (number | null)[], higherBetter: boolean): number | null {
  const nums = values.map((v, i) => ({ v, i })).filter(x => x.v !== null) as { v: number; i: number }[]
  if (!nums.length) return null
  return higherBetter
    ? nums.reduce((a, b) => (b.v > a.v ? b : a)).i
    : nums.reduce((a, b) => (b.v < a.v ? b : a)).i
}

// ── Multi-select dropdown ─────────────────────────────────────────────────────

interface ExperimentSelectorProps {
  experiments: Experiment[]
  selected: string[]
  onChange: (ids: string[]) => void
}

function ExperimentSelector({ experiments, selected, onChange }: ExperimentSelectorProps) {
  const [open, setOpen] = useState(false)

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id))
    } else if (selected.length < MAX_SELECTED) {
      onChange([...selected, id])
    }
  }

  function remove(id: string) {
    onChange(selected.filter(s => s !== id))
  }

  const selectedExps = experiments.filter(e => selected.includes(e.id))

  return (
    <div className="flex flex-col gap-3">
      {/* Chips */}
      {selectedExps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedExps.map(exp => (
            <span
              key={exp.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-200 text-neutral-950 border border-neutral-950/20"
            >
              {exp.name}
              <button
                onClick={() => remove(exp.id)}
                className="hover:text-neutral-700 transition-colors"
                aria-label={`Remove ${exp.name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          disabled={selected.length >= MAX_SELECTED}
          className={cn(
            'w-full sm:w-72 flex items-center justify-between px-3 py-2 text-sm rounded-lg border bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-pink transition-colors',
            selected.length >= MAX_SELECTED
              ? 'border-neutral-100 text-neutral-400 cursor-not-allowed'
              : 'border-neutral-200 hover:border-neutral-300',
          )}
        >
          <span className="text-neutral-500">
            {selected.length >= MAX_SELECTED ? `Max ${MAX_SELECTED} selected` : 'Select experiments…'}
          </span>
          <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-neutral-100 rounded-lg shadow-lg w-full sm:w-72 max-h-64 overflow-y-auto">
              {experiments.length === 0 ? (
                <p className="text-sm text-neutral-400 px-3 py-3 text-center">No experiments found</p>
              ) : (
                experiments.map(exp => {
                  const isSelected = selected.includes(exp.id)
                  const isDisabled = !isSelected && selected.length >= MAX_SELECTED
                  return (
                    <button
                      key={exp.id}
                      onClick={() => { toggle(exp.id); }}
                      disabled={isDisabled}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors',
                        isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-neutral-50',
                        isSelected && 'bg-neutral-100',
                      )}
                    >
                      <span className={cn(
                        'w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors',
                        isSelected ? 'bg-neutral-950 border-neutral-950 text-white' : 'border-neutral-300',
                      )}>
                        {isSelected && <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5"><path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </span>
                      <span className="truncate text-neutral-800">{exp.name}</span>
                    </button>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Comparison table ──────────────────────────────────────────────────────────

interface CompareTableProps {
  selected: Experiment[]
  bestRuns: BestRunData[]
}

function CompareTable({ selected, bestRuns }: CompareTableProps) {
  // Determine which column has the overall best accuracy
  const accValues = bestRuns.map(r => r.accuracy)
  const bestAccIdx = findBestIdx(accValues, true)

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide min-w-32">
                Metric
              </th>
              {selected.map((exp, i) => (
                <th key={exp.id} className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 min-w-36">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-32">{exp.name}</span>
                    {i === bestAccIdx && (
                      <Badge variant="pink">Best</Badge>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map(metric => {
              const values = bestRuns.map(r => r[metric.key] as number | null)
              const bestIdx = findBestIdx(values, metric.higherBetter)

              return (
                <tr key={metric.key} className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide whitespace-nowrap">
                    {metric.label}
                  </td>
                  {values.map((v, i) => {
                    const isBest = bestIdx === i
                    const cellBg = isBest
                      ? metric.higherBetter
                        ? 'bg-green-50 text-green-700'
                        : metric.key === 'loss'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-blue-50 text-blue-700'
                      : 'text-neutral-700'
                    return (
                      <td key={i} className={cn('px-4 py-3 font-medium', isBest && cellBg)}>
                        {metric.format(v)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Accuracy Bar chart ────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-neutral-100 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-neutral-700 mb-1 max-w-32 truncate">{label}</p>
      <p className="text-neutral-950 font-semibold">{payload[0].value.toFixed(2)}%</p>
    </div>
  )
}

interface AccuracyChartProps {
  selected: Experiment[]
  bestRuns: BestRunData[]
}

function AccuracyChart({ selected, bestRuns }: AccuracyChartProps) {
  const data = selected.map((exp, i) => ({
    name: exp.name,
    accuracy: bestRuns[i].accuracy !== null
      ? Math.round(bestRuns[i].accuracy! * 10000) / 100
      : 0,
    hasData: bestRuns[i].accuracy !== null,
  })).filter(d => d.hasData)

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accuracy Comparison</CardTitle>
        </CardHeader>
        <p className="text-sm text-neutral-400 italic py-4">No accuracy data available for the selected experiments.</p>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accuracy Comparison</CardTitle>
      </CardHeader>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#888' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => v.length > 12 ? v.slice(0, 12) + '…' : v}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#888' }}
            tickLine={false}
            axisLine={false}
            unit="%"
            domain={[0, 100]}
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="accuracy" fill="#0A0A0A" radius={[4, 4, 0, 0]} maxBarSize={60} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const { data: experiments = [], isLoading } = useExperiments()
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const selectedExperiments = useMemo(
    () => experiments.filter(e => selectedIds.includes(e.id)).sort(
      (a, b) => selectedIds.indexOf(a.id) - selectedIds.indexOf(b.id),
    ),
    [experiments, selectedIds],
  )

  const bestRuns = useMemo(
    () => selectedExperiments.map(exp => computeBestRun(exp.runs ?? [])),
    [selectedExperiments],
  )

  return (
    <PageLayout
      title="Compare Experiments"
      description="Select up to 5 experiments to compare their best run metrics side by side."
    >
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="space-y-6">
          {/* ── Selector ── */}
          <Card>
            <p className="text-sm font-medium text-neutral-700 mb-3">
              Select experiments{selectedIds.length > 0 ? ` (${selectedIds.length}/${MAX_SELECTED})` : ''}
            </p>
            <ExperimentSelector
              experiments={experiments}
              selected={selectedIds}
              onChange={setSelectedIds}
            />
          </Card>

          {/* ── Empty state ── */}
          {selectedIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-950 mb-4">
                <BarChart2 size={24} />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 mb-2">No experiments selected</h3>
              <p className="text-sm text-neutral-500 max-w-sm">
                Select two or more experiments from the dropdown above to compare their metrics.
              </p>
            </div>
          ) : (
            <>
              {/* ── Comparison table ── */}
              <CompareTable selected={selectedExperiments} bestRuns={bestRuns} />

              {/* ── Accuracy chart ── */}
              <AccuracyChart selected={selectedExperiments} bestRuns={bestRuns} />
            </>
          )}
        </div>
      )}
    </PageLayout>
  )
}
