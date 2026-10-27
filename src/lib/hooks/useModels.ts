import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { Model } from '../../types'

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const { data, error } = await supabase.from('models').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as Model[]
    },
  })
}

export function useCreateModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Model, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) throw authError ?? new Error('You must be signed in to create a model')
      const { data: result, error } = await supabase.from('models').insert({ ...data, user_id: authData.user.id }).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['models'] }),
  })
}

export function useUpdateModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Model> & { id: string }) => {
      const { error } = await supabase.from('models').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['models'] }),
  })
}

export function useDeleteModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('models').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['models'] }),
  })
}
