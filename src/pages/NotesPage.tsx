import { useState, useMemo } from 'react'
import { Search, Plus, StickyNote, Edit3, Trash2, X, Check } from 'lucide-react'
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../lib/hooks/useNotes'
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
import { formatRelative } from '../lib/utils'
import type { Note } from '../types'

// ── NoteFormModal (create / edit) ─────────────────────────────────────────────

type NoteFormValues = { title: string; content: string; tags: string[] }

function defaultForm(note?: Note | null): NoteFormValues {
  return {
    title: note?.title ?? '',
    content: note?.content ?? '',
    tags: note?.tags ?? [],
  }
}

interface NoteFormModalProps {
  open: boolean
  onClose: () => void
  note?: Note | null
}

function NoteFormModal({ open, onClose, note }: NoteFormModalProps) {
  const { addToast } = useToast()
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()

  const [values, setValues] = useState<NoteFormValues>(() => defaultForm(note))
  const [errors, setErrors] = useState<Partial<Record<keyof NoteFormValues, string>>>({})
  const [loading, setLoading] = useState(false)

  function set<K extends keyof NoteFormValues>(key: K, val: NoteFormValues[K]) {
    setValues(v => ({ ...v, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  function validate(): boolean {
    const errs: typeof errors = {}
    if (!values.title.trim()) errs.title = 'Title is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)
    try {
      const payload = {
        title: values.title.trim(),
        content: values.content.trim() || null,
        tags: values.tags,
      }
      if (note) {
        await updateNote.mutateAsync({ id: note.id, ...payload })
        addToast('Note updated', 'success')
      } else {
        await createNote.mutateAsync(payload)
        addToast('Note created', 'success')
      }
      onClose()
    } catch {
      addToast('Something went wrong', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={note ? 'Edit Note' : 'New Note'} size="lg">
      <div className="flex flex-col gap-4">
        <Input
          label="Title"
          placeholder="Note title"
          value={values.title}
          onChange={e => set('title', e.target.value)}
          error={errors.title}
        />
        <Textarea
          label="Content"
          placeholder="Write your note here…"
          rows={8}
          value={values.content}
          onChange={e => set('content', e.target.value)}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Tags</label>
          <TagInput value={values.tags} onChange={tags => set('tags', tags)} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={loading}>
            {note ? 'Save Changes' : <><Plus size={14} />Create</>}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── NoteViewModal (read + inline edit) ───────────────────────────────────────

interface NoteViewModalProps {
  note: Note
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

function NoteViewModal({ note, onClose, onEdit, onDelete }: NoteViewModalProps) {
  return (
    <Modal open onClose={onClose} title={note.title} size="lg">
      <div className="flex flex-col gap-4">
        {note.content ? (
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{note.content}</p>
        ) : (
          <p className="text-sm text-neutral-400 italic">No content</p>
        )}

        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {note.tags.map(tag => (
              <Badge key={tag} variant="pink">{tag}</Badge>
            ))}
          </div>
        )}

        <p className="text-xs text-neutral-400">{formatRelative(note.updated_at)}</p>

        <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100">
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 size={14} />Delete
          </Button>
          <Button variant="secondary" size="sm" onClick={onEdit}>
            <Edit3 size={14} />Edit
          </Button>
          <Button size="sm" onClick={onClose}>
            <X size={14} />Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── NoteCard ──────────────────────────────────────────────────────────────────

interface NoteCardInlineEditState {
  active: boolean
  title: string
  content: string
}

interface NoteCardProps {
  note: Note
  onView: () => void
  onDelete: () => void
}

function NoteCard({ note, onView, onDelete }: NoteCardProps) {
  const { addToast } = useToast()
  const updateNote = useUpdateNote()
  const [inline, setInline] = useState<NoteCardInlineEditState>({
    active: false,
    title: note.title,
    content: note.content ?? '',
  })

  async function saveInline() {
    if (!inline.title.trim()) return
    try {
      await updateNote.mutateAsync({
        id: note.id,
        title: inline.title.trim(),
        content: inline.content.trim() || null,
      })
      addToast('Note saved', 'success')
      setInline(s => ({ ...s, active: false }))
    } catch {
      addToast('Failed to save note', 'error')
    }
  }

  function cancelInline() {
    setInline({ active: false, title: note.title, content: note.content ?? '' })
  }

  if (inline.active) {
    return (
      <Card className="flex flex-col gap-3">
        <input
          className="w-full text-sm font-semibold text-neutral-900 border-b border-neutral-200 bg-transparent pb-1 focus:outline-none focus:border-neutral-950"
          value={inline.title}
          onChange={e => setInline(s => ({ ...s, title: e.target.value }))}
          placeholder="Title"
          autoFocus
        />
        <textarea
          className="w-full text-sm text-neutral-600 bg-transparent resize-none focus:outline-none min-h-[80px]"
          value={inline.content}
          onChange={e => setInline(s => ({ ...s, content: e.target.value }))}
          placeholder="Write your note…"
          rows={4}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={cancelInline}
            className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
            aria-label="Cancel"
          >
            <X size={14} />
          </button>
          <button
            onClick={saveInline}
            className="p-1.5 rounded hover:bg-green-50 text-neutral-400 hover:text-green-600 transition-colors"
            aria-label="Save"
          >
            <Check size={14} />
          </button>
        </div>
      </Card>
    )
  }

  return (
    <Card
      className="flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onView}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-neutral-900 truncate">{note.title}</p>
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setInline({ active: true, title: note.title, content: note.content ?? '' })}
            className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
            aria-label="Quick edit note"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors"
            aria-label="Delete note"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {note.content && (
        <p className="text-sm text-neutral-500 line-clamp-3">{note.content}</p>
      )}

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.map(tag => (
            <Badge key={tag} variant="pink">{tag}</Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-neutral-400 mt-auto">{formatRelative(note.updated_at)}</p>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Note | null>(null)
  const [viewTarget, setViewTarget] = useState<Note | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null)

  const { data: notes, isLoading } = useNotes()
  const deleteNote = useDeleteNote()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return (notes ?? []).filter(n =>
      n.title.toLowerCase().includes(q) ||
      (n.content ?? '').toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q)),
    )
  }, [notes, search])

  function openCreate() { setEditTarget(null); setFormOpen(true) }

  function openEditFromView(note: Note) {
    setViewTarget(null)
    setEditTarget(note)
    setFormOpen(true)
  }

  function openDeleteFromView(note: Note) {
    setViewTarget(null)
    setDeleteTarget(note)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteNote.mutateAsync(deleteTarget.id)
      addToast('Note deleted', 'success')
    } catch {
      addToast('Failed to delete note', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const headerActions = (
    <Button onClick={openCreate}>
      <Plus size={14} />
      New Note
    </Button>
  )

  return (
    <PageLayout title="Notes" description="Capture thoughts, ideas, and observations." actions={headerActions}>
      {/* Search bar */}
      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search notes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-950 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink focus:border-transparent"
        />
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<StickyNote size={22} />}
          title={search ? 'No notes match your search' : 'No notes yet'}
          description={search ? 'Try a different search term.' : 'Create your first note to capture insights from your experiments.'}
          action={search ? undefined : { label: 'New Note', onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(n => (
            <NoteCard
              key={n.id}
              note={n}
              onView={() => setViewTarget(n)}
              onDelete={() => setDeleteTarget(n)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <NoteFormModal
        key={editTarget?.id ?? 'new'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        note={editTarget}
      />

      {/* View modal */}
      {viewTarget && (
        <NoteViewModal
          note={viewTarget}
          onClose={() => setViewTarget(null)}
          onEdit={() => openEditFromView(viewTarget)}
          onDelete={() => openDeleteFromView(viewTarget)}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Note"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        loading={deleteNote.isPending}
      />
    </PageLayout>
  )
}
