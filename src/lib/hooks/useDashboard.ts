import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const [expResult, runResult, weekResult] = await Promise.all([
        supabase.from('experiments').select('id', { count: 'exact', head: true }),
        supabase.from('experiment_runs').select('accuracy').not('accuracy', 'is', null),
        supabase.from('experiments').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
      ])

      const accuracies = (runResult.data || []).map(r => r.accuracy as number)
      const bestAccuracy = accuracies.length ? Math.max(...accuracies) : null
      const avgAccuracy = accuracies.length ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length : null

      return {
        totalExperiments: expResult.count || 0,
        bestAccuracy,
        avgAccuracy,
        thisWeek: weekResult.count || 0,
      }
    },
  })
}

export function useRecentExperiments() {
  return useQuery({
    queryKey: ['recent-experiments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('experiments')
        .select('*, model:models(name), runs:experiment_runs(accuracy)')
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data
    },
  })
}
