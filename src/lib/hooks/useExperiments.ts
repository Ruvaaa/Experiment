import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { Experiment, ExperimentFilters } from '../../types'

export function useExperiments(filters?: Partial<ExperimentFilters>) {
  return useQuery({
    queryKey: ['experiments', filters],
    queryFn: async () => {
      let query = supabase
        .from('experiments')
        .select('*, model:models(id,name,framework), dataset:datasets(id,name), runs:experiment_runs(id,accuracy,run_number,created_at)')
        .order('created_at', { ascending: false })

      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }
      if (filters?.model_id) query = query.eq('model_id', filters.model_id)
      if (filters?.dataset_id) query = query.eq('dataset_id', filters.dataset_id)
      if (filters?.favorites_only) query = query.eq('is_favorite', true)
      if (!filters?.show_archived) query = query.neq('status', 'archived')

      const { data, error } = await query
      if (error) throw error
      return data as Experiment[]
    },
  })
}

export function useExperiment(id: string) {
  return useQuery({
    queryKey: ['experiment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('experiments')
        .select('*, model:models(*), dataset:datasets(*), runs:experiment_runs(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Experiment
    },
    enabled: !!id,
  })
}

export function useCreateExperiment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Experiment, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'model' | 'dataset' | 'runs'>) => {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) throw authError ?? new Error('You must be signed in to create an experiment')
      const { data: result, error } = await supabase.from('experiments').insert({ ...data, user_id: authData.user.id }).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['experiments'] }),
  })
}

export function useUpdateExperiment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Experiment> & { id: string }) => {
      const { error } = await supabase.from('experiments').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['experiments'] })
      qc.invalidateQueries({ queryKey: ['experiment', vars.id] })
    },
  })
}

export function useDeleteExperiment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('experiments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['experiments'] }),
  })
}

export function useToggleFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase.from('experiments').update({ is_favorite, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['experiments'] }),
  })
}
