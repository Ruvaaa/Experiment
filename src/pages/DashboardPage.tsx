import { useState } from 'react'
import {
  FlaskConical, Trophy, TrendingUp, Calendar,
  Plus, Flame, Star, ChevronRight,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, BarChart,
  CartesianGrid, XAxis, YAxis, Tooltip, Line, Bar,
} from 'recharts'
import { format } from 'date-fns'
import { useAuth } from '../lib/hooks/useAuth'
import { useDashboardStats, useRecentExperiments } from '../lib/hooks/useDashboard'
import { useAllRuns } from '../lib/hooks/useRuns'
import { useCreateExperiment } from '../lib/hooks/useExperiments'
import { useCreateRun } from '../lib/hooks/useRuns'
import { useModels, useCreateModel } from '../lib/hooks/useModels'
import { useDatasets, useCreateDataset } from '../lib/hooks/useDatasets'
import { PageLayout } from '../components/layout/PageLayout'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Textarea } from '../components/ui/Input'
import { PageSpinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../contexts/ToastContext'
import { getGreeting, formatAccuracy, formatDate } from '../lib/utils'
import type { Experiment } from '../types'
import { useNavigate } from 'react-router-dom'

// ── helpers ──────────────────────────────────────────────────────────────────

function pct(v: number | null): string {
  return formatAccuracy(v)
}

function statusVariant(status: Experiment['status']): 'green' | 'blue' | 'default' {
  if (status === 'active') return 'green'
  if (status === 'completed') return 'blue'
  return 'default'
}

function getBestRuns(runs: ReturnType<typeof useAllRuns>['data']): {
  lineData: { date: string; accuracy: number }[]
  barData: { model: string; accuracy: number }[]
} {
  if (!runs || runs.length === 0) return { lineData: [], barData: [] }

  // Accuracy over time — keep runs that have accuracy
  const lineData = runs
    .filter(r => r.accuracy !== null)
    .map(r => ({
      date: format(new Date(r.created_at), 'MMM d'),
      accuracy: Math.round((r.accuracy as number) * 10000) / 100, // 0-100 scale
    }))

  // Best accuracy per model
  const modelMap = new Map<string, number>()
  for (const run of runs) {
    if (run.accuracy === null) continue
    const modelName: string =
      (run.experiment as { model?: { name?: string } } | null)?.model?.name ?? 'Unknown'
    const prev = modelMap.get(modelName) ?? 0
    if ((run.accuracy as number) > prev) modelMap.set(modelName, run.accuracy as number)
  }
  const barData = Array.from(modelMap.entries()).map(([model, accuracy]) => ({
    model,
    accuracy: Math.round(accuracy * 10000) / 100,
  }))

  return { lineData, barData }
}

function computeStreak(experiments: ReturnType<typeof useRecentExperiments>['data']): number {
  if (!experiments || experiments.length === 0) return 0
  // Very simple streak: count consecutive days going back from today that have activity
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const activeDays = new Set(
    experiments.map(e => {
      const d = new Date(e.created_at)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }),
  )
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (activeDays.has(d.getTime())) streak++
    else if (i > 0) break
  }
  return streak
}

// ── Quick Add Modal ───────────────────────────────────────────────────────────

interface QuickAddFormValues {
  name: string
  model: string
  newModelName: string
  dataset: string
  newDatasetName: string
  accuracy: string
  notes: string
}

function QuickAddModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addToast } = useToast()
  const { data: models = [] } = useModels()
  const { data: datasets = [] } = useDatasets()
  const createExperiment = useCreateExperiment()
  const createRun = useCreateRun()
  const createModel = useCreateModel()
  const createDataset = useCreateDataset()
  const navigate = useNavigate()

  const [values, setValues] = useState<QuickAddFormValues>({
    name: '',
    model: '',
    newModelName: '',
    dataset: '',
    newDatasetName: '',
    accuracy: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof QuickAddFormValues, string>>>({})
  const [loading, setLoading] = useState(false)

  function set(key: keyof QuickAddFormValues, val: string) {
    setValues(v => ({ ...v, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  function validate() {
    const errs: typeof errors = {}
    if (!values.name.trim()) errs.name = 'Name is required'
    if (values.model === '__new__' && !values.newModelName.trim()) errs.newModelName = 'Model name required'
    if (values.dataset === '__new__' && !values.newDatasetName.trim()) errs.newDatasetName = 'Dataset name required'
    if (values.accuracy && isNaN(parseFloat(values.accuracy))) errs.accuracy = 'Must be a number'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)
    try {
      let model_id: string | null = values.model === '' || values.model === '__new__' ? null : values.model
      let dataset_id: string | null = values.dataset === '' || values.dataset === '__new__' ? null : values.dataset

      if (values.model === '__new__' && values.newModelName.trim()) {
        const m = await createModel.mutateAsync({ name: values.newModelName.trim(), tags: [], model_type: null, framework: null, description: null, notes: null })
        model_id = m.id
      }
      if (values.dataset === '__new__' && values.newDatasetName.trim()) {
        const d = await createDataset.mutateAsync({ name: values.newDatasetName.trim(), tags: [], description: null, task_type: null, num_samples: null, num_classes: null, source: null, notes: null })
        dataset_id = d.id
      }

      const exp = await createExperiment.mutateAsync({
        name: values.name.trim(),
        description: null,
        model_id,
        dataset_id,
        status: 'active',
        is_favorite: false,
        tags: [],
        notes: values.notes.trim() || null,
      })

      const acc = values.accuracy.trim() ? parseFloat(values.accuracy) : null
      if (acc !== null) {
        await createRun.mutateAsync({
          experiment_id: exp.id,
          user_id: exp.user_id,
          run_number: 1,
          accuracy: acc > 1 ? acc / 100 : acc,
          precision_score: null,
          recall: null,
          f1_score: null,
          loss: null,
          epochs: null,
          learning_rate: null,
          batch_size: null,
          training_time_seconds: null,
          notes: null,
        })
      }

      addToast('Experiment created!', 'success')
      onClose()
      setValues({ name: '', model: '', newModelName: '', dataset: '', newDatasetName: '', accuracy: '', notes: '' })
      navigate(`/experiments/${exp.id}`)
    } catch (e) {
      addToast('Failed to create experiment', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Experiment" size="md">
      <div className="flex flex-col gap-4">
        <Input label="Experiment name" placeholder="e.g. ResNet50 baseline" value={values.name} onChange={e => set('name', e.target.value)} error={errors.name} />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Model</label>
          <select
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-950 focus:outline-none focus:ring-2 focus:ring-pink focus:border-transparent"
            value={values.model}
            onChange={e => set('model', e.target.value)}
          >
            <option value="">— none —</option>
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            <option value="__new__">+ Create new model</option>
          </select>
          {values.model === '__new__' && (
            <Input placeholder="New model name" value={values.newModelName} onChange={e => set('newModelName', e.target.value)} error={errors.newModelName} />
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Dataset</label>
          <select
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-950 focus:outline-none focus:ring-2 focus:ring-pink focus:border-transparent"
            value={values.dataset}
            onChange={e => set('dataset', e.target.value)}
          >
            <option value="">— none —</option>
            {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            <option value="__new__">+ Create new dataset</option>
          </select>
          {values.dataset === '__new__' && (
            <Input placeholder="New dataset name" value={values.newDatasetName} onChange={e => set('newDatasetName', e.target.value)} error={errors.newDatasetName} />
          )}
        </div>

        <Input label="Accuracy (optional)" placeholder="e.g. 0.95 or 95" value={values.accuracy} onChange={e => set('accuracy', e.target.value)} error={errors.accuracy} hint="Enter as decimal (0–1) or percentage (1–100)" />
        <Textarea label="Notes (optional)" placeholder="Any initial notes…" rows={3} value={values.notes} onChange={e => set('notes', e.target.value)} />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={loading}><Plus size={14} />Create</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  sub?: string
}

function StatCard({ title, value, icon, sub }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-500">{title}</span>
        <div className="w-9 h-9 rounded-lg bg-pink-light flex items-center justify-center text-pink">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold text-neutral-950">{value}</p>
        {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
      </div>
    </Card>
  )
}

// ── Custom Chart Tooltip ──────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-neutral-100 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-neutral-700">{label}</p>
      <p className="text-pink font-semibold">{payload[0].value.toFixed(2)}%</p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: recent, isLoading: recentLoading } = useRecentExperiments()
  const { data: allRuns, isLoading: runsLoading } = useAllRuns()
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const navigate = useNavigate()

  const firstName =
    profile?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there'

  const greeting = `${getGreeting()}, ${firstName}.`
  const streak = computeStreak(recent ?? [])
  const { lineData, barData } = getBestRuns(allRuns)

  // Best experiment (highest accuracy run)
  const bestExperiment = (() => {
    if (!recent) return null
    let best: (typeof recent)[number] | null = null
    let bestAcc = -1
    for (const exp of recent) {
      const rawAccs = (exp.runs ?? []).map((r: { accuracy: number | null }) => r.accuracy) as (number | null)[]
      const accs: number[] = rawAccs.filter((v) => v !== null) as number[]
      const max = accs.length ? Math.max(...accs) : -1
      if (max > bestAcc) { bestAcc = max; best = exp }
    }
    return best && bestAcc >= 0 ? { exp: best, acc: bestAcc } : null
  })()

  // Top models from allRuns
  const topModels = (() => {
    if (!allRuns) return []
    const map = new Map<string, number>()
    for (const run of allRuns) {
      if (run.accuracy === null) continue
      const name = (run.experiment as { model?: { name?: string } } | null)?.model?.name ?? 'Unknown'
      const prev = map.get(name) ?? 0
      if ((run.accuracy as number) > prev) map.set(name, run.accuracy as number)
    }
    return Array.from(map.entries())
      .map(([name, acc]) => ({ name, acc }))
      .sort((a, b) => b.acc - a.acc)
      .slice(0, 5)
  })()

  const isLoading = statsLoading || recentLoading || runsLoading

  const headerActions = (
    <div className="flex items-center gap-3">
      {streak > 0 && (
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 text-xs font-semibold rounded-full">
          <Flame size={12} />
          {streak} day streak
        </span>
      )}
      <Button onClick={() => setQuickAddOpen(true)}>
        <Plus size={14} />
        New Experiment
      </Button>
    </div>
  )

  return (
    <PageLayout
      title={greeting}
      description="Here's what's happening with your experiments."
      actions={headerActions}
    >
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="space-y-8">
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title="Total Experiments"
              value={stats?.totalExperiments ?? 0}
              icon={<FlaskConical size={18} />}
            />
            <StatCard
              title="Best Accuracy"
              value={pct(stats?.bestAccuracy ?? null)}
              icon={<Trophy size={18} />}
              sub="across all runs"
            />
            <StatCard
              title="Average Accuracy"
              value={pct(stats?.avgAccuracy ?? null)}
              icon={<TrendingUp size={18} />}
              sub="across all runs"
            />
            <StatCard
              title="This Week"
              value={stats?.thisWeek ?? 0}
              icon={<Calendar size={18} />}
              sub="new experiments"
            />
          </div>

          {/* ── Charts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Accuracy Over Time</CardTitle>
              </CardHeader>
              {lineData.length === 0 ? (
                <EmptyState
                  title="No run data yet"
                  description="Create an experiment and add runs to see accuracy trends."
                  action={{ label: 'New Experiment', onClick: () => setQuickAddOpen(true) }}
                />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={lineData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="accuracy" stroke="#E879A0" strokeWidth={2} dot={{ r: 3, fill: '#E879A0', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance by Model</CardTitle>
              </CardHeader>
              {barData.length === 0 ? (
                <EmptyState
                  title="No model data yet"
                  description="Associate experiments with models to compare their performance."
                  action={{ label: 'New Experiment', onClick: () => setQuickAddOpen(true) }}
                />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="model" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="accuracy" fill="#E879A0" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* ── Bottom section ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Recent Experiments */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Experiments</CardTitle>
                <button
                  onClick={() => navigate('/experiments')}
                  className="text-xs text-pink font-medium hover:underline flex items-center gap-0.5"
                >
                  View all <ChevronRight size={12} />
                </button>
              </CardHeader>
              {!recent || recent.length === 0 ? (
                <EmptyState
                  title="No experiments yet"
                  description="Start by creating your first experiment."
                  action={{ label: 'New Experiment', onClick: () => setQuickAddOpen(true) }}
                />
              ) : (
                <ul className="divide-y divide-neutral-50">
                  {recent.map(exp => {
                    const rawAccs = (exp.runs ?? []).map((r: { accuracy: number | null }) => r.accuracy) as (number | null)[]
                    const accs: number[] = rawAccs.filter((v) => v !== null) as number[]
                    const best = accs.length ? Math.max(...accs) : null
                    return (
                      <li
                        key={exp.id}
                        className="py-3 flex items-start justify-between gap-2 cursor-pointer hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors"
                        onClick={() => navigate(`/experiments/${exp.id}`)}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">{exp.name}</p>
                          <p className="text-xs text-neutral-400 mt-0.5">{(exp.runs ?? []).length} run{(exp.runs ?? []).length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge variant={statusVariant(exp.status as Experiment['status'])}>{exp.status}</Badge>
                          {best !== null && <span className="text-xs font-semibold text-pink">{pct(best)}</span>}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>

            {/* Top Models */}
            <Card>
              <CardHeader>
                <CardTitle>Top Models</CardTitle>
              </CardHeader>
              {topModels.length === 0 ? (
                <EmptyState
                  title="No model data"
                  description="Link experiments to models to see rankings."
                />
              ) : (
                <ol className="space-y-3">
                  {topModels.map((m, i) => (
                    <li key={m.name} className="flex items-center gap-3">
                      <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-500 text-xs font-bold">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">{m.name}</p>
                        <div className="mt-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-pink"
                            style={{ width: `${m.acc * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-pink flex-shrink-0">{pct(m.acc)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            {/* Best Experiment */}
            <Card>
              <CardHeader>
                <CardTitle>Best Experiment</CardTitle>
              </CardHeader>
              {!bestExperiment ? (
                <EmptyState
                  title="No results yet"
                  description="Add accuracy scores to your runs to highlight the best experiment."
                  action={{ label: 'New Experiment', onClick: () => setQuickAddOpen(true) }}
                />
              ) : (
                <div
                  className="cursor-pointer"
                  onClick={() => navigate(`/experiments/${bestExperiment.exp.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-pink-light flex items-center justify-center">
                        <Trophy size={16} className="text-pink" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900 leading-tight">
                          {bestExperiment.exp.name}
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {formatDate(bestExperiment.exp.created_at)}
                        </p>
                      </div>
                    </div>
                    {bestExperiment.exp.is_favorite && <Star size={14} className="text-yellow-400 fill-yellow-400 flex-shrink-0 mt-0.5" />}
                  </div>

                  <div className="bg-gradient-to-br from-pink-light to-white rounded-xl p-4 text-center mt-4">
                    <p className="text-3xl font-bold text-pink">{pct(bestExperiment.acc)}</p>
                    <p className="text-xs text-neutral-400 mt-1">best accuracy</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant={statusVariant(bestExperiment.exp.status as Experiment['status'])}>
                      {bestExperiment.exp.status}
                    </Badge>
                    {(bestExperiment.exp as { model?: { name?: string } }).model?.name && (
                      <Badge variant="default">{(bestExperiment.exp as { model?: { name?: string } }).model!.name}</Badge>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </PageLayout>
  )
}
