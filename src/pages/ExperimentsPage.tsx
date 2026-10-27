import { useState, useMemo } from 'react'
import {
  Search, Plus, LayoutGrid, List, MoreHorizontal,
  Star, Archive, Trash2, Copy, Eye, Edit3, FlaskConical,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  useExperiments,
  useCreateExperiment,
  useUpdateExperiment,
  useDeleteExperiment,
  useToggleFavorite,
} from '../lib/hooks/useExperiments'
import { useModels, useCreateModel } from '../lib/hooks/useModels'
import { useDatasets, useCreateDataset } from '../lib/hooks/useDatasets'
import { useToast } from '../contexts/ToastContext'
import { PageLayout } from '../components/layout/PageLayout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { TagInput } from '../components/ui/TagInput'
import { EmptyState } from '../components/ui/EmptyState'
import { PageSpinner } from '../components/ui/Spinner'
import { cn, formatAccuracy, formatDate, getBestRun } from '../lib/utils'
import type { Experiment, ExperimentFilters, Model, Dataset } from '../types'

// ── helpers ──────────────────────────────────────────────────────────────────

function statusVariant(status: Experiment['status']): 'green' | 'blue' | 'default' {
  if (status === 'active') return 'green'
  if (status === 'completed') return 'blue'
  return 'default'
}

function applySort(experiments: Experiment[], sort: ExperimentFilters['sort']): Experiment[] {
  const list = [...experiments]
  if (sort === 'oldest') return list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  if (sort === 'name') return list.sort((a, b) => a.name.localeCompare(b.name))
  if (sort === 'best_accuracy') {
    return list.sort((a, b) => {
      const ba = getBestRun(a.runs ?? []) ?? -1
      const bb = getBestRun(b.runs ?? []) ?? -1
      return bb - ba
    })
  }
  // newest (default)
  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

// ── CreatableSelect ───────────────────────────────────────────────────────────

interface CreatableSelectProps {
  label: string
  value: string
  onChange: (val: string) => void
  options: { value: string; label: string }[]
  newValue: string
  onNewChange: (val: string) => void
  placeholder?: string
  newPlaceholder?: string
  error?: string
  newError?: string
}

function CreatableSelect({
  label, value, onChange, options, newValue, onNewChange,
  placeholder = '— none —', newPlaceholder = 'Enter name…', error, newError,
}: CreatableSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      <select
        className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-950 focus:outline-none focus:ring-2 focus:ring-pink focus:border-transparent"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        <option value="__new__">+ Create new</option>
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {value === '__new__' && (
        <Input
          placeholder={newPlaceholder}
          value={newValue}
          onChange={e => onNewChange(e.target.value)}
          error={newError}
        />
      )}
    </div>
  )
}

// ── ExperimentFormModal ───────────────────────────────────────────────────────

interface FormValues {
  name: string
  description: string
  model: string
  newModelName: string
  dataset: string
  newDatasetName: string
  status: Experiment['status']
  tags: string[]
  notes: string
}

function defaultForm(exp?: Experiment | null): FormValues {
  return {
    name: exp?.name ?? '',
    description: exp?.description ?? '',
    model: exp?.model_id ?? '',
    newModelName: '',
    dataset: exp?.dataset_id ?? '',
    newDatasetName: '',
    status: exp?.status ?? 'active',
    tags: exp?.tags ?? [],
    notes: exp?.notes ?? '',
  }
}

interface ExperimentFormModalProps {
  open: boolean
  onClose: () => void
  experiment?: Experiment | null
}

function ExperimentFormModal({ open, onClose, experiment }: ExperimentFormModalProps) {
  const { addToast } = useToast()
  const { data: models = [] } = useModels()
  const { data: datasets = [] } = useDatasets()
  const createExperiment = useCreateExperiment()
  const updateExperiment = useUpdateExperiment()
  const createModel = useCreateModel()
  const createDataset = useCreateDataset()

  const [values, setValues] = useState<FormValues>(() => defaultForm(experiment))
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues | 'newModelName' | 'newDatasetName', string>>>({})
  const [loading, setLoading] = useState(false)

  function set<K extends keyof FormValues>(key: K, val: FormValues[K]) {
    setValues(v => ({ ...v, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  function validate() {
    const errs: typeof errors = {}
    if (!values.name.trim()) errs.name = 'Name is required'
    if (values.model === '__new__' && !values.newModelName.trim()) errs.newModelName = 'Model name required'
    if (values.dataset === '__new__' && !values.newDatasetName.trim()) errs.newDatasetName = 'Dataset name required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)
    try {
      let model_id: string | null = !values.model || values.model === '__new__' ? null : values.model
      let dataset_id: string | null = !values.dataset || values.dataset === '__new__' ? null : values.dataset

      if (values.model === '__new__' && values.newModelName.trim()) {
        const m = await createModel.mutateAsync({ name: values.newModelName.trim(), tags: [], model_type: null, framework: null, description: null, notes: null })
        model_id = m.id
      }
      if (values.dataset === '__new__' && values.newDatasetName.trim()) {
        const d = await createDataset.mutateAsync({ name: values.newDatasetName.trim(), tags: [], description: null, task_type: null, num_samples: null, num_classes: null, source: null, notes: null })
        dataset_id = d.id
      }

      const payload = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        model_id,
        dataset_id,
        status: values.status,
        tags: values.tags,
        notes: values.notes.trim() || null,
      }

      if (experiment) {
        await updateExperiment.mutateAsync({ id: experiment.id, ...payload })
        addToast('Experiment updated', 'success')
      } else {
        await createExperiment.mutateAsync({ ...payload, is_favorite: false })
        addToast('Experiment created', 'success')
      }
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong'
      addToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Reset form when experiment changes (opened for edit)
  const title = experiment ? 'Edit Experiment' : 'New Experiment'

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          placeholder="e.g. ResNet50 baseline"
          value={values.name}
          onChange={e => set('name', e.target.value)}
          error={errors.name}
        />
        <Textarea
          label="Description"
          placeholder="What are you trying to achieve?"
          rows={2}
          value={values.description}
          onChange={e => set('description', e.target.value)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CreatableSelect
            label="Model"
            value={values.model}
            onChange={v => set('model', v)}
            options={models.map((m: Model) => ({ value: m.id, label: m.name }))}
            newValue={values.newModelName}
            onNewChange={v => set('newModelName', v)}
            newPlaceholder="New model name"
            error={errors.model}
            newError={errors.newModelName}
          />
          <CreatableSelect
            label="Dataset"
            value={values.dataset}
            onChange={v => set('dataset', v)}
            options={datasets.map((d: Dataset) => ({ value: d.id, label: d.name }))}
            newValue={values.newDatasetName}
            onNewChange={v => set('newDatasetName', v)}
            newPlaceholder="New dataset name"
            error={errors.dataset}
            newError={errors.newDatasetName}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Status</label>
          <select
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-950 focus:outline-none focus:ring-2 focus:ring-pink focus:border-transparent"
            value={values.status}
            onChange={e => set('status', e.target.value as Experiment['status'])}
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Tags</label>
          <TagInput value={values.tags} onChange={tags => set('tags', tags)} />
        </div>
        <Textarea
          label="Notes"
          placeholder="Any notes…"
          rows={3}
          value={values.notes}
          onChange={e => set('notes', e.target.value)}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={loading}>
            {experiment ? 'Save Changes' : <><Plus size={14} />Create</>}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Three-dot menu ────────────────────────────────────────────────────────────

interface CardMenuProps {
  onView: () => void
  onEdit: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
  isArchived: boolean
}

function CardMenu({ onView, onEdit, onDuplicate, onArchive, onDelete, isArchived }: CardMenuProps) {
  const [open, setOpen] = useState(false)

  function action(fn: () => void) {
    setOpen(false)
    fn()
  }

  return (
    <div className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
        aria-label="More options"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-neutral-100 rounded-lg shadow-lg overflow-hidden min-w-[140px]">
            <button onClick={() => action(onView)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
              <Eye size={13} />View
            </button>
            <button onClick={() => action(onEdit)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
              <Edit3 size={13} />Edit
            </button>
            <button onClick={() => action(onDuplicate)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
              <Copy size={13} />Duplicate
            </button>
            <button onClick={() => action(onArchive)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
              <Archive size={13} />{isArchived ? 'Unarchive' : 'Archive'}
            </button>
            <div className="border-t border-neutral-100" />
            <button onClick={() => action(onDelete)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <Trash2 size={13} />Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── ExperimentCard (Grid) ─────────────────────────────────────────────────────

interface ExperimentCardProps {
  experiment: Experiment
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  onArchive: () => void
}

function ExperimentCard({ experiment, onEdit, onDelete, onDuplicate, onArchive }: ExperimentCardProps) {
  const navigate = useNavigate()
  const toggleFavorite = useToggleFavorite()
  const bestAcc = getBestRun(experiment.runs ?? [])

  function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation()
    toggleFavorite.mutate({ id: experiment.id, is_favorite: !experiment.is_favorite })
  }

  return (
    <Card
      className="flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/experiments/${experiment.id}`)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-neutral-900 truncate">{experiment.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={statusVariant(experiment.status)}>{experiment.status}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={handleFavorite} className="p-1 rounded hover:bg-neutral-100 transition-colors" aria-label="Toggle favourite">
            <Star size={14} className={cn(experiment.is_favorite ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-300')} />
          </button>
          <CardMenu
            onView={() => navigate(`/experiments/${experiment.id}`)}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onArchive={onArchive}
            onDelete={onDelete}
            isArchived={experiment.status === 'archived'}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {experiment.model?.name && (
          <p className="text-xs text-neutral-400 truncate">
            <span className="text-neutral-300">Model</span> · {experiment.model.name}
          </p>
        )}
        {experiment.dataset?.name && (
          <p className="text-xs text-neutral-400 truncate">
            <span className="text-neutral-300">Dataset</span> · {experiment.dataset.name}
          </p>
        )}
      </div>

      {bestAcc !== null ? (
        <p className="text-2xl font-bold text-neutral-950">{formatAccuracy(bestAcc)}</p>
      ) : (
        <p className="text-sm text-neutral-300 italic">No accuracy yet</p>
      )}

      <div className="flex items-center justify-between pt-1 mt-auto">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded-full">
            {(experiment.runs ?? []).length} run{(experiment.runs ?? []).length !== 1 ? 's' : ''}
          </span>
          {(experiment.tags ?? []).slice(0, 2).map(tag => (
            <Badge key={tag} variant="pink">{tag}</Badge>
          ))}
          {(experiment.tags ?? []).length > 2 && (
            <span className="text-xs text-neutral-400">+{(experiment.tags ?? []).length - 2}</span>
          )}
        </div>
        <span className="text-xs text-neutral-400">{formatDate(experiment.created_at)}</span>
      </div>
    </Card>
  )
}

// ── List row ──────────────────────────────────────────────────────────────────

interface ExperimentRowProps {
  experiment: Experiment
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  onArchive: () => void
}

function ExperimentRow({ experiment, onEdit, onDelete, onDuplicate, onArchive }: ExperimentRowProps) {
  const navigate = useNavigate()
  const toggleFavorite = useToggleFavorite()
  const bestAcc = getBestRun(experiment.runs ?? [])

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors"
      onClick={() => navigate(`/experiments/${experiment.id}`)}
    >
      <button
        onClick={e => { e.stopPropagation(); toggleFavorite.mutate({ id: experiment.id, is_favorite: !experiment.is_favorite }) }}
        className="p-0.5 flex-shrink-0"
        aria-label="Toggle favourite"
      >
        <Star size={14} className={cn(experiment.is_favorite ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-300')} />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 truncate">{experiment.name}</p>
        <p className="text-xs text-neutral-400 truncate mt-0.5">
          {[experiment.model?.name, experiment.dataset?.name].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        {(experiment.tags ?? []).slice(0, 2).map(tag => (
          <Badge key={tag} variant="pink">{tag}</Badge>
        ))}
      </div>

      <Badge variant={statusVariant(experiment.status)} className="flex-shrink-0">{experiment.status}</Badge>

      <span className="w-20 text-sm font-semibold text-neutral-950 flex-shrink-0 text-right">
        {bestAcc !== null ? formatAccuracy(bestAcc) : '—'}
      </span>

      <span className="hidden md:block w-16 text-xs text-neutral-400 flex-shrink-0 text-right">
        {(experiment.runs ?? []).length} runs
      </span>

      <span className="hidden lg:block w-24 text-xs text-neutral-400 flex-shrink-0 text-right">
        {formatDate(experiment.created_at)}
      </span>

      <div onClick={e => e.stopPropagation()}>
        <CardMenu
          onView={() => navigate(`/experiments/${experiment.id}`)}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onArchive={onArchive}
          onDelete={onDelete}
          isArchived={experiment.status === 'archived'}
        />
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ExperimentsPage() {
  const { addToast } = useToast()

  const [filters, setFilters] = useState<Partial<ExperimentFilters>>({
    search: '',
    model_id: null,
    dataset_id: null,
    tags: [],
    favorites_only: false,
    show_archived: false,
    sort: 'newest',
  })
  const [view, setView] = useState<'grid' | 'list'>('grid')

  // Modal state
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Experiment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Experiment | null>(null)

  const { data: experiments, isLoading } = useExperiments(filters)
  const { data: models = [] } = useModels()
  const { data: datasets = [] } = useDatasets()
  const createExperiment = useCreateExperiment()
  const updateExperiment = useUpdateExperiment()
  const deleteExperiment = useDeleteExperiment()

  const sorted = useMemo(
    () => applySort(experiments ?? [], filters.sort ?? 'newest'),
    [experiments, filters.sort],
  )

  function openCreate() { setEditTarget(null); setFormOpen(true) }
  function openEdit(exp: Experiment) { setEditTarget(exp); setFormOpen(true) }

  async function handleDuplicate(exp: Experiment) {
    try {
      await createExperiment.mutateAsync({
        name: `${exp.name} (copy)`,
        description: exp.description,
        model_id: exp.model_id,
        dataset_id: exp.dataset_id,
        status: 'active',
        is_favorite: false,
        tags: exp.tags,
        notes: exp.notes,
      })
      addToast('Experiment duplicated', 'success')
    } catch {
      addToast('Failed to duplicate', 'error')
    }
  }

  async function handleArchive(exp: Experiment) {
    const newStatus = exp.status === 'archived' ? 'active' : 'archived'
    try {
      await updateExperiment.mutateAsync({ id: exp.id, status: newStatus })
      addToast(newStatus === 'archived' ? 'Experiment archived' : 'Experiment unarchived', 'success')
    } catch {
      addToast('Failed to update experiment', 'error')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteExperiment.mutateAsync(deleteTarget.id)
      addToast('Experiment deleted', 'success')
    } catch {
      addToast('Failed to delete', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  function setFilter<K extends keyof ExperimentFilters>(key: K, val: ExperimentFilters[K]) {
    setFilters(f => ({ ...f, [key]: val }))
  }

  const headerActions = (
    <Button onClick={openCreate}>
      <Plus size={14} />
      New Experiment
    </Button>
  )

  return (
    <PageLayout title="Experiments" description="Manage and track your ML experiments." actions={headerActions}>
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 mb-6 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search experiments…"
            value={filters.search ?? ''}
            onChange={e => setFilter('search', e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-950 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink focus:border-transparent"
          />
        </div>

        {/* Model filter */}
        <select
          value={filters.model_id ?? ''}
          onChange={e => setFilter('model_id', e.target.value || null)}
          className="px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-950 focus:outline-none focus:ring-2 focus:ring-pink focus:border-transparent"
        >
          <option value="">All models</option>
          {models.map((m: Model) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        {/* Dataset filter */}
        <select
          value={filters.dataset_id ?? ''}
          onChange={e => setFilter('dataset_id', e.target.value || null)}
          className="px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-950 focus:outline-none focus:ring-2 focus:ring-pink focus:border-transparent"
        >
          <option value="">All datasets</option>
          {datasets.map((d: Dataset) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        {/* Sort */}
        <select
          value={filters.sort ?? 'newest'}
          onChange={e => setFilter('sort', e.target.value as ExperimentFilters['sort'])}
          className="px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-950 focus:outline-none focus:ring-2 focus:ring-pink focus:border-transparent"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="best_accuracy">Best Accuracy</option>
          <option value="name">Name</option>
        </select>

        {/* Toggle buttons */}
        <button
          onClick={() => setFilter('favorites_only', !filters.favorites_only)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors',
            filters.favorites_only
              ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
              : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50',
          )}
        >
          <Star size={13} />Favorites
        </button>
        <button
          onClick={() => setFilter('show_archived', !filters.show_archived)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors',
            filters.show_archived
              ? 'bg-neutral-100 border-neutral-300 text-neutral-800'
              : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50',
          )}
        >
          <Archive size={13} />Archived
        </button>

        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-neutral-200 overflow-hidden bg-white ml-auto">
          <button
            onClick={() => setView('grid')}
            className={cn('p-2 transition-colors', view === 'grid' ? 'bg-neutral-100 text-neutral-950' : 'text-neutral-400 hover:text-neutral-700')}
            aria-label="Grid view"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setView('list')}
            className={cn('p-2 transition-colors', view === 'list' ? 'bg-neutral-100 text-neutral-950' : 'text-neutral-400 hover:text-neutral-700')}
            aria-label="List view"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <PageSpinner />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<FlaskConical size={22} />}
          title={filters.search || filters.model_id || filters.dataset_id || filters.favorites_only ? 'No experiments match your filters' : 'No experiments yet'}
          description={filters.search || filters.model_id || filters.dataset_id || filters.favorites_only
            ? 'Try adjusting your filters.'
            : 'Create your first experiment to start tracking your ML work.'}
          action={{ label: 'New Experiment', onClick: openCreate }}
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map(exp => (
            <ExperimentCard
              key={exp.id}
              experiment={exp}
              onEdit={() => openEdit(exp)}
              onDelete={() => setDeleteTarget(exp)}
              onDuplicate={() => handleDuplicate(exp)}
              onArchive={() => handleArchive(exp)}
            />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* List header */}
          <div className="flex items-center gap-4 px-4 py-2 border-b border-neutral-100">
            <div className="w-4 flex-shrink-0" />
            <p className="flex-1 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Name</p>
            <p className="hidden sm:block text-xs font-semibold text-neutral-400 uppercase tracking-wide">Tags</p>
            <p className="w-24 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Status</p>
            <p className="w-20 text-xs font-semibold text-neutral-400 uppercase tracking-wide text-right">Accuracy</p>
            <p className="hidden md:block w-16 text-xs font-semibold text-neutral-400 uppercase tracking-wide text-right">Runs</p>
            <p className="hidden lg:block w-24 text-xs font-semibold text-neutral-400 uppercase tracking-wide text-right">Created</p>
            <div className="w-7 flex-shrink-0" />
          </div>
          {sorted.map(exp => (
            <ExperimentRow
              key={exp.id}
              experiment={exp}
              onEdit={() => openEdit(exp)}
              onDelete={() => setDeleteTarget(exp)}
              onDuplicate={() => handleDuplicate(exp)}
              onArchive={() => handleArchive(exp)}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      <ExperimentFormModal
        key={editTarget?.id ?? 'new'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        experiment={editTarget}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Experiment"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        loading={deleteExperiment.isPending}
      />
    </PageLayout>
  )
}
