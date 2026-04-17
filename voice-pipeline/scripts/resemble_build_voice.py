#!/usr/bin/env python3
"""
Trigger Resemble voice training via:
POST /api/v2/voices/{uuid}/build

Required environment variables:
- RESEMBLE_API_KEY
- RESEMBLE_VOICE_UUID
"""

import argparse
import os
import sys
import time

import requests


def require_env(name: str) -> str:
  value = os.getenv(name, "").strip()
  if not value:
    raise ValueError(f"Missing required environment variable: {name}")
  return value


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description="Start Resemble voice build/training.")
  parser.add_argument(
    "--fill",
    action="store_true",
    help="Enable fill/speech-to-speech training.",
  )
  parser.add_argument(
    "--api-base",
    default=os.getenv("RESEMBLE_API_BASE", "https://app.resemble.ai/api/v2"),
    help="Resemble API base URL.",
  )
  parser.add_argument(
    "--wait",
    action="store_true",
    help="Poll voice status until finished/failed or timeout.",
  )
  parser.add_argument(
    "--poll-interval",
    type=int,
    default=10,
    help="Polling interval in seconds when --wait is set.",
  )
  parser.add_argument(
    "--timeout",
    type=int,
    default=1800,
    help="Maximum wait time in seconds when --wait is set.",
  )
  return parser.parse_args()


def main() -> int:
  args = parse_args()

  try:
    api_key = require_env("RESEMBLE_API_KEY")
    voice_uuid = require_env("RESEMBLE_VOICE_UUID")
    api_base = args.api_base.rstrip("/")
    url = f"{api_base}/voices/{voice_uuid}/build"

    response = requests.post(
      url,
      headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
      },
      json={"fill": bool(args.fill)},
      timeout=30,
    )
    response.raise_for_status()
    payload = response.json()

    if payload.get("success"):
      print("Voice build started successfully.")
      print(payload)
      if args.wait:
        return wait_for_training(
          api_key=api_key,
          api_base=api_base,
          voice_uuid=voice_uuid,
          interval_seconds=max(1, args.poll_interval),
          timeout_seconds=max(1, args.timeout),
        )
      return 0

    print("Voice build request returned a non-success response.")
    print(payload)
    return 1
  except Exception as exc:
    print(f"An error occurred: {exc}")
    return 1


def wait_for_training(api_key: str, api_base: str, voice_uuid: str, interval_seconds: int, timeout_seconds: int) -> int:
  url = f"{api_base}/voices/{voice_uuid}"
  started_at = time.time()

  while True:
    if time.time() - started_at > timeout_seconds:
      print(f"Timed out waiting for training after {timeout_seconds} seconds.")
      return 1

    response = requests.get(
      url,
      headers={"Authorization": f"Bearer {api_key}"},
      timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    status = extract_status(payload)
    print(f"Current status: {status}")

    if status == "finished":
      print("Voice training finished.")
      return 0

    if status in {"failed", "error", "cancelled"}:
      print("Voice training did not complete successfully.")
      print(payload)
      return 1

    time.sleep(interval_seconds)


def extract_status(payload):
  if isinstance(payload, dict):
    if isinstance(payload.get("status"), str):
      return payload["status"].strip().lower()
    for key in ("voice", "data", "item"):
      nested = payload.get(key)
      if isinstance(nested, dict) and isinstance(nested.get("status"), str):
        return nested["status"].strip().lower()
  return "unknown"


if __name__ == "__main__":
  sys.exit(main())
