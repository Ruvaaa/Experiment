# Experiment Tracker SDK

## Installation

From the repository root:

```sh
python -m pip install ./sdk
```

## Authentication

Create a project SDK key in the application's Settings → Developer page. Set it as an environment variable:

```sh
EXPERIMENT_TRACKER_API_KEY=exp_<64 lowercase hexadecimal characters>
EXPERIMENT_TRACKER_URL=https://<project-ref>.supabase.co/functions/v1/experiment-ingest
```

The API key is bound to exactly one project. The project argument passed to `init()` is descriptive only and is never trusted by the server. Keys are shown only once; store them in a secret manager. Never use the Supabase service-role key in an SDK or frontend.

## Usage

```python
from experiment_tracker import ExperimentTracker

tracker = ExperimentTracker()
run = tracker.init("my-project", "baseline")
run.log_params({"learning_rate": 0.01})
run.log_config({"optimizer": "adam"})
run.log_metrics({"loss": 0.42, "accuracy": 0.91}, step=1, epoch=1)
run.flush()
run.finish(status="completed", final_metrics={"accuracy": 0.91})
```

Provide a stable `client_event_id` to `init()` when run creation must be replayed safely across processes:

```python
run = tracker.init("my-project", "baseline", client_event_id="training-job-123")
```

## Behavior

- Network errors, HTTP 429, and HTTP 5xx responses are retried up to `max_retries` times with exponential backoff (maximum 4 seconds).
- HTTP 429 honors the server's `Retry-After` header when present.
- Validation/authentication HTTP 4xx responses are not retried.
- Metrics are buffered and sent automatically after 100 points, or with `flush()` or `finish()`.
- Unsent metric batches remain buffered after failed requests.
- Metric point and run event IDs enable server-side duplicate suppression.

## Errors

All SDK failures raise `ExperimentTrackerError`. HTTP failures additionally use `ExperimentTrackerHTTPError` with `status` and parsed `response` attributes.
