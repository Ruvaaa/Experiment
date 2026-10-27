import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { Project } from '../../types'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as Project[]
    },
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: { name: string; description?: string | null }) => {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth) throw authError ?? new Error('Authentication required')
      const { data, error } = await supabase.from('projects').insert({ ...values, user_id: auth.user.id }).select('*').single()
      if (error) throw error
      return data as Project
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export interface SDKKeyRecord {
  id: string
  project_id: string
  name: string
  key_prefix: string
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
}

export function useSDKKeys() {
  return useQuery({
    queryKey: ['sdk-keys'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sdk_api_keys').select('id,project_id,name,key_prefix,last_used_at,revoked_at,created_at').order('created_at', { ascending: false })
      if (error) throw error
      return data as SDKKeyRecord[]
    },
  })
}

export function useCreateSDKKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, name }: { projectId: string; name: string }) => {
      const { data, error } = await supabase.rpc('create_sdk_api_key', { p_project_id: projectId, p_name: name })
      if (error) throw error
      return (Array.isArray(data) ? data[0] : data) as { id: string; plaintext_key: string; key_prefix: string }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sdk-keys'] }),
  })
}

export function useRevokeSDKKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('revoke_sdk_api_key', { p_key_id: id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sdk-keys'] }),
  })
}
