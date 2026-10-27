# Experiment Tracker SDK: Complete Beginner's Guide

This guide documents every public SDK feature currently available in `experiment_tracker`.

## Contents

1. [Overview](#1-overview)
2. [Installation](#2-installation)
3. [Authentication](#3-authentication)
4. [Quick start](#4-quick-start)
5. [Public API](#5-public-api)
6. [`ExperimentTracker`](#6-experimenttracker)
7. [`Run`](#7-run)
8. [Metrics reference](#8-metrics-reference)
9. [Training framework examples](#9-training-framework-examples)
10. [Error handling](#10-error-handling)
11. [Reliability and retries](#11-reliability-and-retries)
12. [Security](#12-security)
13. [Troubleshooting](#13-troubleshooting)
14. [Complete notebook example](#14-complete-notebook-example)

---

## 1. Overview

`experiment_tracker` connects Python training code to Experiment. It can:

- create an Experiment run;
- store hyperparameters and configuration;
- send metric histories during training;
- update run status;
- finish runs as completed, failed, or cancelled;
- batch metrics and retry transient network/server failures.

The SDK sends data to a Supabase Edge Function. Authentication uses an SDK API key, not a Supabase service-role key or a browser user session.

Project name selected in the app is separate from the SDK's `project` argument. The API key identifies the project on the server. Do not depend on the `project` argument to control server-side storage.

## 2. Installation

### Install with pip

From the repository root:

```powershell
python -m pip uninstall -y experiment-tracker experiment-tracker-sdk
python -m pip install --no-cache-dir --force-reinstall ./sdk
python -m pip install python-dotenv
```

To install in a notebook, execute these in a notebook cell:

```python
%pip uninstall -y experiment-tracker experiment-tracker-sdk
%pip install --no-cache-dir --force-reinstall "C:/path/to/MLExperimentModelDashboard/sdk"
%pip install python-dotenv
```

Use `%pip` when installing for a notebook so pip targets the kernel environment.

### Verify the installation

```python
import sys
import experiment_tracker
from experiment_tracker import ExperimentTracker

print(sys.executable)
print(experiment_tracker.__file__)
print(ExperimentTracker)
```

Restart the kernel after reinstalling the package. `experiment_tracker.__file__` should point to this SDK rather than an unrelated package named `experiment_tracker`.

### Packaging collision

An unrelated package named `experiment-tracker` can occupy the import name `experiment_tracker`. Remove both the old distribution and this SDK before reinstalling:

```python
%pip uninstall -y experiment-tracker experiment-tracker-sdk
%pip install --no-cache-dir --force-reinstall "C:/path/to/MLExperimentModelDashboard/sdk"
```

Then restart the kernel and verify that `ExperimentTracker` imports successfully.

## 3. Authentication

Create a project and API key in **Settings → Developer**:

1. Create a project.
2. Select it in the project selector.
3. Enter a key name.
4. Create the key.
5. Copy it immediately.

For security, Experiment displays plaintext only once. Store it in a `.env` file or secret manager.

### Environment variables

Create `.env` in the directory containing your Python project:

```dotenv
EXPERIMENT_TRACKER_API_KEY=exp_<64 lowercase hexadecimal characters>
EXPERIMENT_TRACKER_URL=https://<project-ref>.supabase.co/functions/v1/experiment-ingest
```

Load it:

```python
from dotenv import load_dotenv

load_dotenv()
```

By default, `find_dotenv()` searches from the current working directory. To load a specific file or require it to exist:

```python
from dotenv import load_dotenv

loaded = load_dotenv("C:/path/to/project/.env")
print(loaded)
```

### PowerShell environment variables

```powershell
$env:EXPERIMENT_TRACKER_API_KEY="exp_<key>"
$env:EXPERIMENT_TRACKER_URL="https://<project-ref>.supabase.co/functions/v1/experiment-ingest"
python your_training_script.py
```

Environment variables set this way apply only to the current PowerShell process and processes started from it.

### Required API-key format

Keys must match:

```text
exp_ + 64 lowercase hexadecimal characters
```

The resulting key length is 68 characters. Uppercase hex characters and malformed prefixes are rejected locally.

### API-key scope

The API key is bound to one project. Every SDK request uses it to derive project and user ownership on the server. The SDK does not accept or send a separate `project_id`.

Do not commit `.env`, paste keys into GitHub issues, or publish screenshots containing keys. Revoke exposed keys in **Settings → Developer**.

## 4. Quick start

```python
from dotenv import load_dotenv
from experiment_tracker import ExperimentTracker

load_dotenv()
tracker = ExperimentTracker()

run = tracker.init("My project", "Training baseline")
run.log_params({"learning_rate": 0.001, "batch_size": 32})
run.log_config({"optimizer": "Adam", "architecture": "MLP"})

for step in range(1, 11):
    run.log_metrics(
        {"loss": 1.0 / step, "accuracy": min(0.99, 0.70 + step * 0.02)},
        step=step,
    )

run.finish(
    status="completed",
    final_metrics={"loss": 0.10, "accuracy": 0.99},
)
print(run.id)
```

This example:

1. loads configuration;
2. creates a client;
3. creates a run;
4. sends hyperparameters and configuration;
5. buffers metrics;
6. flushes metrics while finishing;
7. marks the run completed.

## 5. Public API

The SDK's public exports are:

```python
from experiment_tracker import (
    ExperimentTracker,
    ExperimentTrackerError,
    ExperimentTrackerHTTPError,
    Run,
)
```

`Run` normally comes from `ExperimentTracker.init()` and does not need to be constructed directly. Public SDK operations are:

| Object | Method | Purpose |
|---|---|---|
| `ExperimentTracker` | constructor | validate credentials and configure HTTP behavior |
| `ExperimentTracker` | `init()` | create or reuse a run |
| `Run` | `log_params()` | send hyperparameters |
| `Run` | `log_config()` | send model configuration |
| `Run` | `log_metric()` | add one metric mapping or one named metric |
| `Run` | `log_metrics()` | add a metric point and buffer it |
| `Run` | `flush()` | send buffered metric points |
| `Run` | `update_status()` | set a run status |
| `Run` | `finish()` | flush metrics and complete, fail, or cancel a run |

## 6. `ExperimentTracker`

### Constructor

```python
ExperimentTracker(
    api_key=None,
    base_url=None,
    timeout=15,
    max_retries=3,
)
```

#### `api_key`

- Type: `str | None`
- Default: `EXPERIMENT_TRACKER_API_KEY`
- Required after configuration resolution.

When omitted, the SDK reads `EXPERIMENT_TRACKER_API_KEY`. An explicit argument overrides the environment variable.

```python
tracker = ExperimentTracker(api_key="exp_<your-key>")
```

Invalid values raise `ExperimentTrackerError` before any HTTP request is made.

#### `base_url`

- Type: `str | None`
- Default: `EXPERIMENT_TRACKER_URL`, otherwise `http://localhost:54321/functions/v1/experiment-ingest`
- Trailing `/` is removed automatically.

```python
tracker = ExperimentTracker(
    base_url="https://<project-ref>.supabase.co/functions/v1/experiment-ingest",
)
```

The URL must identify the ingestion function. The SDK appends endpoint paths such as `/runs` and `/runs/<id>/metrics`; do not include those suffixes in `base_url`.

An explicit argument overrides `EXPERIMENT_TRACKER_URL`.

#### `timeout`

- Type: `float`
- Default: `15`
- Unit: seconds per request attempt.

```python
tracker = ExperimentTracker(timeout=30)
```

A timeout is a network-level failure and can be retried according to `max_retries`.

#### `max_retries`

- Type: `int`
- Default: `3`
- Number of retries after the initial request.

```python
tracker = ExperimentTracker(max_retries=5)
```

The total maximum number of attempts is `max_retries + 1`. Negative values are not prevented by the SDK implementation; pass zero or a positive integer.

### `init()`

```python
tracker.init(project, name, client_event_id=None)
```

Returns a `Run`.

#### Arguments

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `project` | `str` | Yes | Display or compatibility project name retained by the SDK. It is not trusted by the server. |
| `name` | `str` | Yes | Human-readable training run or experiment name. |
| `client_event_id` | `str | None` | No | Stable identifier that makes run creation replay-safe. A UUID is generated automatically. |

The key determines the real project in Experiment. `project` is retained for SDK API compatibility and currently ignored by the server. It may be the project name from Experiment, but the program should not depend on that text for authorization.

#### Example

```python
run = tracker.init(
    "Machine Learning Project",
    "ResNet50 baseline",
    client_event_id="resnet50-baseline-2026-10-28",
)
```

#### Stable event ID

Use a stable `client_event_id` when a job may be restarted or its run creation request may be replayed:

```python
job_id = "image-training/nightly/2026-10-28"
run = tracker.init("Image Project", "Nightly training", job_id)
```

If the server already has a run with the same event ID for the same experiment, it returns the existing run and marks the response as a duplicate. The SDK returns that run's ID.

#### Default event ID

If omitted, the SDK creates a random UUID for `client_event_id`.

## 7. `Run`

A `Run` represents one server-side training run. Usually retrieve it using `tracker.init()`:

```python
run = tracker.init("My project", "Training run")
print(run.id)
```

### Run attributes

| Attribute | Meaning |
|---|---|
| `run.id` | Server run ID returned after creation. |
| `run.client` | The `ExperimentTracker` instance that created the run. |

Metrics are buffered in the private `_metric_batch` attribute. Application code should normally call public methods instead of accessing private state.

### `Run.log_params()`

```python
run.log_params(params)
```

#### Arguments

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `params` | `Mapping` | Yes | Hyperparameters sent immediately as JSON-like configuration. |

#### Example

```python
run.log_params({
    "learning_rate": 0.001,
    "batch_size": 64,
    "epochs": 50,
    "dropout": 0.2,
})
```

The mapping must be a Python `Mapping`, but it is converted to a dictionary. Values should be JSON-compatible. This method sends the request immediately; it does not buffer parameters.

A dictionary is recommended. Types, booleans, and nested values are left for the server protocol to process, so keep parameter values simple and JSON-safe.

#### Raises

- `TypeError` when `params` is not a `Mapping`.
- Network or HTTP exceptions through the underlying request logic.

### `Run.log_config()`

```python
run.log_config(config)
```

#### Arguments

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `config` | `Mapping` | Yes | Static model, environment, or framework configuration. |

#### Example

```python
run.log_config({
    "architecture": "ResNet18",
    "optimizer": "AdamW",
    "device": "cuda",
    "dataset": "local-images-v1",
})
```

This method sends immediately and does not buffer. Use it for configuration that describes the run rather than values that change at each training step.

#### Raises

- `TypeError` when `config` is not a `Mapping`.
- Network or HTTP exceptions through the underlying request logic.

### `Run.log_metric()`

```python
run.log_metric(
    metrics_or_name,
    value=None,
    step=None,
    epoch=None,
    batch_size=100,
    recorded_at=None,
)
```

This convenience method can log either one named metric or a mapping.

#### Mapping form

```python
run.log_metric(
    {"loss": 0.42, "accuracy": 0.91},
    step=1,
    epoch=1,
)
```

In this form:

- `metrics_or_name` is a `Mapping[str, int | float]`;
- `value` must be `None`.

#### Name/value form

```python
run.log_metric("loss", 0.42, step=1, epoch=1)
```

In this form:

- `metrics_or_name` is a metric name string;
- `value` is the numeric metric value.

#### Arguments shared by both forms

| Argument | Type | Default | Meaning |
|---|---|---|---|
| `metrics_or_name` | `Mapping[str, int \| float] \| str` | Required | Metric mapping, or metric name. |
| `value` | `int \| float \| None` | `None` | Numeric value for the name/value form. |
| `step` | `int \| None` | `None` | Training step. Negative values are rejected. |
| `epoch` | `int \| None` | `None` | Training epoch. Negative values are rejected. |
| `batch_size` | `int` | `100` | Flush when the buffer reaches this many points. |
| `recorded_at` | `str \| None` | `None` | Optional ISO timestamp identifying when the point was recorded. |

For every newly buffered point, the SDK generates a unique `client_event_id`. This permits retries to avoid duplicate metric-point inserts.

#### Raises

- `TypeError` if the arguments do not use a supported form.
- `TypeError` if `value` is supplied in mapping form.
- Validation errors are delegated to `log_metrics()` for metric values and positions.

### `Run.log_metrics()`

```python
run.log_metrics(
    metrics,
    step=None,
    epoch=None,
    batch_size=100,
    recorded_at=None,
)
```

Adds one metric point to the buffer and optionally flushes it.

#### Arguments

| Argument | Type | Default | Meaning |
|---|---|---|---|
| `metrics` | `Mapping[str, int \| float]` | Required | Metric names and numeric values. |
| `step` | `int \| None` | `None` | Training step; if omitted, SDK-managed step increments from zero. |
| `epoch` | `int \| None` | `None` | Training epoch. |
| `batch_size` | `int` | `100` | Number of buffered points that triggers `flush()`. |
| `recorded_at` | `str \| None` | `None` | Optional ISO-8601 timestamp. |

#### Example with explicit positions

```python
run.log_metrics(
    {"loss": 0.32, "accuracy": 0.93, "val_loss": 0.35},
    step=120,
    epoch=4,
    recorded_at="2026-10-28T01:00:00Z",
)
```

#### Automatic step behavior

If `step=None`, the SDK begins its internal step counter at `0` and increments it by one after each metric point logged without an explicit step:

```python
run.log_metrics({"loss": 0.8})  # step 0
run.log_metrics({"loss": 0.7})  # step 1
run.log_metrics({"loss": 0.6})  # step 2
```

If you pass `step=10`, the SDK does not increment `_step` for that call. The next call that omits `step` still uses the current SDK-managed value.

#### Metric validation

- metric values must be `int` or `float`;
- booleans are rejected;
- `NaN` and infinity are rejected;
- metric names are converted to strings;
- `step` must be a non-negative integer or `None`;
- `epoch` must be a non-negative integer or `None`;
- booleans are rejected for both step and epoch.

#### Validation errors

```python
TypeError
# non-mapping metrics, or invalid step/epoch type is typically ValueError
ValueError
```

The SDK raises `ValueError` for a negative position, non-finite metric, boolean metric, or boolean position, and `TypeError` for a non-mapping metrics object.

### `Run.flush()`

```python
run.flush()
```

Sends all currently buffered metric points to:

```text
POST /runs/{run_id}/metrics
```

The method returns `None`. If the buffer is empty, no request is sent.

On a successful HTTP response, buffered points are removed. On failure, the implementation retains unsent points because only the successfully sent batch is removed from the buffer.

#### Retry and replay

Every metric point has a unique `client_event_id`. Retrying the same HTTP batch does not insert duplicate metric points when the server recognizes that ID.

### `Run.update_status()`

```python
run.update_status(status, error_message=None)
```

#### Arguments

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `status` | `str` | Yes | New run status. |
| `error_message` | `str \| None` | No | Optional error text to store. |

Allowed statuses:

- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`

```python
run.update_status("running")
run.update_status("failed", error_message="Training exceeded the memory limit")
```

Raises `ValueError` for an unsupported status.

The server may enforce lifecycle rules, including preventing a completed run from returning to a non-terminal state. Terminal statuses are commonly `completed`, `failed`, and `cancelled`.

### `Run.finish()`

```python
run.finish(status="completed", final_metrics=None, error_message=None)
```

#### Arguments

| Argument | Type | Default | Meaning |
|---|---|---|---|
| `status` | `str` | `"completed"` | Terminal status: completed, failed, or cancelled. |
| `final_metrics` | `Mapping \| None` | `None` | Final metric values posted with completion. |
| `error_message` | `str \| None` | `None` | Optional failure or cancellation detail. |

#### Behavior

1. flushes buffered metrics;
2. validates that the final status is terminal;
3. sends the final metrics and optional error to the server;
4. marks the run terminal.

The status must be one of:

- `completed`;
- `failed`;
- `cancelled`.

#### Examples

Completed:

```python
run.finish(
    status="completed",
    final_metrics={"loss": 0.12, "accuracy": 0.96},
)
```

Failed:

```python
run.finish(
    status="failed",
    error_message="CUDA out of memory after epoch 3",
)
```

Cancelled:

```python
run.finish(
    status="cancelled",
    error_message="Cancelled by the user",
)
```

`finish()` calls `flush()` before its final HTTP request. Do not call `flush()` manually unless you specifically want an intermediate network write.

## 8. Metrics reference

### Recommended naming

Use stable metric names throughout a run:

```python
"loss"
"accuracy"
"val_loss"
"val_accuracy"
"learning_rate"
"f1_score"
```

Changing names between runs makes comparison and dashboard querying harder. Keep names consistent across runs being compared.

### Chronological coordinates

Metric records should include chronological information for useful training curves:

```python
run.log_metrics(
    {"loss": loss, "accuracy": accuracy},
    step=batch_number,
    epoch=epoch,
    recorded_at=datetime.utcnow().isoformat() + "Z",
)
```

Use:

- `step` for training, batch, or global iteration order;
- `epoch` for dataset passes;
- `recorded_at` for wall-clock time, when required.

### One point may contain several metrics

One mapping produces one point containing several metrics:

```python
run.log_metrics({"loss": 0.3, "accuracy": 0.95}, step=100, epoch=2)
```

A call such as `log_metrics()` with 10 metric names still creates one metric point; metric batching is measured in points, not keys.

### Buffering

The default buffer threshold is 100 points. It can be changed for either convenience method by passing `batch_size`:

```python
run.log_metrics({"loss": 0.4}, step=1, batch_size=10)
run.flush()  # explicitly send remaining points
```

If a batch automatically flushes, the SDK sends immediately. Successful delivery clears the sent slice from the buffer.

### Numeric accuracy

Metric storage accepts finite numbers. The SDK does not convert percentages automatically. If Experiment's accuracy convention is a fraction, send `0.91`; if it is a percentage, send `91`. Choose one convention consistently and document it for comparisons.

## 9. Training framework examples

### Plain Python loop

```python
from dotenv import load_dotenv
from experiment_tracker import ExperimentTracker

load_dotenv()
tracker = ExperimentTracker()
run = tracker.init("Examples", "Plain training loop")
run.log_params({"learning_rate": 0.01, "epochs": 5})

for epoch in range(5):
    loss = max(0.05, 1.0 - (epoch + 1) * 0.15)
    accuracy = min(0.99, 0.60 + (epoch + 1) * 0.07)
    run.log_metrics(
        {"loss": loss, "accuracy": accuracy},
        step=epoch + 1,
        epoch=epoch + 1,
    )

run.finish(status="completed")
```

### TensorFlow / Keras

```python
from dotenv import load_dotenv
from experiment_tracker import ExperimentTracker

load_dotenv()
tracker = ExperimentTracker()
run = tracker.init("Image models", "Keras classification")

run.log_params({"epochs": epochs, "batch_size": 32, "learning_rate": 0.001})
run.log_config({"framework": "TensorFlow/Keras", "architecture": "Custom CNN"})

for epoch in range(epochs):
    history = model.fit(
        train_x,
        train_y,
        epochs=1,
        batch_size=32,
        validation_data=(validation_x, validation_y),
        verbose=0,
    )

    run.log_metrics({
        "loss": float(history.history["loss"][-1]),
        "accuracy": float(history.history["accuracy"][-1]),
        "val_loss": float(history.history["val_loss"][-1]),
        "val_accuracy": float(history.history["val_accuracy"][-1]),
    }, step=epoch + 1, epoch=epoch + 1)

run.finish(status="completed")
```

Configure Python variables `epochs`, `model`, `train_x`, and `validation_x` as required by the surrounding training program before this example.

#### Keras callback alternative

```python
class ExperimentCallback:
    def __init__(self, run):
        self.run = run

    def on_epoch_end(self, epoch, logs=None):
        numeric_logs = {
            name: float(value)
            for name, value in (logs or {}).items()
            if isinstance(value, (int, float))
        }
        self.run.log_metrics(numeric_logs, step=epoch + 1, epoch=epoch + 1)
```

Pass a callback implementation consistent with the callback API of your TensorFlow/Keras version. The example shows how to convert and forward epoch logs rather than calling a built-in SDK callback.

### PyTorch

```python
from dotenv import load_dotenv
from experiment_tracker import ExperimentTracker

load_dotenv()
tracker = ExperimentTracker()
run = tracker.init("Image models", "PyTorch training")
run.log_params({"learning_rate": learning_rate, "epochs": epochs, "batch_size": batch_size})
run.log_config({"framework": "PyTorch", "device": str(device)})

for epoch in range(epochs):
    model.train()
    total_loss = 0.0

    for inputs, targets in train_loader:
        inputs = inputs.to(device)
        targets = targets.to(device)
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, targets)
        loss.backward()
        optimizer.step()
        total_loss += float(loss.detach().cpu())

    average_loss = total_loss / len(train_loader)
    run.log_metrics({"loss": average_loss}, step=epoch + 1, epoch=epoch + 1)

run.finish(status="completed")
```

### Failure handling for frameworks

```python
try:
    train()
except Exception as exc:
    run.finish(
        status="failed",
        error_message=f"{type(exc).__name__}: {exc}",
    )
    raise
```

Only send error text that is safe to store. Do not include secrets or private training data.

## 10. Error handling

### Exception classes

#### `ExperimentTrackerError`

`ExperimentTrackerError` inherits from `RuntimeError` and covers SDK-level failures, including:

- missing API key;
- invalid API-key format;
- exhausted retries;
- network failures.

#### `ExperimentTrackerHTTPError`

`ExperimentTrackerHTTPError` inherits from `ExperimentTrackerError`. It is raised for HTTP responses that are non-retriable or exhaust handling, and exposes:

| Attribute | Meaning |
|---|---|
| `status` | HTTP status code. |
| `response` | Parsed JSON response, if JSON decoding succeeds; otherwise `None`. |
| exception message | Includes status and raw response text. |

```python
from experiment_tracker import ExperimentTrackerError, ExperimentTrackerHTTPError

try:
    run = tracker.init("My project", "Training")
except ExperimentTrackerHTTPError as exc:
    print(exc.status)
    print(exc.response)
    print(str(exc))
except ExperimentTrackerError as exc:
    print(str(exc))
```

### Validation exceptions

The SDK also raises normal Python exceptions for invalid method arguments:

| Exception | Common cause |
|---|---|
| `TypeError` | `params`, `config`, or metrics are not mappings; unsupported `log_metric()` form |
| `ValueError` | non-finite or boolean metrics; negative or boolean step/epoch; unsupported status |

## 11. Reliability and retries

### HTTP retries

A request makes the initial attempt plus up to `max_retries` retries. Retried failures are:

- network URL errors;
- timeout errors;
- HTTP 429;
- HTTP 5xx responses.

HTTP 4xx responses other than 429 are not retried, including validation and authentication failures.

### Backoff

Retries use exponential backoff capped at four seconds:

```text
0.5 seconds, 1 second, 2 seconds, 4 seconds, then 4 seconds
```

`HTTP 429` uses the server's `Retry-After` header when it is a valid integer number of seconds.

### Metric buffering and duplicate handling

Each metric point contains a random UUID in `client_event_id`. Server ingestion uses this identifier to make replay safe for repeated metric batches.

Run creation also uses a UUID in `client_event_id`. If a stable ID is supplied, repeated creation can reuse the existing run instead of creating a duplicate.

A successful request removes the submitted metric slice from the local buffer. Failed requests leave points buffered for future retry or `flush()` calls within the same run object, subject to process lifetime.

The SDK does not persist buffered metrics to disk between Python process restarts.

## 12. Security

- Never use a Supabase service-role key in frontend or Python code.
- Never commit an SDK API key.
- API keys are scoped to one project.
- The server derives project authorization from the key.
- Store plaintext keys only in environment variables or a secret manager.
- Revoke exposed keys immediately.
- Do not send passwords, tokens, service keys, private customer data, or raw personal data as parameters or error messages.
- Restrict API key and project access according to your organization's development policies.

## 13. Troubleshooting

### Wrong package is imported

```python
import sys
import experiment_tracker
print(sys.executable)
print(experiment_tracker.__file__)
```

If the path belongs to an unrelated package, uninstall both distributions and restart the kernel:

```python
%pip uninstall -y experiment-tracker experiment-tracker-sdk
%pip install --no-cache-dir --force-reinstall "C:/path/to/MLExperimentModelDashboard/sdk"
```

### Missing API key

`ExperimentTrackerError` with `Set api_key or EXPERIMENT_TRACKER_API_KEY` means the environment variable was not loaded or no explicit key was passed.

```python
import os
from dotenv import load_dotenv

load_dotenv()
print("Key loaded:", bool(os.getenv("EXPERIMENT_TRACKER_API_KEY")))
```

Do not print the key itself.

### Invalid API-key format

Verify that the key is in this form:

```text
exp_ + 64 lowercase hexadecimal characters
```

Do not include quotes, spaces, angle brackets, or line breaks inside the actual `.env` value.

### `.env` not loading

```python
from dotenv import find_dotenv, load_dotenv

print(find_dotenv(usecwd=True))
load_dotenv()
```

If the printed path is wrong or empty, pass the absolute path:

```python
load_dotenv("C:/absolute/path/to/project/.env")
```

### HTTP 404

Confirm `EXPERIMENT_TRACKER_URL` equals:

```text
https://<project-ref>.supabase.co/functions/v1/experiment-ingest
```

Do not append `/runs`, `/metrics`, or `/finish`. The SDK appends paths.

### HTTP 401 `Invalid API key`

Create and copy a new SDK key in Experiment's **Settings → Developer**, update `.env`, then restart the kernel after the environment file changes.

### HTTP 429

The key has reached its ingestion rate limit. The SDK reads `Retry-After` when provided and waits. Reduce request frequency, increase batching, or wait for the next minute bucket when appropriate.

### Terminal status cannot be changed

A run with status `completed`, `failed`, or `cancelled` must not be changed to a different lifecycle state. Create a new run for another training attempt.

### Unsaved metrics after failure

Call `flush()` while the run object is still alive when metrics have not reached the automatic threshold. The SDK buffer exists only in the current Python process and is not persisted across process restarts.

### Notebook kernel is stale

Restart the kernel after:

- changing the installed SDK;
- changing `.env` values already loaded by Python;
- reinstalling Python packages;
- switching VS Code Python interpreters.

## 14. Complete notebook example

```python
from dotenv import load_dotenv
from experiment_tracker import (
    ExperimentTracker,
    ExperimentTrackerError,
    ExperimentTrackerHTTPError,
)

load_dotenv()

try:
    tracker = ExperimentTracker(timeout=30, max_retries=5)
    run = tracker.init(
        "My project",
        "Notebook training",
        client_event_id="notebook-training-example-001",
    )

    print("Run ID:", run.id)

    run.log_params({
        "learning_rate": 0.001,
        "batch_size": 32,
        "epochs": 3,
    })
    run.log_config({
        "optimizer": "Adam",
        "framework": "PyTorch",
        "device": "cpu",
    })

    for epoch in range(1, 4):
        train_loss = 1.0 / epoch
        train_accuracy = min(0.99, 0.70 + epoch * 0.08)
        run.log_metrics(
            {"loss": train_loss, "accuracy": train_accuracy},
            step=epoch,
            epoch=epoch,
        )

    run.finish(
        status="completed",
        final_metrics={"loss": 1.0 / 3, "accuracy": 0.94},
    )
    print("Run recorded successfully")

except ExperimentTrackerHTTPError as exc:
    print("Server error", exc.status)
    print(exc.response)

except ExperimentTrackerError as exc:
    print("SDK error:", exc)
    raise
```

For real training, replace the synthetic `train_loss` and `train_accuracy` calculations with values measured by the framework after each epoch.
