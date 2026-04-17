#!/usr/bin/env python3
"""
Create an empty Resemble voice (Method 2 flow).

Required environment variables:
- RESEMBLE_API_KEY
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
    parser = argparse.ArgumentParser(description="Create a new Resemble voice.")
    parser.add_argument("--name", required=True, help="Voice display name, e.g. Alex.")
    parser.add_argument(
        "--voice-type",
        default="rapid",
        choices=["rapid", "professional"],
        help="Voice type.",
    )
    parser.add_argument(
        "--callback-uri",
        default=os.getenv("RESEMBLE_CALLBACK_URI", "").strip(),
        help="Optional callback/webhook URL.",
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
        url = f"{args.api_base.rstrip('/')}/voices"
        payload = {
            "name": args.name,
            "voice_type": args.voice_type,
        }

        if args.callback_uri.strip():
            payload["callback_uri"] = args.callback_uri.strip()

        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        voice_uuid = data.get("uuid") or data.get("id")
        print("Voice created successfully.")
        print(data)
        if voice_uuid:
            print(f"VOICE UUID: {voice_uuid}")
        return 0
    except Exception as exc:
        print(f"An error occurred: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
