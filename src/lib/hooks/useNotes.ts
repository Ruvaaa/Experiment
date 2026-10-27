import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { Note } from '../../types'

export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notes').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as Note[]
    },
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) throw authError ?? new Error('You must be signed in to create a note')
      const { data: result, error } = await supabase.from('notes').insert({ ...data, user_id: authData.user.id }).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Note> & { id: string }) => {
      const { error } = await supabase.from('notes').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}
