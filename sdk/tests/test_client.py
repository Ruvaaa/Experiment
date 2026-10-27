import unittest
from unittest.mock import patch

from experiment_tracker.client import ExperimentTracker, ExperimentTrackerError


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        import json
        return json.dumps(self.payload).encode("utf-8")


class ClientTests(unittest.TestCase):
    def test_requires_api_key(self):
        with patch.dict("os.environ", {"EXPERIMENT_TRACKER_API_KEY": ""}, clear=False):
            with self.assertRaises(ExperimentTrackerError):
                ExperimentTracker(api_key=None)

    def test_run_batches_and_finishes(self):
        tracker = ExperimentTracker(api_key="exp_" + "a" * 64, base_url="https://example.test")
        responses = iter([
            {"run": {"id": "run-1"}},
            {},
            {},
            {},
        ])
        with patch("experiment_tracker.client.request.urlopen", side_effect=lambda *_args, **_kwargs: FakeResponse(next(responses))):
            run = tracker.init("project-name", "baseline")
            run.log_params({"learning_rate": 0.01})
            run.log_metrics({"accuracy": 0.95}, step=1)
            run.flush()
            run.finish(final_metrics={"accuracy": 0.95})
        self.assertEqual(run.id, "run-1")

    def test_validates_full_api_key_format(self):
        with self.assertRaises(ExperimentTrackerError):
            ExperimentTracker(api_key="exp_abc")
        ExperimentTracker(api_key="exp_" + "a" * 64)

    def test_init_accepts_stable_client_event_id(self):
        tracker = ExperimentTracker(api_key="exp_" + "a" * 64, base_url="https://example.test")
        with patch("experiment_tracker.client.request.urlopen", return_value=FakeResponse({"run": {"id": "run-1"}})) as urlopen:
            tracker.init("ignored", "baseline", client_event_id="run-attempt-1")
        request = urlopen.call_args.args[0]
        import json
        payload = json.loads(request.data.decode("utf-8"))
        self.assertEqual(payload["client_event_id"], "run-attempt-1")


if __name__ == "__main__":
    unittest.main()
