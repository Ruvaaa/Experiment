# Experiment SDK ingestion protocol

## Project and workspace model

`projects` is the single project/workspace entity. SDK API keys are scoped to one project. The `project` argument in `ExperimentTracker.init(project, name)` is retained for SDK ergonomics but the server never trusts it; the API key determines the project.

## Authentication and secrets

Send each SDK API key in the `X-API-Key` header. Keys are generated as `exp_` plus 256 bits of random hex. The server stores only their SHA-256 hash and a visible prefix. The Supabase service-role key exists only in Edge Function server secrets and is never returned to the SDK or browser.

## Endpoints and payloads

- `POST /runs`: `{experiment_name, status?, description?, tags?, hyperparameters?, model_config?, environment?, random_seed?, client_event_id?}`. Creates/reuses the project experiment and returns `{run, duplicate?}`.
- `PATCH /runs/{id}`: `{hyperparameters?, model_config?, environment?}`.
- `PATCH /runs/{id}/status`: `{status, error_message?}`. Allowed statuses are queued, running, completed, failed, and cancelled.
- `POST /runs/{id}/metrics`: `{points: [{step, epoch?, metrics, recorded_at?, client_event_id?}]}`. One point may also be sent when convenience is needed, with a maximum of 500 points per request.
- `POST /runs/{id}/finish`: `{status, final_metrics?, error_message?}`.

## Validation

Metric values must be finite numbers. Unknown JSON objects are limited to configuration and metric payloads; arrays are rejected for configuration objects. Run statuses are allowlisted. Run and experiment IDs are verified against the API key owner and project. Accuracy-like percentages and fractions are normalized by clients where the existing UI accepts either representation.

## Retry, batching, and duplicate handling

The SDK retries network errors, HTTP 429, and HTTP 5xx with exponential backoff capped at 4 seconds; HTTP 429 honors `Retry-After`. It does not retry 4xx authorization or validation errors. Metric points receive a random UUID and the server uses unique `(run_id, client_event_id)` rows, making replay safe. The SDK buffers 100 points by default and flushes the buffer explicitly, on threshold, or when the run finishes; unsent points remain buffered after failures. A create-run UUID is sent as `client_event_id`; callers can supply a stable event ID to `init()` for deterministic cross-process replay.

## Rate limits

Authenticated ingestion requests are limited to 120 requests per key per UTC minute. HTTP 429 includes a numeric `Retry-After` header and a `retry_after_seconds` JSON field. This foundation uses an atomic shared PostgreSQL minute-bucket counter. Failures while recording usage fail closed only after key authentication, so ingestion is unavailable rather than bypassed.
