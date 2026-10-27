import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { ExperimentRun } from '../../types'

export function useRuns(experimentId: string) {
  return useQuery({
    queryKey: ['runs', experimentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('experiment_runs')
        .select('*')
        .eq('experiment_id', experimentId)
        .order('run_number', { ascending: true })
      if (error) throw error
      return data as ExperimentRun[]
    },
    enabled: !!experimentId,
  })
}

export function useCreateRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<ExperimentRun, 'id' | 'created_at'>) => {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) throw authError ?? new Error('You must be signed in to create a run')
      const { data: result, error } = await supabase.from('experiment_runs').insert({ ...data, user_id: authData.user.id }).select().single()
      if (error) throw error
      return result as ExperimentRun
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['runs', vars.experiment_id] })
      qc.invalidateQueries({ queryKey: ['experiment', vars.experiment_id] })
      qc.invalidateQueries({ queryKey: ['experiments'] })
    },
  })
}

export function useRunMetrics(runId: string) {
  return useQuery({
    queryKey: ['run-metrics', runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('run_metric_history')
        .select('id,step,epoch,metrics,client_event_id,event_timestamp,recorded_at')
        .eq('run_id', runId)
        .order('event_timestamp', { ascending: true, nullsFirst: false })
        .order('step', { ascending: true })
        .order('recorded_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!runId,
  })
}

export function useDeleteRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, experimentId }: { id: string; experimentId: string }) => {
      const { error } = await supabase.from('experiment_runs').delete().eq('id', id)
      if (error) throw error
      return experimentId
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['runs', vars.experimentId] })
      qc.invalidateQueries({ queryKey: ['experiments'] })
    },
  })
}

export function useAllRuns() {
  return useQuery({
    queryKey: ['runs', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('experiment_runs')
        .select('*, experiment:experiments(name, model_id, model:models(name))')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}
