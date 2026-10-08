import { useState } from 'react'
import { Search, Plus, Database, Edit3, Trash2 } from 'lucide-react'
import { useDatasets, useCreateDataset, useUpdateDataset, useDeleteDataset } from '../lib/hooks/useDatasets'
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
import { formatDate } from '../lib/utils'
import type { Dataset } from '../types'

// ── constants ─────────────────────────────────────────────────────────────────

const TASK_TYPE_OPTIONS = [
  { value: 'classification', label: 'Classification' },
  { value: 'regression', label: 'Regression' },
  { value: 'object_detection', label: 'Object Detection' },
  { value: 'segmentation', label: 'Segmentation' },
  { value: 'nlp', label: 'NLP' },
  { value: 'other', label: 'Other' },
]

// ── helpers ───────────────────────────────────────────────────────────────────

function formatSamples(n: number | null): string {
  if (n === null) return ''
  return `${n.toLocaleString()} samples`
}

function taskTypeLabel(value: string | null): string {
  if (!value) return ''
  return TASK_TYPE_OPTIONS.find(o => o.value === value)?.label ?? value
}

// ── form ──────────────────────────────────────────────────────────────────────

type DatasetFormValues = {
  name: string
  description: string
  task_type: string
  customTaskType: string
  num_samples: string
  num_classes: string
  source: string
  notes: string
  tags: string[]
}

function defaultForm(dataset?: Dataset | null): DatasetFormValues {
  const isCustom = dataset?.task_type
    ? !TASK_TYPE_OPTIONS.some(o => o.value === dataset.task_type)
    : false
  return {
    name: dataset?.name ?? '',
    description: dataset?.description ?? '',
    task_type: isCustom ? '__custom__' : (dataset?.task_type ?? ''),
    customTaskType: isCustom ? (dataset?.task_type ?? '') : '',
    num_samples: dataset?.num_samples != null ? String(dataset.num_samples) : '',
    num_classes: dataset?.num_classes != null ? String(dataset.num_classes) : '',
    source: dataset?.source ?? '',
    notes: dataset?.notes ?? '',
    tags: dataset?.tags ?? [],
  }
}

interface DatasetFormModalProps {
  open: boolean
  onClose: () => void
  dataset?: Dataset | null
}

function DatasetFormModal({ open, onClose, dataset }: DatasetFormModalProps) {
  const { addToast } = useToast()
  const createDataset = useCreateDataset()
  const updateDataset = useUpdateDataset()

  const [values, setValues] = useState<DatasetFormValues>(() => defaultForm(dataset))
  const [errors, setErrors] = useState<Partial<Record<keyof DatasetFormValues, string>>>({})
  const [loading, setLoading] = useState(false)

  function set<K extends keyof DatasetFormValues>(key: K, val: DatasetFormValues[K]) {
    setValues(v => ({ ...v, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  function validate(): boolean {
    const errs: typeof errors = {}
    if (!values.name.trim()) errs.name = 'Name is required'
    if (values.task_type === '__custom__' && !values.customTaskType.trim()) {
      errs.customTaskType = 'Please enter a task type'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)
    try {
      const resolvedTaskType =
        values.task_type === '__custom__'
          ? values.customTaskType.trim() || null
          : values.task_type || null

      const payload = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        task_type: resolvedTaskType,
        num_samples: values.num_samples !== '' ? Number(values.num_samples) : null,
        num_classes: values.num_classes !== '' ? Number(values.num_classes) : null,
        source: values.source.trim() || null,
        notes: values.notes.trim() || null,
        tags: values.tags,
      }

      if (dataset) {
        await updateDataset.mutateAsync({ id: dataset.id, ...payload })
        addToast('Dataset updated', 'success')
      } else {
        await createDataset.mutateAsync(payload)
        addToast('Dataset created', 'success')
      }
      onClose()
    } catch {
      addToast('Something went wrong', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={dataset ? 'Edit Dataset' : 'New Dataset'} size="lg">
      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          placeholder="e.g. ImageNet 2012"
          value={values.name}
          onChange={e => set('name', e.target.value)}
          error={errors.name}
        />
        <Textarea
          label="Description"
          placeholder="Brief description of the dataset"
          rows={2}
          value={values.description}
          onChange={e => set('description', e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Task Type</label>
          <select
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-950 focus:outline-none focus:ring-2 focus:ring-pink focus:border-transparent"
            value={values.task_type}
            onChange={e => set('task_type', e.target.value)}
          >
            <option value="">— none —</option>
            {TASK_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
            <option value="__custom__">Custom…</option>
          </select>
          {values.task_type === '__custom__' && (
            <Input
              placeholder="Enter task type"
              value={values.customTaskType}
              onChange={e => set('customTaskType', e.target.value)}
              error={errors.customTaskType}
            />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Number of Samples"
            type="number"
            min={0}
            placeholder="e.g. 12400"
            value={values.num_samples}
            onChange={e => set('num_samples', e.target.value)}
          />
          <Input
            label="Number of Classes"
            type="number"
            min={0}
            placeholder="e.g. 10"
            value={values.num_classes}
            onChange={e => set('num_classes', e.target.value)}
          />
        </div>

        <Input
          label="Source"
          placeholder="e.g. Kaggle, HuggingFace, internal"
          value={values.source}
          onChange={e => set('source', e.target.value)}
        />

        <Textarea
          label="Notes"
          placeholder="Any additional notes…"
          rows={2}
          value={values.notes}
          onChange={e => set('notes', e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Tags</label>
          <TagInput value={values.tags} onChange={tags => set('tags', tags)} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={loading}>
            {dataset ? 'Save Changes' : <><Plus size={14} />Create</>}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── DatasetCard ───────────────────────────────────────────────────────────────

interface DatasetCardProps {
  dataset: Dataset
  onEdit: () => void
  onDelete: () => void
}

function DatasetCard({ dataset, onEdit, onDelete }: DatasetCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-neutral-900 truncate">{dataset.name}</p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
            aria-label="Edit dataset"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors"
            aria-label="Delete dataset"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {dataset.task_type && (
          <Badge variant="blue">{taskTypeLabel(dataset.task_type)}</Badge>
        )}
      </div>

      <div className="flex flex-col gap-1 text-sm text-neutral-500">
        {dataset.num_samples != null && (
          <span>{formatSamples(dataset.num_samples)}</span>
        )}
        {dataset.num_classes != null && (
          <span>{dataset.num_classes} classes</span>
        )}
        {dataset.source && (
          <span className="truncate">Source: {dataset.source}</span>
        )}
      </div>

      {dataset.description && (
        <p className="text-xs text-neutral-500 line-clamp-2">{dataset.description}</p>
      )}

      {dataset.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {dataset.tags.map(tag => (
            <Badge key={tag} variant="pink">{tag}</Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-neutral-400 mt-auto pt-1">{formatDate(dataset.created_at)}</p>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DatasetsPage() {
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Dataset | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Dataset | null>(null)

  const { data: datasets, isLoading } = useDatasets()
  const deleteDataset = useDeleteDataset()

  const filtered = (datasets ?? []).filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
    d.tags.some(t => t.toLowerCase().includes(search.toLowerCase())),
  )

  function openCreate() { setEditTarget(null); setFormOpen(true) }
  function openEdit(d: Dataset) { setEditTarget(d); setFormOpen(true) }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteDataset.mutateAsync(deleteTarget.id)
      addToast('Dataset deleted', 'success')
    } catch {
      addToast('Failed to delete dataset', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const headerActions = (
    <Button onClick={openCreate}>
      <Plus size={14} />
      New Dataset
    </Button>
  )

  return (
    <PageLayout title="Datasets" description="Manage your training datasets." actions={headerActions}>
      {/* Search bar */}
      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search datasets…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-950 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink focus:border-transparent"
        />
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Database size={22} />}
          title={search ? 'No datasets match your search' : 'No datasets yet'}
          description={search ? 'Try a different search term.' : 'Add your first dataset to start linking it to experiments.'}
          action={search ? undefined : { label: 'New Dataset', onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(d => (
            <DatasetCard
              key={d.id}
              dataset={d}
              onEdit={() => openEdit(d)}
              onDelete={() => setDeleteTarget(d)}
            />
          ))}
        </div>
      )}

      <DatasetFormModal
        key={editTarget?.id ?? 'new'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        dataset={editTarget}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Dataset"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        loading={deleteDataset.isPending}
      />
    </PageLayout>
  )
}
