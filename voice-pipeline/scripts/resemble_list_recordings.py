#!/usr/bin/env python3
"""
List recordings for a Resemble voice.

Required environment variables:
- RESEMBLE_API_KEY
- RESEMBLE_VOICE_UUID (or pass --voice-uuid)
"""

import argparse
import os
import sys

import requests


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="List recordings for a Resemble voice.")
    parser.add_argument(
        "--voice-uuid",
        default=os.getenv("RESEMBLE_VOICE_UUID", "").strip(),
        help="Voice UUID. Defaults to RESEMBLE_VOICE_UUID.",
    )
    parser.add_argument(
        "--api-base",
        default=os.getenv("RESEMBLE_API_BASE", "https://app.resemble.ai/api/v2"),
        help="Resemble API base URL.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        api_key = require_env("RESEMBLE_API_KEY")
        voice_uuid = args.voice_uuid.strip()
        if not voice_uuid:
            raise ValueError("Missing voice UUID. Set RESEMBLE_VOICE_UUID or pass --voice-uuid.")

        url = f"{args.api_base.rstrip('/')}/voices/{voice_uuid}/recordings"
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
        print(payload)
        return 0
    except Exception as exc:
        print(f"An error occurred: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
