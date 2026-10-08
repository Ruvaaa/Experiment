import { useState } from 'react'
import { Search, Plus, Cpu, Edit3, Trash2 } from 'lucide-react'
import { useModels, useCreateModel, useUpdateModel, useDeleteModel } from '../lib/hooks/useModels'
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
import type { Model } from '../types'

// ── constants ─────────────────────────────────────────────────────────────────

const FRAMEWORK_OPTIONS = [
  { value: 'PyTorch', label: 'PyTorch' },
  { value: 'TensorFlow', label: 'TensorFlow' },
  { value: 'JAX', label: 'JAX' },
  { value: 'sklearn', label: 'scikit-learn' },
  { value: 'XGBoost', label: 'XGBoost' },
  { value: 'LightGBM', label: 'LightGBM' },
  { value: 'Other', label: 'Other' },
]

// ── helpers ───────────────────────────────────────────────────────────────────

function frameworkVariant(fw: string | null): 'default' | 'blue' | 'green' | 'yellow' {
  if (!fw) return 'default'
  if (['PyTorch'].includes(fw)) return 'yellow'
  if (['TensorFlow', 'JAX'].includes(fw)) return 'blue'
  if (['sklearn', 'XGBoost', 'LightGBM'].includes(fw)) return 'green'
  return 'default'
}

// ── form ──────────────────────────────────────────────────────────────────────

type ModelFormValues = {
  name: string
  model_type: string
  framework: string
  customFramework: string
  description: string
  notes: string
  tags: string[]
}

function defaultForm(model?: Model | null): ModelFormValues {
  const isCustom = model?.framework
    ? !FRAMEWORK_OPTIONS.some(o => o.value === model.framework)
    : false
  return {
    name: model?.name ?? '',
    model_type: model?.model_type ?? '',
    framework: isCustom ? '__custom__' : (model?.framework ?? ''),
    customFramework: isCustom ? (model?.framework ?? '') : '',
    description: model?.description ?? '',
    notes: model?.notes ?? '',
    tags: model?.tags ?? [],
  }
}

interface ModelFormModalProps {
  open: boolean
  onClose: () => void
  model?: Model | null
}

function ModelFormModal({ open, onClose, model }: ModelFormModalProps) {
  const { addToast } = useToast()
  const createModel = useCreateModel()
  const updateModel = useUpdateModel()

  const [values, setValues] = useState<ModelFormValues>(() => defaultForm(model))
  const [errors, setErrors] = useState<Partial<Record<keyof ModelFormValues, string>>>({})
  const [loading, setLoading] = useState(false)

  function set<K extends keyof ModelFormValues>(key: K, val: ModelFormValues[K]) {
    setValues(v => ({ ...v, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  function validate(): boolean {
    const errs: typeof errors = {}
    if (!values.name.trim()) errs.name = 'Name is required'
    if (values.framework === '__custom__' && !values.customFramework.trim()) {
      errs.customFramework = 'Please enter a framework name'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)
    try {
      const resolvedFramework =
        values.framework === '__custom__'
          ? values.customFramework.trim() || null
          : values.framework || null

      const payload = {
        name: values.name.trim(),
        model_type: values.model_type.trim() || null,
        framework: resolvedFramework,
        description: values.description.trim() || null,
        notes: values.notes.trim() || null,
        tags: values.tags,
      }

      if (model) {
        await updateModel.mutateAsync({ id: model.id, ...payload })
        addToast('Model updated', 'success')
      } else {
        await createModel.mutateAsync(payload)
        addToast('Model created', 'success')
      }
      onClose()
    } catch {
      addToast('Something went wrong', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={model ? 'Edit Model' : 'New Model'} size="lg">
      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          placeholder="e.g. ResNet-50"
          value={values.name}
          onChange={e => set('name', e.target.value)}
          error={errors.name}
        />
        <Input
          label="Model Type"
          placeholder="e.g. CNN, Transformer, Ensemble"
          value={values.model_type}
          onChange={e => set('model_type', e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Framework</label>
          <select
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-950 focus:outline-none focus:ring-2 focus:ring-pink focus:border-transparent"
            value={values.framework}
            onChange={e => set('framework', e.target.value)}
          >
            <option value="">— none —</option>
            {FRAMEWORK_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
            <option value="__custom__">Custom…</option>
          </select>
          {values.framework === '__custom__' && (
            <Input
              placeholder="Enter framework name"
              value={values.customFramework}
              onChange={e => set('customFramework', e.target.value)}
              error={errors.customFramework}
            />
          )}
        </div>

        <Textarea
          label="Description"
          placeholder="Brief description of the model"
          rows={2}
          value={values.description}
          onChange={e => set('description', e.target.value)}
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
            {model ? 'Save Changes' : <><Plus size={14} />Create</>}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── ModelCard ─────────────────────────────────────────────────────────────────

interface ModelCardProps {
  model: Model
  onEdit: () => void
  onDelete: () => void
}

function ModelCard({ model, onEdit, onDelete }: ModelCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-neutral-900 truncate">{model.name}</p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
            aria-label="Edit model"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors"
            aria-label="Delete model"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {model.framework && (
          <Badge variant={frameworkVariant(model.framework)}>{model.framework}</Badge>
        )}
        {model.model_type && (
          <Badge variant="default">{model.model_type}</Badge>
        )}
      </div>

      {model.description && (
        <p className="text-xs text-neutral-500 line-clamp-2">{model.description}</p>
      )}

      {model.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {model.tags.map(tag => (
            <Badge key={tag} variant="pink">{tag}</Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-neutral-400 mt-auto pt-1">{formatDate(model.created_at)}</p>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ModelsPage() {
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Model | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Model | null>(null)

  const { data: models, isLoading } = useModels()
  const deleteModel = useDeleteModel()

  const filtered = (models ?? []).filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
    m.tags.some(t => t.toLowerCase().includes(search.toLowerCase())),
  )

  function openCreate() { setEditTarget(null); setFormOpen(true) }
  function openEdit(m: Model) { setEditTarget(m); setFormOpen(true) }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteModel.mutateAsync(deleteTarget.id)
      addToast('Model deleted', 'success')
    } catch {
      addToast('Failed to delete model', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const headerActions = (
    <Button onClick={openCreate}>
      <Plus size={14} />
      New Model
    </Button>
  )

  return (
    <PageLayout title="Models" description="Manage your ML models." actions={headerActions}>
      {/* Search bar */}
      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search models…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-950 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink focus:border-transparent"
        />
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Cpu size={22} />}
          title={search ? 'No models match your search' : 'No models yet'}
          description={search ? 'Try a different search term.' : 'Add your first model to start linking it to experiments.'}
          action={search ? undefined : { label: 'New Model', onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(m => (
            <ModelCard
              key={m.id}
              model={m}
              onEdit={() => openEdit(m)}
              onDelete={() => setDeleteTarget(m)}
            />
          ))}
        </div>
      )}

      <ModelFormModal
        key={editTarget?.id ?? 'new'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        model={editTarget}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Model"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        loading={deleteModel.isPending}
      />
    </PageLayout>
  )
}
