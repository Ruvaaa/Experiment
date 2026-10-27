import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { Dataset } from '../../types'

export function useDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('datasets').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as Dataset[]
    },
  })
}

export function useCreateDataset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Dataset, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) throw authError ?? new Error('You must be signed in to create a dataset')
      const { data: result, error } = await supabase.from('datasets').insert({ ...data, user_id: authData.user.id }).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['datasets'] }),
  })
}

export function useUpdateDataset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Dataset> & { id: string }) => {
      const { error } = await supabase.from('datasets').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['datasets'] }),
  })
}

export function useDeleteDataset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('datasets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['datasets'] }),
  })
}
