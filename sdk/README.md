# Experiment Tracker SDK

## Installation

This repository includes an SDK package named `experiment_tracker`, which can conflict with an unrelated package that uses the same module name. Remove the unrelated package first, then install this SDK from the repository root:

```powershell
python -m pip uninstall -y experiment-tracker experiment-tracker-sdk
python -m pip install --no-cache-dir ./sdk
```

## Authentication

Create a project SDK key in the application's Settings → Developer page. Set it as an environment variable:

```sh
EXPERIMENT_TRACKER_API_KEY=exp_<64 lowercase hexadecimal characters>
EXPERIMENT_TRACKER_URL=https://<project-ref>.supabase.co/functions/v1/experiment-ingest
```

The API key is bound to exactly one project. The project argument passed to `init()` is descriptive only and is never trusted by the server. Keys are shown only once; store them in a secret manager. Never use the Supabase service-role key in an SDK or frontend.

### Using the key in VS Code

Before installing, verify that VS Code is using the same Python interpreter as the kernel. If this import fails, uninstall the unrelated `experiment-tracker` package and reinstall this project's SDK:

```python
%pip uninstall -y experiment-tracker experiment-tracker-sdk
%pip install --no-cache-dir --force-reinstall "C:/path/to/MLExperimentModelDashboard/sdk"
```

Restart the notebook kernel after installation, then verify:

```python
import experiment_tracker
print(experiment_tracker.__file__)
print(hasattr(experiment_tracker, "ExperimentTracker"))
```

Create a `.env` file in the root of the Python project opened in VS Code and add:

```dotenv
EXPERIMENT_TRACKER_API_KEY=exp_<the key shown once in Experiment Settings>
EXPERIMENT_TRACKER_URL=https://<project-ref>.supabase.co/functions/v1/experiment-ingest
```

Do not commit `.env`. Load it before creating the tracker:

```sh
python -m pip install python-dotenv
```

```python
from dotenv import load_dotenv
from experiment_tracker import ExperimentTracker

load_dotenv()
tracker = ExperimentTracker()
```

Alternatively, set both variables for the current PowerShell session without creating a file:

```powershell
$env:EXPERIMENT_TRACKER_API_KEY="exp_<key>"
$env:EXPERIMENT_TRACKER_URL="https://<project-ref>.supabase.co/functions/v1/experiment-ingest"
python your_training_script.py
```

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
