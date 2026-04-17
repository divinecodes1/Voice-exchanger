#!/usr/bin/env python3
"""
Upload a single recording to a Resemble voice (Method 2 flow).

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
    parser = argparse.ArgumentParser(description="Upload one recording to a Resemble voice.")
    parser.add_argument("--file", required=True, help="Path to audio file (wav recommended).")
    parser.add_argument("--name", required=True, help="Recording name, e.g. sample_01.")
    parser.add_argument("--text", required=True, help="Transcript for this recording.")
    parser.add_argument("--emotion", default="neutral", help="Emotion label.")
    parser.add_argument(
        "--voice-uuid",
        default=os.getenv("RESEMBLE_VOICE_UUID", "").strip(),
        help="Voice UUID. Defaults to RESEMBLE_VOICE_UUID.",
    )
    parser.add_argument(
        "--inactive",
        action="store_true",
        help="Upload as inactive recording (default is active).",
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
        with open(args.file, "rb") as input_file:
            files = {"file": input_file}
            data = {
                "name": args.name,
                "text": args.text,
                "emotion": args.emotion,
                "is_active": "false" if args.inactive else "true",
            }

            response = requests.post(
                url,
                headers={"Authorization": f"Bearer {api_key}"},
                files=files,
                data=data,
                timeout=60,
            )

        response.raise_for_status()
        payload = response.json()
        print("Recording uploaded successfully.")
        print(payload)
        return 0
    except Exception as exc:
        print(f"An error occurred: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
