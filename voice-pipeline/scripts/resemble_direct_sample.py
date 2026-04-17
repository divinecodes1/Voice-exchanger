#!/usr/bin/env python3
"""
Resemble AI create_direct sample using environment variables.

Required environment variables:
- RESEMBLE_API_KEY
- RESEMBLE_PROJECT_UUID
- RESEMBLE_VOICE_UUID
"""

import argparse
import base64
import os
import sys

from resemble import Resemble


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Synthesize speech with Resemble create_direct.")
    parser.add_argument(
        "--text",
        default="Hello, this is synthesized with Resemble create_direct.",
        help="Text or SSML content to synthesize.",
    )
    parser.add_argument(
        "--title",
        default="Direct Syn test",
        help="Clip title.",
    )
    parser.add_argument(
        "--precision",
        default="PCM_16",
        help="Audio precision, e.g. PCM_16.",
    )
    parser.add_argument(
        "--output-format",
        default="wav",
        help="Output format, e.g. wav or mp3.",
    )
    parser.add_argument(
        "--sample-rate",
        type=int,
        default=48000,
        help="Sample rate in Hz.",
    )
    parser.add_argument(
        "--out",
        default="resemble_direct_output.wav",
        help="Output file path.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        api_key = require_env("RESEMBLE_API_KEY")
        project_uuid = require_env("RESEMBLE_PROJECT_UUID")
        voice_uuid = require_env("RESEMBLE_VOICE_UUID")

        Resemble.api_key(api_key)

        response = Resemble.v2.clips.create_direct(
            project_uuid=project_uuid,
            voice_uuid=voice_uuid,
            data=args.text,
            title=args.title,
            precision=args.precision,
            output_format=args.output_format,
            sample_rate=args.sample_rate,
        )

        if not response.get("success"):
            print("Synthesis failed")
            print(response)
            return 1

        audio_content = response.get("audio_content")
        if not audio_content:
            print("Synthesis succeeded but audio_content is missing.")
            print(response)
            return 1

        audio_bytes = base64.b64decode(audio_content)
        with open(args.out, "wb") as f:
            f.write(audio_bytes)

        print("Synthesis successful")
        print(f"Saved audio to: {args.out}")
        return 0
    except Exception as exc:
        print(f"An error occurred: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
