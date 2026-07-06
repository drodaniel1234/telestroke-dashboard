# Telestroke Quality Metric Extraction & Linked Evidence Dashboard

A prototype exploring whether an LLM can reliably turn unstructured telestroke consult notes into structured, auditable stroke quality metrics — with every extracted field traceable back to the exact source text it came from.

This tool is built for stroke program managers and quality coordinators who currently do manual chart abstraction — it automates pulling structured quality metrics out of consult notes. The dictation feature is a separate input method intended for clinicians at the point of care. It is not yet a real-time clinical decision support tool; it structures documentation of decisions already made, for reporting and audit purposes.

## The problem

Stroke quality metrics — last known well, door-to-needle time, thrombectomy decisions, reperfusion scores — currently get abstracted manually from free-text consult notes. Physicians write these times in wildly inconsistent formats (`14:58`, `2:58pm`, `1440`, "around 3 in the afternoon") in the same chart, which makes the abstraction slower still.

As stroke and telestroke volumes grow, this manual work increasingly competes with direct patient care for the same limited coordinator and nursing time. This project extends an idea from a system-wide telestroke AI initiative I led at Sutter Health, which automated quality metric tracking and measurably saved up to 40 hours per month of manual chart review for one program. This prototype explores the same core idea — LLM-based extraction in place of manual abstraction — built independently from scratch with synthetic data, plus a verifiability layer (linked evidence) that the original initiative didn't have.

This project automates that extraction, and treats hallucination risk as a first-class concern: every extracted field is backed by a verbatim quote from the source note, and the app visually highlights that exact text so a reviewer can verify the claim at a glance rather than trusting a black box.

## What it does

<img width="800" height="438" alt="quality-metric-extraction-pipeline" src="https://github.com/user-attachments/assets/05e2148a-43ea-41d3-8c55-e8d97906c406" />


- **Extraction** — paste or dictate a consult note, and it pulls 10 structured fields (last known well, arrival, NIHSS, tPA administration, thrombectomy decision, TICI score, destination, etc.), each backed by a verbatim quote from the note.
- **Linked evidence** — hover or click any extracted field and the exact supporting text lights up in the original note.
- **Time normalization** — physicians write timestamps inconsistently; the model normalizes every time to 24-hour format regardless of how it was originally written, and derived timing metrics (door-to-needle, door-to-puncture, onset-to-treatment) are calculated automatically from the normalized values.
- **Dictation** — speak a note using the browser's built-in speech-to-text, with an LLM cleanup pass afterward to catch mishearings of clinical terms (e.g. "and H triple S" → "NIHSS").
- **Case dashboard** — every extraction logs to a running dashboard, echoing the "system-wide tracking" value of the underlying clinical use case this is modeled on.

## Why this framing

This mirrors the trust principle behind ambient clinical documentation more broadly: don't just generate an answer, show the evidence behind it. Here that principle is applied one step downstream — from note generation to structured quality-metric extraction.

## Sample cases

Eight synthetic consult notes are built in, deliberately covering distinct clinical and documentation scenarios:

| Case | Scenario |
|---|---|
| A | LVO with thrombectomy transfer |
| B | Subarachnoid hemorrhage, direct admit |
| C | Incomplete/ambiguous documentation (stress test) |
| D | Mixed time formats in one note (stress test) |
| E | Outside the tPA window, no intervention |
| F | Extended-window tPA via CT perfusion mismatch |
| G | Wake-up stroke, MRI DWI-FLAIR mismatch (last-known-well vs. discovery-time disambiguation) |
| H | tPA withheld for anticoagulation, not timing — while thrombectomy is still pursued |

All hospital names and patient details are fictional. No real patient data was used anywhere in this project.

## Tech stack

- React + Vite
- Anthropic API (Claude) for extraction and ASR cleanup
- Browser-native Web Speech API for dictation (no external transcription service)
- `localStorage` for case history persistence

## Running it locally

1. Clone the repo and install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and add your own Anthropic API key:
   ```
   VITE_ANTHROPIC_API_KEY=sk-ant-...
   ```
   Get a key at [console.anthropic.com](https://console.anthropic.com).
3. Start the dev server:
   ```
   npm run dev
   ```
4. Open the local URL it prints (typically `http://localhost:5173`).

**Note:** this calls the Anthropic API directly from the browser, which is fine for local/personal use but exposes the API key in client-side code. It is not set up for public deployment as-is — that would require routing calls through a small backend proxy instead.

## Status

Actively in progress. Built starting from a Claude.ai-generated prototype and converted into a standalone project using Claude Code.

## 🧩 The Stroke Copilot Ecosystem
This dashboard is designed as a modular component within a broader, zero-duplicate-entry clinical pipeline aimed at minimizing cognitive load and administrative waste during acute stroke codes:

1. **Real-Time Capture:** Bedside metrics are logged instantly via the *Stroke Time Tracker*.
2. **Clinical Decision Support:** Modules like the *Telestroke IVT Assistant* process clinical inputs against rigid safety constraints (e.g., 14-day neurosurgery hard stops).
3. **Automated Extraction (This Tool):** Once the telestroke note is finalized, this dashboard seamlessly sweeps the unstructured text to abstract structured quality metrics for hospital reporting—fully backed by verifiable source-text tracing.

Ultimately, these standalone modules are intended to integrate into a unified, ambient AI command center for telestroke workflows.

## Disclaimer
This repository contains experimental prototype code intended solely for research, demonstration, and educational purposes. It is not an FDA-cleared medical device, nor is it a substitute for independent clinical judgment. All final clinical determinations remain the strict responsibility of the treating physician. Do not use this software for direct patient care.
