import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
}
const MAX_BODY_BYTES = 256 * 1024
const json = (value: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, ...headers, 'Content-Type': 'application/json' } })
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const validTimestamp = (value: unknown) => typeof value === 'string' && value.length <= 64 && !Number.isNaN(Date.parse(value))

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function readBody(req: Request) {
  const length = Number(req.headers.get('content-length') ?? 0)
  if (length > MAX_BODY_BYTES) throw Object.assign(new Error('Request body too large'), { status: 413 })
  const text = await req.text()
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw Object.assign(new Error('Request body too large'), { status: 413 })
  const body = JSON.parse(text)
  if (!isObject(body)) throw Object.assign(new Error('JSON body must be an object'), { status: 400 })
  return body
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const apiKey = req.headers.get('x-api-key') ?? ''
    if (!/^exp_[a-f0-9]{64}$/.test(apiKey)) return json({ error: 'Invalid API key' }, 401)
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const keyHash = await sha256(apiKey)
    const { data: key, error: keyError } = await supabase.from('sdk_api_keys').select('id, project_id, user_id, revoked_at').eq('key_hash', keyHash).is('revoked_at', null).maybeSingle()
    if (keyError || !key) return json({ error: 'Invalid or revoked API key' }, 401)

    await supabase.from('sdk_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id)
    const { data: withinLimit, error: rateLimitError } = await supabase.rpc('record_sdk_ingest_request', { p_key_id: key.id, p_limit: 120 })
    if (rateLimitError) throw rateLimitError
    if (!withinLimit) return json({ error: 'Rate limit exceeded', retry_after_seconds: 60 - new Date().getUTCSeconds() }, 429, { 'Retry-After': String(Math.max(1, 60 - new Date().getUTCSeconds())) })

    const url = new URL(req.url)
    const path = url.pathname.replace(/^.*\/experiment-ingest/, '')
    if (req.method === 'POST' && path === '/runs') {
      const body = await readBody(req)
      const experimentName = typeof body.experiment_name === 'string' ? body.experiment_name.trim() : ''
      if (!experimentName || experimentName.length > 200) return json({ error: 'experiment_name must contain 1–200 characters' }, 400)
      for (const name of ['hyperparameters', 'model_config', 'environment', 'custom_metrics']) {
        if (body[name] !== undefined && !isObject(body[name])) return json({ error: `${name} must be an object` }, 400)
      }
      if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 2000)) return json({ error: 'description must be a string up to 2000 characters' }, 400)
      if (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.length > 20 || !body.tags.every(v => typeof v === 'string' && v.length <= 50))) return json({ error: 'tags must contain at most 20 strings of 50 characters' }, 400)
      if (body.started_at !== undefined && !validTimestamp(body.started_at)) return json({ error: 'started_at must be a valid ISO timestamp' }, 400)
      if (body.completed_at !== undefined && !validTimestamp(body.completed_at)) return json({ error: 'completed_at must be a valid ISO timestamp' }, 400)
      const status = body.status ?? 'running'
      if (!['queued', 'running', 'completed', 'failed', 'cancelled'].includes(String(status))) return json({ error: 'Invalid run status' }, 400)
      const eventId = typeof body.client_event_id === 'string' && body.client_event_id.length <= 128 ? body.client_event_id : null
      let experiment = await supabase.from('experiments').select('id,user_id').eq('project_id', key.project_id).eq('name', experimentName).eq('user_id', key.user_id).maybeSingle()
      if (experiment.error) throw experiment.error
      if (!experiment.data) {
        const created = await supabase.from('experiments').insert({ user_id: key.user_id, project_id: key.project_id, name: experimentName, description: body.description ?? null, status: 'active', is_favorite: false, tags: body.tags ?? [], source: 'sdk' }).select('id,user_id').single()
        if (created.error) throw created.error
        experiment = created
      }
      const experimentId = experiment.data!.id
      if (eventId) {
        const existing = await supabase.from('experiment_runs').select('*').eq('experiment_id', experimentId).eq('client_event_id', eventId).maybeSingle()
        if (existing.error) throw existing.error
        if (existing.data) return json({ run: existing.data, duplicate: true })
      }
      const { data: run, error } = await supabase.from('experiment_runs').insert({ experiment_id: experimentId, user_id: key.user_id, run_number: null, status, source: 'sdk', started_at: body.started_at ?? new Date().toISOString(), completed_at: ['completed', 'failed', 'cancelled'].includes(String(status)) ? (body.completed_at ?? new Date().toISOString()) : null, hyperparameters: body.hyperparameters ?? {}, model_config: body.model_config ?? {}, environment: body.environment ?? {}, custom_metrics: body.custom_metrics ?? {}, random_seed: Number.isInteger(body.random_seed) ? body.random_seed : null, error_message: typeof body.error_message === 'string' ? body.error_message.slice(0, 4000) : null, notes: typeof body.notes === 'string' ? body.notes.slice(0, 4000) : null, client_event_id: eventId }).select('*').single()
      if (error) {
        if (eventId) {
          const raced = await supabase.from('experiment_runs').select('*').eq('experiment_id', experimentId).eq('client_event_id', eventId).maybeSingle()
          if (raced.data) return json({ run: raced.data, duplicate: true })
        }
        throw error
      }
      return json({ run }, 201)
    }

    const runMatch = path.match(/^\/runs\/([^/]+)(\/metrics|\/finish|\/status)?$/)
    if (runMatch) {
      const runId = runMatch[1]
      const action = runMatch[2] ?? ''
      const { data: run, error: runError } = await supabase.from('experiment_runs').select('id,user_id,experiment:experiments!inner(project_id)').eq('id', runId).eq('user_id', key.user_id).maybeSingle()
      if (runError || !run || (run as any).experiment.project_id !== key.project_id) return json({ error: 'Run not found' }, 404)

      if (req.method === 'PATCH' && action === '') {
        const body = await readBody(req)
        const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
        for (const name of ['hyperparameters', 'model_config', 'environment']) {
          if (body[name] !== undefined && !isObject(body[name])) return json({ error: `${name} must be an object` }, 400)
          if (body[name] !== undefined) update[name] = body[name]
        }
        const { data, error } = await supabase.from('experiment_runs').update(update).eq('id', runId).select('*').single()
        if (error) throw error
        return json({ run: data })
      }
      if (req.method === 'PATCH' && action === '/status') {
        const body = await readBody(req)
        if (!['queued', 'running', 'completed', 'failed', 'cancelled'].includes(String(body.status))) return json({ error: 'Invalid run status' }, 400)
        const update: Record<string, unknown> = { status: body.status, updated_at: new Date().toISOString() }
        if (body.status === 'running' && !body.started_at) update.started_at = new Date().toISOString()
        if (['completed', 'failed', 'cancelled'].includes(String(body.status))) update.completed_at = new Date().toISOString()
        if (typeof body.error_message === 'string') update.error_message = body.error_message.slice(0, 4000)
        const { data, error } = await supabase.from('experiment_runs').update(update).eq('id', runId).select('*').single()
        if (error) throw error
        return json({ run: data })
      }
      if (req.method === 'POST' && action === '/metrics') {
        const body = await readBody(req)
        const points = Array.isArray(body.points) ? body.points : null
        if (!points || points.length === 0 || points.length > 500) return json({ error: 'points must contain 1–500 metric events' }, 400)
        const rows = []
        for (const [index, point] of points.entries()) {
          if (!isObject(point) || !isFiniteNumber(point.step) || point.step < 0) return json({ error: `points[${index}] requires a non-negative numeric step` }, 400)
          if (point.epoch !== undefined && (!isFiniteNumber(point.epoch) || point.epoch < 0)) return json({ error: `points[${index}] epoch must be non-negative` }, 400)
          if (!isObject(point.metrics) || Object.keys(point.metrics).length === 0) return json({ error: `points[${index}] metrics must be a non-empty object` }, 400)
          const metrics: Record<string, number> = {}
          for (const [name, value] of Object.entries(point.metrics)) {
            if (!name || name.length > 200 || !isFiniteNumber(value)) return json({ error: `points[${index}] has an invalid metric` }, 400)
            metrics[name] = value
          }
          if (point.recorded_at !== undefined && !validTimestamp(point.recorded_at)) return json({ error: `points[${index}] recorded_at must be a valid timestamp` }, 400)
          const eventId = typeof point.client_event_id === 'string' && point.client_event_id.length <= 128 ? point.client_event_id : null
          rows.push({ run_id: runId, user_id: key.user_id, step: point.step, epoch: point.epoch ?? null, metrics, client_event_id: eventId, event_timestamp: point.recorded_at ?? null, recorded_at: point.recorded_at ?? new Date().toISOString() })
        }
        const { data, error } = await supabase.from('run_metric_history').upsert(rows, { onConflict: 'run_id,client_event_id', ignoreDuplicates: true }).select('id')
        if (error) throw error
        return json({ inserted: data?.length ?? 0 })
      }
      if (req.method === 'POST' && action === '/finish') {
        const body = await readBody(req)
        const status = body.status ?? 'completed'
        if (!['completed', 'failed', 'cancelled'].includes(String(status))) return json({ error: 'Finish status must be completed, failed, or cancelled' }, 400)
        if (body.final_metrics !== undefined && (!isObject(body.final_metrics) || Object.values(body.final_metrics).some(v => !isFiniteNumber(v)))) return json({ error: 'final_metrics must be a finite numeric object' }, 400)
        const update: Record<string, unknown> = { status, completed_at: body.completed_at ?? new Date().toISOString(), updated_at: new Date().toISOString() }
        if (typeof body.error_message === 'string') update.error_message = body.error_message.slice(0, 4000)
        if (body.final_metrics !== undefined) update.custom_metrics = body.final_metrics
        const { data, error } = await supabase.from('experiment_runs').update(update).eq('id', runId).select('*').single()
        if (error) throw error
        return json({ run: data })
      }
    }
    return json({ error: 'Not found' }, 404)
  } catch (error) {
    const status = error instanceof SyntaxError ? 400 : (typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status: number }).status) : 500)
    if (status >= 500) console.error(error)
    return json({ error: error instanceof SyntaxError ? 'Malformed JSON' : error instanceof Error ? error.message : 'Internal server error' }, status)
  }
})