#!/usr/bin/env python3
"""
List voices from the Resemble API.

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
    parser = argparse.ArgumentParser(description="List Resemble voices.")
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
