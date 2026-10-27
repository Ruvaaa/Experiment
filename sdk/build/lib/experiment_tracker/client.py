from __future__ import annotations

import os
import time
import uuid
from typing import Any, Mapping
from urllib import error, request
import json
import math


class ExperimentTrackerError(RuntimeError):
    pass


class ExperimentTrackerHTTPError(ExperimentTrackerError):
    def __init__(self, message, status=None, response=None):
        super().__init__(message)
        self.status = status
        self.response = response


class Run:
    def __init__(self, client: "ExperimentTracker", run_id: str):
        self.client = client
        self.id = run_id
        self._metric_batch: list[dict[str, Any]] = []
        self._step = 0

    def log_params(self, params: Mapping[str, Any]) -> None:
        if not isinstance(params, Mapping):
            raise TypeError("params must be a mapping")
        self.client._request("PATCH", f"/runs/{self.id}", {"hyperparameters": dict(params)})

    def log_config(self, config: Mapping[str, Any]) -> None:
        if not isinstance(config, Mapping):
            raise TypeError("config must be a mapping")
        self.client._request("PATCH", f"/runs/{self.id}", {"model_config": dict(config)})

    def log_metrics(self, metrics: Mapping[str, int | float], step: int | None = None, epoch: int | None = None, batch_size: int = 100, recorded_at: str | None = None) -> None:
        if not isinstance(metrics, Mapping):
            raise TypeError("metrics must be a mapping")
        numeric = {}
        for name, value in metrics.items():
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                raise ValueError(f"Metric {name!r} must be a finite number")
            if step is not None and (isinstance(step, bool) or not isinstance(step, int) or step < 0):
                raise ValueError("step must be a non-negative integer")
            numeric[str(name)] = value
        if epoch is not None and (isinstance(epoch, bool) or not isinstance(epoch, int) or epoch < 0):
            raise ValueError("epoch must be a non-negative integer")
        point = {"step": step if step is not None else self._step, "metrics": numeric}
        if epoch is not None:
            point["epoch"] = epoch
        if recorded_at is not None:
            point["recorded_at"] = recorded_at
        point["client_event_id"] = str(uuid.uuid4())
        self._metric_batch.append(point)
        if step is None:
            self._step += 1
        if len(self._metric_batch) >= batch_size:
            self.flush()

    def flush(self) -> None:
        if not self._metric_batch:
            return
        batch = list(self._metric_batch)
        self.client._request("POST", f"/runs/{self.id}/metrics", {"points": batch})
        self._metric_batch = self._metric_batch[len(batch):]

    def update_status(self, status: str, error_message: str | None = None) -> None:
        if status not in {"queued", "running", "completed", "failed", "cancelled"}:
            raise ValueError("Invalid run status")
        payload: dict[str, Any] = {"status": status}
        if error_message:
            payload["error_message"] = error_message
        self.client._request("PATCH", f"/runs/{self.id}/status", payload)

    def finish(self, status: str = "completed", final_metrics: Mapping[str, int | float] | None = None, error_message: str | None = None) -> None:
        self.flush()
        if status not in {"completed", "failed", "cancelled"}:
            raise ValueError("Finish status must be completed, failed, or cancelled")
        payload: dict[str, Any] = {"status": status}
        if final_metrics is not None:
            payload["final_metrics"] = dict(final_metrics)
        if error_message:
            payload["error_message"] = error_message
        self.client._request("POST", f"/runs/{self.id}/finish", payload)


class ExperimentTracker:
    def __init__(self, api_key: str | None = None, base_url: str | None = None, timeout: float = 15, max_retries: int = 3):
        self.api_key = api_key or os.getenv("EXPERIMENT_TRACKER_API_KEY")
        if not self.api_key:
            raise ExperimentTrackerError("Set api_key or EXPERIMENT_TRACKER_API_KEY")
        if not isinstance(self.api_key, str) or len(self.api_key) != 68 or not self.api_key.startswith("exp_") or any(c not in "0123456789abcdef" for c in self.api_key[4:]):
            raise ExperimentTrackerError("Invalid API key format: expected exp_ followed by 64 lowercase hexadecimal characters")
        self.base_url = (base_url or os.getenv("EXPERIMENT_TRACKER_URL") or "http://localhost:54321/functions/v1/experiment-ingest").rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries

    def init(self, project: str, name: str, client_event_id: str | None = None) -> Run:
        del project  # The API key is bound to exactly one project; project is retained for SDK compatibility.
        return Run(self, self._create_run(name, client_event_id))

    def _create_run(self, experiment_name: str, client_event_id: str | None = None) -> str:
        result = self._request("POST", "/runs", {
            "experiment_name": experiment_name,
            "status": "running",
            "client_event_id": client_event_id or str(uuid.uuid4()),
            "hyperparameters": {},
        })
        return str(result["run"]["id"])

    def _request(self, method: str, path: str, payload: Mapping[str, Any]) -> dict[str, Any]:
        url = self.base_url + path
        body = json.dumps(payload).encode("utf-8")
        headers = {"Content-Type": "application/json", "X-API-Key": self.api_key}
        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            req = request.Request(url, data=body, headers=headers, method=method)
            try:
                with request.urlopen(req, timeout=self.timeout) as response:
                    data = response.read()
                    return json.loads(data.decode("utf-8")) if data else {}
            except error.HTTPError as exc:
                detail = exc.read().decode("utf-8", errors="replace")
                response_data = None
                try:
                    response_data = json.loads(detail)
                except json.JSONDecodeError:
                    pass
                if exc.code < 500 and exc.code != 429:
                    raise ExperimentTrackerHTTPError(f"Request failed ({exc.code}): {detail}", exc.code, response_data) from exc
                last_error = exc
                if exc.code == 429:
                    retry_after = exc.headers.get("Retry-After")
                    if retry_after:
                        try:
                            time.sleep(max(0, int(retry_after)))
                            continue
                        except ValueError:
                            pass
            except (error.URLError, TimeoutError) as exc:
                last_error = exc
            if attempt < self.max_retries:
                time.sleep(min(0.5 * (2 ** attempt), 4))
        raise ExperimentTrackerError(f"Request failed after {self.max_retries + 1} attempts: {last_error}")
