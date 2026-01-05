# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.0] - 2026-01-05

### Added

- End-to-end “viral video engine” workflow: image analysis → storyboard → video clips → audio → final stitching.
- Next.js UI to create jobs (image upload + style/genre/language/audio/scene count) and track status/logs.
- Human-in-the-loop approvals for storyboard and video phases.
- Provider integrations:
  - xAI Grok for vision analysis and prompt generation (and image generation fallback).
  - Fal for storyboard image generation (Flux / PuLID) and per-scene video generation (Kling).
  - ElevenLabs voiceover generation (binary → uploaded and returned as URL).
  - FFmpeg stitching pipeline via `fluent-ffmpeg`.
- Optional Supabase persistence for jobs + storage uploads (with an in-memory/mock fallback when not configured).

### Changed

- Minimal black & white UI styling and improved workflow UX.
- Environment variables standardized to `NEXT_PUBLIC_*` names.
- Text overlay made optional in the generation workflow.

### Fixed

- Grok JSON parsing robustness and Grok image generation request issues.
- Fal client configuration/runtime crash issues.
- General workflow reliability improvements and error logging.
