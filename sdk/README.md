# Experiment Tracker SDK User Guide

This guide shows how to connect a Python training script or notebook to Experiment.

## 1. Create and install an API key

1. Sign in to Experiment.
2. Open **Settings → Developer**.
3. Create a project if needed.
4. Select the project and create an SDK API key.
5. Copy the key immediately. It is shown only once.
6. Install the SDK in the same Python environment used by your VS Code terminal or notebook kernel.

From the Experiment repository root:

```powershell
python -m pip uninstall -y experiment-tracker experiment-tracker-sdk
python -m pip install --no-cache-dir --force-reinstall ./sdk
python -m pip install python-dotenv
```

For a notebook, run the installation in a cell so `%pip` uses the notebook kernel:

```python
%pip uninstall -y experiment-tracker experiment-tracker-sdk
%pip install --no-cache-dir --force-reinstall "C:/path/to/MLExperimentModelDashboard/sdk"
%pip install python-dotenv
```

Restart the kernel after installation, then verify the import:

```python
import experiment_tracker
print(experiment_tracker.__file__)
print(experiment_tracker.ExperimentTracker)
```

The file path should be inside your active Python environment or reference this repository's `sdk/experiment_tracker` directory.

## 2. Configure authentication

Create `.env` in the root of the Python project:

```dotenv
EXPERIMENT_TRACKER_API_KEY=exp_<your-64-character-key>
EXPERIMENT_TRACKER_URL=https://<project-ref>.supabase.co/functions/v1/experiment-ingest
```

Do not commit `.env`, print the key, or share screenshots containing it. The key is scoped to one project and the API key determines where runs are stored.

Load the configuration before creating the tracker:

```python
from dotenv import load_dotenv
from experiment_tracker import ExperimentTracker

load_dotenv()
tracker = ExperimentTracker()
```

You may alternatively provide settings directly:

```python
tracker = ExperimentTracker(
    api_key="exp_<your-key>",
    base_url="https://<project-ref>.supabase.co/functions/v1/experiment-ingest",
)
```

Passing credentials directly is useful for controlled scripts, but environment variables are preferred for notebooks and development projects.

## 3. Create a run

```python
tracker = ExperimentTracker()
run = tracker.init("My project", "Baseline training")
print(run.id)
```

The `project` argument is descriptive compatibility input. The API key determines the actual project.

Supply a stable run identifier when repeated code may resume or retry the same job:

```python
run = tracker.init(
    "My project",
    "Baseline training",
    client_event_id="training-job-2026-10-28-01",
)
```

## 4. Record parameters and configuration

Record hyperparameters before or during training:

```python
run.log_params({
    "learning_rate": 0.001,
    "batch_size": 32,
    "epochs": 20,
})

run.log_config({
    "optimizer": "Adam",
    "architecture": "MLP",
    "seed": 42,
})
```

Both methods send configuration to the server immediately.

## 5. Record metrics

Log several metrics together:

```python
run.log_metrics(
    {"loss": 0.42, "accuracy": 0.91},
    step=1,
    epoch=1,
)
```

Or log one metric with a name and value:

```python
run.log_metric("loss", 0.42, step=1, epoch=1)
```

The mapping form is also supported:

```python
run.log_metric({"loss": 0.42, "accuracy": 0.91}, step=1, epoch=1)
```

Metric values must be finite numbers. Do not use `NaN`, infinity, or booleans. `step` and `epoch` must be non-negative integers when provided.

Metric points are buffered. They are sent automatically after the configured batch size, and can be sent manually:

```python
run.flush()
```

## 6. Complete a training loop

```python
from dotenv import load_dotenv
from experiment_tracker import ExperimentTracker

load_dotenv()
tracker = ExperimentTracker()
run = tracker.init("My project", "Training run")

run.log_params({"learning_rate": 0.001, "epochs": 3})
run.log_config({"optimizer": "Adam"})

for epoch in range(1, 4):
    train_loss = 1.0 / epoch
    accuracy = min(0.99, 0.70 + epoch * 0.08)
    run.log_metrics(
        {"loss": train_loss, "accuracy": accuracy},
        step=epoch,
        epoch=epoch,
    )

run.finish(
    status="completed",
    final_metrics={"loss": 0.33, "accuracy": 0.94},
)
```

`finish()` flushes buffered metrics before completing the run. It is sufficient for normal completion without calling `flush()` first.

## 7. Update status or handle failures

Update an active run:

```python
run.update_status("running")
run.update_status("completed")
```

Allowed statuses are `queued`, `running`, `completed`, `failed`, and `cancelled`.

If training fails:

```python
try:
    train_model()
except Exception as exc:
    run.finish(
        status="failed",
        error_message=f"{type(exc).__name__}: {exc}",
    )
    raise
```

Only send error details that are safe to store. Do not include API keys, passwords, tokens, or private data.

## 8. TensorFlow/Keras example

```python
run.log_params(model.optimizer.get_config())

for epoch in range(epochs):
    history = model.fit(
        train_x,
        train_y,
        epochs=1,
        validation_data=(test_x, test_y),
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

## 9. PyTorch example

```python
for epoch in range(epochs):
    model.train()
    total_loss = 0.0

    for batch_index, (inputs, targets) in enumerate(train_loader):
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, targets)
        loss.backward()
        optimizer.step()
        total_loss += float(loss.detach())

    average_loss = total_loss / len(train_loader)
    run.log_metric("loss", average_loss, step=epoch + 1, epoch=epoch + 1)

run.finish(status="completed")
```

## 10. Catch SDK errors

```python
from experiment_tracker import ExperimentTrackerError, ExperimentTrackerHTTPError

try:
    run = tracker.init("My project", "Training")
except ExperimentTrackerHTTPError as exc:
    print(f"Server returned HTTP {exc.status}")
    print(exc.response)
except ExperimentTrackerError as exc:
    print(f"Tracking failed: {exc}")
```

`ExperimentTrackerError` covers missing configuration, invalid values, networking failures, and other SDK failures. `ExperimentTrackerHTTPError` additionally exposes `status` and a parsed `response`.

The SDK retries:

- network errors;
- HTTP 429 rate limits;
- HTTP 5xx server errors.

It does not retry most HTTP 4xx validation or authentication errors. Rate-limit responses may include `Retry-After`.

## 11. Troubleshooting

### ImportError or wrong package

Search the active environment for the module:

```python
import sys
import experiment_tracker
print(sys.executable)
print(experiment_tracker.__file__)
```

If `experiment_tracker.__file__` points to a package you did not install, uninstall both packages, install this SDK, and restart the kernel:

```python
%pip uninstall -y experiment-tracker experiment-tracker-sdk
%pip install --no-cache-dir --force-reinstall "C:/path/to/MLExperimentModelDashboard/sdk"
```

### Environment variables are not loading

Confirm the notebook's working directory contains `.env`:

```python
from dotenv import find_dotenv, load_dotenv

print(find_dotenv(usecwd=True))
load_dotenv()
```

### The API endpoint returns 404

Confirm `EXPERIMENT_TRACKER_URL` ends with `/functions/v1/experiment-ingest`. Do not append `/runs`; the SDK appends endpoints such as `/runs` and `/runs/{id}/metrics`.

### The API endpoint returns Invalid API key

Create a new key in **Settings → Developer** and replace `EXPERIMENT_TRACKER_API_KEY` in `.env`. Restart the kernel after changing `.env` if it was already loaded.

## Complete notebook example

```python
from dotenv import load_dotenv
from experiment_tracker import (
    ExperimentTracker,
    ExperimentTrackerError,
    ExperimentTrackerHTTPError,
)

load_dotenv()

try:
    tracker = ExperimentTracker()
    run = tracker.init("My project", "Notebook training")

    run.log_params({"learning_rate": 0.001, "epochs": 3})
    run.log_config({"optimizer": "Adam"})

    for epoch in range(1, 4):
        run.log_metrics(
            {"loss": 1.0 / epoch, "accuracy": min(0.99, 0.70 + epoch * 0.08)},
            step=epoch,
            epoch=epoch,
        )

    run.finish(status="completed")
    print(f"Created run: {run.id}")
except ExperimentTrackerHTTPError as exc:
    print(f"Experiment server error {exc.status}: {exc.response}")
except ExperimentTrackerError as exc:
    print(f"Experiment SDK error: {exc}")
    raise
