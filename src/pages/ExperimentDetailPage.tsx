import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ChevronRight, Star, Edit3, Copy, Trash2, Plus,
  FlaskConical, Pencil, Check, X,
} from 'lucide-react'
import { format } from 'date-fns'
import { useExperiment, useUpdateExperiment, useDeleteExperiment, useToggleFavorite, useCreateExperiment } from '../lib/hooks/useExperiments'
import { useRuns, useCreateRun, useDeleteRun } from '../lib/hooks/useRuns'
import { useToast } from '../contexts/ToastContext'
import { PageLayout } from '../components/layout/PageLayout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PageSpinner } from '../components/ui/Spinner'
import { cn, formatAccuracy, formatDate } from '../lib/utils'
import type { Experiment, ExperimentRun } from '../types'

// ── Zod schema for Add Run form ───────────────────────────────────────────────

const runSchema = z.object({
  accuracy: z.union([z.literal(''), z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0 && parseFloat(v) <= 1, 'Must be 0–1')]),
  precision_score: z.union([z.literal(''), z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0 && parseFloat(v) <= 1, 'Must be 0–1')]),
  recall: z.union([z.literal(''), z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0 && parseFloat(v) <= 1, 'Must be 0–1')]),
  f1_score: z.union([z.literal(''), z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0 && parseFloat(v) <= 1, 'Must be 0–1')]),
  loss: z.union([z.literal(''), z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Must be ≥ 0')]),
  epochs: z.union([z.literal(''), z.string().refine(v => !isNaN(parseInt(v)) && parseInt(v) > 0, 'Must be a positive integer')]),
  learning_rate: z.union([z.literal(''), z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Must be > 0')]),
  batch_size: z.union([z.literal(''), z.string().refine(v => !isNaN(parseInt(v)) && parseInt(v) > 0, 'Must be a positive integer')]),
  training_time_seconds: z.union([z.literal(''), z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Must be ≥ 0')]),
  notes: z.string(),
})

type RunFormValues = z.infer<typeof runSchema>

// ── helpers ───────────────────────────────────────────────────────────────────

function statusVariant(status: Experiment['status']): 'green' | 'blue' | 'default' {
  if (status === 'active') return 'green'
  if (status === 'completed') return 'blue'
  return 'default'
}

function parseOptionalFloat(v: string): number | null {
  if (!v.trim()) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function parseOptionalInt(v: string): number | null {
  if (!v.trim()) return null
  const n = parseInt(v, 10)
  return isNaN(n) ? null : n
}

function findBestRun(runs: ExperimentRun[]): ExperimentRun | null {
  const withAcc = runs.filter(r => r.accuracy !== null)
  if (!withAcc.length) return null
  return withAcc.reduce((best, r) => (r.accuracy! > best.accuracy! ? r : best))
}

function findPrevBestAccuracy(runs: ExperimentRun[], excludeId: string): number | null {
  const withAcc = runs.filter(r => r.accuracy !== null && r.id !== excludeId)
  if (!withAcc.length) return null
  return Math.max(...withAcc.map(r => r.accuracy!))
}

// ── Add Run Modal ─────────────────────────────────────────────────────────────

interface AddRunModalProps {
  open: boolean
  onClose: () => void
  experimentId: string
  userId: string
  nextRunNumber: number
  currentBestAccuracy: number | null
}

function AddRunModal({ open, onClose, experimentId, userId, nextRunNumber, currentBestAccuracy }: AddRunModalProps) {
  const { addToast } = useToast()
  const createRun = useCreateRun()

  const { register, handleSubmit, formState: { errors }, reset } = useForm<RunFormValues>({
    resolver: zodResolver(runSchema),
    defaultValues: {
      accuracy: '', precision_score: '', recall: '', f1_score: '',
      loss: '', epochs: '', learning_rate: '', batch_size: '',
      training_time_seconds: '', notes: '',
    },
  })

  function handleClose() {
    reset()
    onClose()
  }

  async function onSubmit(values: RunFormValues) {
    const newAcc = parseOptionalFloat(values.accuracy as string)
    try {
      await createRun.mutateAsync({
        experiment_id: experimentId,
        user_id: userId,
        run_number: nextRunNumber,
        accuracy: newAcc,
        precision_score: parseOptionalFloat(values.precision_score as string),
        recall: parseOptionalFloat(values.recall as string),
        f1_score: parseOptionalFloat(values.f1_score as string),
        loss: parseOptionalFloat(values.loss as string),
        epochs: parseOptionalInt(values.epochs as string),
        learning_rate: parseOptionalFloat(values.learning_rate as string),
        batch_size: parseOptionalInt(values.batch_size as string),
        training_time_seconds: parseOptionalFloat(values.training_time_seconds as string),
        notes: values.notes.trim() || null,
      })
      if (newAcc !== null && currentBestAccuracy !== null && newAcc > currentBestAccuracy) {
        const improvement = ((newAcc - currentBestAccuracy) * 100).toFixed(1)
        addToast(`🎉 New best! +${improvement}% improvement`, 'success')
      } else if (newAcc !== null && currentBestAccuracy === null) {
        addToast('Run added successfully', 'success')
      } else {
        addToast('Run added successfully', 'success')
      }
      handleClose()
    } catch {
      addToast('Failed to add run', 'error')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Run" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Accuracy (0–1)"
            placeholder="e.g. 0.95"
            error={errors.accuracy?.message}
            {...register('accuracy')}
          />
          <Input
            label="Precision (0–1)"
            placeholder="e.g. 0.94"
            error={errors.precision_score?.message}
            {...register('precision_score')}
          />
          <Input
            label="Recall (0–1)"
            placeholder="e.g. 0.96"
            error={errors.recall?.message}
            {...register('recall')}
          />
          <Input
            label="F1 Score (0–1)"
            placeholder="e.g. 0.95"
            error={errors.f1_score?.message}
            {...register('f1_score')}
          />
          <Input
            label="Loss"
            placeholder="e.g. 0.12"
            error={errors.loss?.message}
            {...register('loss')}
          />
          <Input
            label="Epochs"
            placeholder="e.g. 100"
            error={errors.epochs?.message}
            {...register('epochs')}
          />
          <Input
            label="Learning Rate"
            placeholder="e.g. 0.001"
            error={errors.learning_rate?.message}
            {...register('learning_rate')}
          />
          <Input
            label="Batch Size"
            placeholder="e.g. 32"
            error={errors.batch_size?.message}
            {...register('batch_size')}
          />
          <Input
            label="Training Time (seconds)"
            placeholder="e.g. 3600"
            error={errors.training_time_seconds?.message}
            {...register('training_time_seconds')}
            className="col-span-2"
          />
        </div>
        <Textarea
          label="Notes (optional)"
          placeholder="Any notes about this run…"
          rows={2}
          {...register('notes')}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={createRun.isPending}>
            <Plus size={14} />Add Run
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Notes section ─────────────────────────────────────────────────────────────

interface NotesSectionProps {
  notes: string | null
  onSave: (notes: string) => Promise<void>
}

function NotesSection({ notes, onSave }: NotesSectionProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(notes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(value)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setValue(notes ?? '')
    setEditing(false)
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Notes</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
            aria-label="Edit notes"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex flex-col gap-3">
          <textarea
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-950 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink focus:border-transparent resize-vertical min-h-[100px]"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Add notes about this experiment…"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 transition-colors"
              aria-label="Cancel editing"
            >
              <X size={16} />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors disabled:opacity-50"
              aria-label="Save notes"
            >
              {saving ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Check size={16} />}
            </button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'rounded-lg p-4 text-sm',
            notes
              ? 'bg-neutral-50 text-neutral-700 whitespace-pre-wrap'
              : 'bg-neutral-50 text-neutral-400 italic cursor-pointer hover:bg-neutral-100 transition-colors',
          )}
          onClick={() => !notes && setEditing(true)}
        >
          {notes ?? 'No notes yet. Click to add notes.'}
        </div>
      )}
    </Card>
  )
}

// ── Runs table ────────────────────────────────────────────────────────────────

interface RunsTableProps {
  runs: ExperimentRun[]
  onDelete: (run: ExperimentRun) => void
  onAddRun: () => void
}

function RunsTable({ runs, onDelete, onAddRun }: RunsTableProps) {
  const bestRun = findBestRun(runs)

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-neutral-900">Runs</h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
            {runs.length}
          </span>
        </div>
        <Button size="sm" onClick={onAddRun}>
          <Plus size={13} />Add Run
        </Button>
      </div>

      {runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <div className="w-10 h-10 rounded-full bg-pink-light flex items-center justify-center text-pink mb-3">
            <FlaskConical size={18} />
          </div>
          <p className="text-sm font-medium text-neutral-700 mb-1">No runs yet</p>
          <p className="text-xs text-neutral-400 mb-4">Add your first run to start tracking metrics.</p>
          <Button size="sm" onClick={onAddRun}><Plus size={13} />Add Run</Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                {['#', 'Accuracy', 'Precision', 'Recall', 'F1', 'Loss', 'Epochs', 'LR', 'Batch', 'Time (s)', 'Date', ''].map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map(run => {
                const isBest = bestRun?.id === run.id
                const prevBest = isBest ? findPrevBestAccuracy(runs, run.id) : null
                const improvement = isBest && run.accuracy !== null && prevBest !== null
                  ? ((run.accuracy - prevBest) * 100).toFixed(1)
                  : null

                return (
                  <tr
                    key={run.id}
                    className={cn(
                      'border-b border-neutral-50 hover:bg-neutral-50 transition-colors',
                      isBest && 'bg-pink-light/30',
                    )}
                  >
                    <td className="px-4 py-3 text-neutral-500 font-mono text-xs">{run.run_number}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-nowrap">
                        <span className={cn('font-semibold', isBest ? 'text-pink' : 'text-neutral-900')}>
                          {formatAccuracy(run.accuracy)}
                        </span>
                        {isBest && (
                          <Badge variant="pink" className="flex-shrink-0">Best</Badge>
                        )}
                        {improvement && (
                          <span className="text-green-600 text-xs font-medium flex-shrink-0">+{improvement}%</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{formatAccuracy(run.precision_score)}</td>
                    <td className="px-4 py-3 text-neutral-700">{formatAccuracy(run.recall)}</td>
                    <td className="px-4 py-3 text-neutral-700">{formatAccuracy(run.f1_score)}</td>
                    <td className="px-4 py-3 text-neutral-700">{run.loss !== null ? run.loss.toFixed(4) : '—'}</td>
                    <td className="px-4 py-3 text-neutral-700">{run.epochs ?? '—'}</td>
                    <td className="px-4 py-3 text-neutral-700 font-mono text-xs">{run.learning_rate ?? '—'}</td>
                    <td className="px-4 py-3 text-neutral-700">{run.batch_size ?? '—'}</td>
                    <td className="px-4 py-3 text-neutral-700">{run.training_time_seconds ?? '—'}</td>
                    <td className="px-4 py-3 text-neutral-400 text-xs whitespace-nowrap">
                      {format(new Date(run.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onDelete(run)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-300 hover:text-red-500 transition-colors"
                        aria-label="Delete run"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const { data: experiment, isLoading, error } = useExperiment(id ?? '')
  const { data: runs = [], isLoading: runsLoading } = useRuns(id ?? '')
  const updateExperiment = useUpdateExperiment()
  const deleteExperiment = useDeleteExperiment()
  const toggleFavorite = useToggleFavorite()
  const createExperiment = useCreateExperiment()
  const deleteRun = useDeleteRun()

  const [addRunOpen, setAddRunOpen] = useState(false)
  const [deleteExperimentOpen, setDeleteExperimentOpen] = useState(false)
  const [deleteRunTarget, setDeleteRunTarget] = useState<ExperimentRun | null>(null)

  const currentBestAccuracy = runs.length > 0
    ? Math.max(...runs.map(r => r.accuracy ?? -Infinity).filter(v => v !== -Infinity))
    : null
  const effectiveBest = currentBestAccuracy === -Infinity ? null : currentBestAccuracy

  async function handleSaveNotes(notes: string) {
    try {
      await updateExperiment.mutateAsync({ id: id!, notes: notes.trim() || null })
      addToast('Notes saved', 'success')
    } catch {
      addToast('Failed to save notes', 'error')
    }
  }

  async function handleDeleteExperiment() {
    try {
      await deleteExperiment.mutateAsync(id!)
      addToast('Experiment deleted', 'success')
      navigate('/experiments')
    } catch {
      addToast('Failed to delete experiment', 'error')
    }
  }

  async function handleDuplicate() {
    if (!experiment) return
    try {
      const dup = await createExperiment.mutateAsync({
        name: `${experiment.name} (copy)`,
        description: experiment.description,
        model_id: experiment.model_id,
        dataset_id: experiment.dataset_id,
        status: 'active',
        is_favorite: false,
        tags: experiment.tags,
        notes: experiment.notes,
      })
      addToast('Experiment duplicated', 'success')
      navigate(`/experiments/${dup.id}`)
    } catch {
      addToast('Failed to duplicate', 'error')
    }
  }

  async function handleDeleteRun() {
    if (!deleteRunTarget) return
    try {
      await deleteRun.mutateAsync({ id: deleteRunTarget.id, experimentId: id! })
      addToast('Run deleted', 'success')
    } catch {
      addToast('Failed to delete run', 'error')
    } finally {
      setDeleteRunTarget(null)
    }
  }

  // 404 state
  if (!isLoading && (error || !experiment)) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-pink-light flex items-center justify-center text-pink mb-4">
            <FlaskConical size={28} />
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">Experiment not found</h2>
          <p className="text-sm text-neutral-500 mb-6">The experiment you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/experiments')}>Back to Experiments</Button>
        </div>
      </PageLayout>
    )
  }

  if (isLoading || runsLoading) return <PageLayout><PageSpinner /></PageLayout>

  const exp = experiment!

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-1.5 text-sm text-neutral-400">
          <Link to="/experiments" className="hover:text-neutral-700 transition-colors">Experiments</Link>
          <ChevronRight size={14} />
          <span className="text-neutral-700 font-medium truncate max-w-xs">{exp.name}</span>
        </nav>

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-neutral-950">{exp.name}</h1>
              <Badge variant={statusVariant(exp.status)}>{exp.status}</Badge>
            </div>
            <p className="text-sm text-neutral-400 mt-1">Created {formatDate(exp.created_at)}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Favorite */}
            <button
              onClick={() => toggleFavorite.mutate({ id: exp.id, is_favorite: !exp.is_favorite })}
              className={cn(
                'p-2 rounded-lg border transition-colors',
                exp.is_favorite
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-500'
                  : 'bg-white border-neutral-200 text-neutral-400 hover:text-yellow-500',
              )}
              aria-label="Toggle favorite"
            >
              <Star size={16} className={cn(exp.is_favorite && 'fill-yellow-400')} />
            </button>

            {/* Edit */}
            <Link to={`/experiments`} state={{ editId: exp.id }}>
              <button
                className="p-2 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
                aria-label="Edit experiment"
              >
                <Edit3 size={16} />
              </button>
            </Link>

            {/* Duplicate */}
            <button
              onClick={handleDuplicate}
              className="p-2 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
              aria-label="Duplicate experiment"
            >
              <Copy size={16} />
            </button>

            {/* Delete */}
            <button
              onClick={() => setDeleteExperimentOpen(true)}
              className="p-2 rounded-lg border border-neutral-200 bg-white text-neutral-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
              aria-label="Delete experiment"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* ── Info grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Model</p>
                {exp.model ? (
                  <Link
                    to="/models"
                    className="text-pink hover:underline font-medium"
                  >
                    {exp.model.name}
                  </Link>
                ) : (
                  <span className="text-neutral-400 italic">None</span>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Dataset</p>
                {exp.dataset ? (
                  <Link
                    to="/datasets"
                    className="text-pink hover:underline font-medium"
                  >
                    {exp.dataset.name}
                  </Link>
                ) : (
                  <span className="text-neutral-400 italic">None</span>
                )}
              </div>
            </div>
            {exp.description && (
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-neutral-700">{exp.description}</p>
              </div>
            )}
            {exp.tags && exp.tags.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {exp.tags.map(tag => (
                    <Badge key={tag} variant="pink">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Stats summary */}
          <Card>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">Best Run</p>
            {effectiveBest !== null ? (
              <div className="space-y-3">
                <p className="text-3xl font-bold text-pink">{formatAccuracy(effectiveBest)}</p>
                <p className="text-xs text-neutral-400">
                  {runs.length} run{runs.length !== 1 ? 's' : ''} total
                </p>
              </div>
            ) : (
              <p className="text-sm text-neutral-400 italic">No accuracy recorded yet</p>
            )}
          </Card>
        </div>

        {/* ── Notes ── */}
        <NotesSection notes={exp.notes} onSave={handleSaveNotes} />

        {/* ── Runs ── */}
        <RunsTable
          runs={runs}
          onDelete={setDeleteRunTarget}
          onAddRun={() => setAddRunOpen(true)}
        />
      </div>

      {/* ── Modals ── */}
      <AddRunModal
        open={addRunOpen}
        onClose={() => setAddRunOpen(false)}
        experimentId={exp.id}
        userId={exp.user_id}
        nextRunNumber={(runs.length > 0 ? Math.max(...runs.map(r => r.run_number)) : 0) + 1}
        currentBestAccuracy={effectiveBest}
      />

      <ConfirmDialog
        open={deleteExperimentOpen}
        onClose={() => setDeleteExperimentOpen(false)}
        onConfirm={handleDeleteExperiment}
        title="Delete Experiment"
        description={`Are you sure you want to delete "${exp.name}"? This will also delete all associated runs. This cannot be undone.`}
        loading={deleteExperiment.isPending}
      />

      <ConfirmDialog
        open={!!deleteRunTarget}
        onClose={() => setDeleteRunTarget(null)}
        onConfirm={handleDeleteRun}
        title="Delete Run"
        description={`Delete run #${deleteRunTarget?.run_number}? This cannot be undone.`}
        loading={deleteRun.isPending}
      />
    </PageLayout>
  )
}
