import React, { useState, useEffect, useMemo, useRef } from "react";

// ---------- Anthropic API config ----------
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = "claude-sonnet-5";

// ---------- design tokens ----------
const C = {
  bg: "#10141B",
  panel: "#171D26",
  panelAlt: "#1D2430",
  border: "#2A3340",
  text: "#EDEFF3",
  textDim: "#8B94A5",
  textFaint: "#5A6272",
  accent: "#3ED9CB",      // cyan - evidence / primary
  accentDim: "#1F4E4C",
  amber: "#F2A94E",       // urgent / timing
  amberDim: "#4A3A20",
  red: "#E8664F",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  sans: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
};

// ---------- field schema ----------
const FIELDS = [
  { key: "lkw", label: "Last Known Well", group: "timing" },
  { key: "arrival", label: "ED Arrival", group: "timing" },
  { key: "nihss", label: "NIHSS at Presentation", group: "clinical" },
  { key: "ct_completed", label: "CT Completed", group: "timing" },
  { key: "tpa", label: "tPA Administered", group: "timing" },
  { key: "thrombectomy_decision", label: "Thrombectomy Decision", group: "clinical" },
  { key: "groin_puncture", label: "Groin Puncture", group: "timing" },
  { key: "tici", label: "Reperfusion (TICI)", group: "clinical" },
  { key: "destination", label: "Destination Hospital", group: "clinical" },
  { key: "transfer_initiated", label: "Transfer Initiated", group: "timing" },
];

// ---------- sample synthetic notes (fictional site names, no real data) ----------
const SAMPLE_NOTES = [
  {
    id: "sample1",
    title: "Case A — LVO, thrombectomy transfer",
    text: `Telestroke consult, North Bay Medical Center ED.
Patient last known well at 14:05 per spouse, found down at 14:40, EMS called immediately.
ED arrival 14:58. Code stroke activated on arrival.
Bedside NIHSS on presentation: 17 (right gaze deviation, left hemiplegia, left hemineglect).
Non-contrast CT head completed 15:11, no hemorrhage. CTA obtained showing right MCA M1 occlusion.
tPA administered at 15:22 given ASPECTS 9 and no contraindications.
Given confirmed LVO, thrombectomy indicated. Patient not a candidate for thrombectomy at North Bay (no neurointerventional coverage on-site).
Transfer to Riverside Regional (comprehensive stroke center) initiated at 15:35 given active thrombectomy capability.
Groin puncture at Riverside Regional 16:40.
Post-procedure TICI 2c achieved.`,
  },
  {
    id: "sample2",
    title: "Case B — SAH, direct admit",
    text: `Telestroke consult requested, Coastline Community Hospital.
Sudden onset "worst headache of life" witnessed by family at 09:15, patient remained conscious.
Arrived to ED 09:47.
NIHSS 2 on presentation (mild photophobia, neck stiffness, otherwise nonfocal).
CT head without contrast completed at 10:02, findings concerning for subarachnoid hemorrhage, diffuse in the basal cisterns.
tPA not administered — hemorrhage identified on imaging, contraindicated.
Thrombectomy not applicable, no large vessel occlusion identified.
Given SAH, patient meets criteria for direct transfer to Cedar Ridge Neuroscience Center per current routing protocol.
Transfer initiated 10:20 to Cedar Ridge Neuroscience Center, the designated SAH receiving site this week.`,
  },
  {
    id: "sample3",
    title: "Case C — incomplete documentation (stress test)",
    text: `Code stroke, Highline Medical Center.
Time of onset unclear, patient found by neighbor, unclear how long down.
EMS transport, arrival to ED approximately 21:10 per triage note (exact time not documented in chart).
NIHSS 9 obtained by tele-exam.
CT head completed, read as no acute hemorrhage.
Team discussing candidacy for tPA given unclear onset window. Neurology recommends against thrombolysis given unwitnessed onset outside reliable window.
No thrombectomy discussion documented in available note.
Plan: admit locally for further workup pending additional collateral history.`,
  },
  {
    id: "sample4",
    title: "Case D — mixed time formats (stress test)",
    text: `Telestroke consult, Foothill General ED.
Patient last known well at approximately 2:10pm per husband.
Arrived to ED 1440.
NIHSS 12 on tele-exam, right facial droop and expressive aphasia.
CT head w/o contrast completed 2:55 PM, no hemorrhage. CTA shows left M1 occlusion.
tPA given 15:07 after discussion of risks/benefits with family.
Thrombectomy indicated given confirmed LVO; Foothill General does not have neurointerventional capability on site.
Transfer to Riverside Regional initiated around 3:15 in the afternoon.
Groin puncture 1610 at Riverside Regional.
TICI 3 achieved post-procedure.`,
  },
  {
    id: "sample5",
    title: "Case E — outside tPA window, no intervention",
    text: `Telestroke consult, Meadowbrook Regional ED.
Patient last known well at 06:30 per daughter, who spoke with him by phone before he went to bed.
Symptoms noted by family on a wellness check at 11:45, EMS called immediately.
Arrival to ED 12:20.
NIHSS 6 on presentation (mild right facial droop, mild right arm drift, mild dysarthria).
CT head without contrast completed 12:38, no hemorrhage, no early ischemic changes. CTA shows no large vessel occlusion.
Time last known well to arrival exceeds 4.5 hour tPA window; tPA not administered given time elapsed since last known well.
No large vessel occlusion identified, thrombectomy not indicated.
Plan: admit for medical management, stroke workup, and secondary prevention. No transfer indicated; capability available locally.`,
  },
  {
    id: "sample6",
    title: "Case F — extended-window tPA, perfusion mismatch",
    text: `Telestroke consult, Ashford Valley Medical Center ED.
Patient last known well at 09:00 per coworker, symptoms noted at 09:00 as well (witnessed onset, no wake-up component).
Arrival to ED 15:50, outside the standard 4.5 hour tPA window.
NIHSS 11 on presentation (left facial droop, left arm and leg weakness, dysarthria).
CT head without contrast completed 16:05, no hemorrhage. CTA shows no large vessel occlusion.
CT perfusion obtained given time from last known well exceeds 4.5 hours: ischemic core volume 9 mL, penumbra (Tmax >6s) volume 96 mL, mismatch ratio 4.3, consistent with a favorable core-penumbra mismatch profile.
Given favorable CT perfusion mismatch, patient meets extended-window IV thrombolysis criteria; risks and benefits discussed with patient and family.
tPA administered at 16:20 despite time from last known well exceeding the standard 4.5 hour window, per extended-window protocol based on perfusion imaging.
No large vessel occlusion identified; thrombectomy not indicated.
Plan: admit for post-tPA monitoring, no transfer indicated, capability available locally.`,
  },
  {
    id: "sample7",
    title: "Case G — wake-up stroke, MRI mismatch",
    text: `Telestroke consult, Pinebrook Community Hospital ED.
Patient last seen normal and asymptomatic at 22:30 when he went to bed, per wife.
Wife found him unable to move his right arm with slurred speech on waking at 06:15; exact time of symptom onset unknown, consistent with wake-up stroke.
EMS called immediately, arrival to ED 06:52.
NIHSS 8 on presentation (right arm weakness, dysarthria, mild right facial droop).
CT head without contrast completed 07:05, no hemorrhage. CTA shows no large vessel occlusion.
Given unknown exact onset time, standard time-based tPA window does not apply. MRI obtained emergently per wake-up stroke protocol.
MRI diffusion-weighted imaging shows acute infarct with no corresponding FLAIR hyperintensity (DWI-FLAIR mismatch), suggesting stroke onset likely within the last 4.5 hours.
Given favorable DWI-FLAIR mismatch, patient meets criteria for tPA despite unknown exact onset time, per wake-up stroke imaging-based selection protocol.
tPA administered at 07:40.
No large vessel occlusion identified; thrombectomy not indicated.
Plan: admit for post-tPA monitoring, no transfer indicated, capability available locally.`,
  },
  {
    id: "sample8",
    title: "Case H — tPA withheld for anticoagulation, not timing",
    text: `Telestroke consult, Copper Creek Medical Center ED.
Patient last known well at 10:40 per husband, witnessed onset.
Arrival to ED 11:15, well within the standard 4.5 hour tPA window.
NIHSS 14 on presentation (left gaze preference, right hemiplegia, global aphasia).
Medication reconciliation confirms patient takes apixaban 5 mg twice daily for atrial fibrillation; last dose per husband taken at 08:00 this morning, approximately 3 hours prior to arrival.
CT head without contrast completed 11:28, no hemorrhage. CTA shows left M1 occlusion.
Given therapeutic anticoagulation with apixaban within the last dosing interval and no rapid means to quantify anticoagulant effect on site, tPA is contraindicated; tPA not administered due to recent DOAC use rather than time from onset.
Given confirmed LVO, thrombectomy indicated; recent DOAC use is not a contraindication to mechanical thrombectomy.
Copper Creek does not have neurointerventional capability on site.
Transfer to Riverside Regional initiated at 11:40 for thrombectomy.
Groin puncture at Riverside Regional 12:35.
TICI 2b achieved post-procedure.`,
  },
];

const TIMING_KEYS = ["lkw", "arrival", "ct_completed", "tpa", "groin_puncture", "transfer_initiated"];

const SYSTEM_PROMPT = `You are a clinical data extraction engine for telestroke quality metrics. You will be given a single synthetic (non-real, de-identified) stroke consult note.

Extract the following fields if present in the note: lkw (last known well time), arrival (ED arrival time), nihss (NIHSS score/description at presentation), ct_completed (time CT was completed), tpa (tPA administration time, or reason not given), thrombectomy_decision (whether thrombectomy was pursued and why/why not), groin_puncture (groin puncture time if applicable), tici (reperfusion/TICI score if applicable), destination (destination or receiving hospital name), transfer_initiated (time transfer was initiated, if applicable).

For each field, if the information is present in the note, return "value" as a short clean answer exactly as it would be read (keep the original wording/format, e.g. "2:58 PM" or "14:58" or "approximately 3pm"), and "quote" as a VERBATIM substring copied EXACTLY character-for-character from the note that supports it (do not paraphrase the quote, do not alter punctuation or spacing). If a field is not mentioned in the note, return "value": null and "quote": null. Never invent a value that is not supported by the note text.

For the timing fields only (lkw, arrival, ct_completed, tpa, groin_puncture, transfer_initiated), ALSO return "time24": a normalized 24-hour "HH:MM" string, converting from whatever format the note used (12-hour with AM/PM, 24-hour military with or without a colon, or a written description like "quarter past 3 in the afternoon"). If the note does not state or clearly imply a specific clock time (e.g. only says "shortly after" or gives no time at all), set "time24" to null rather than guessing. For all non-timing fields (nihss, thrombectomy_decision, tici, destination), always set "time24" to null.

Respond with ONLY a raw JSON object, no markdown fences, no preamble, no explanation, in exactly this shape:
{"lkw":{"value":"","quote":"","time24":null},"arrival":{"value":"","quote":"","time24":null},"nihss":{"value":"","quote":"","time24":null},"ct_completed":{"value":"","quote":"","time24":null},"tpa":{"value":"","quote":"","time24":null},"thrombectomy_decision":{"value":"","quote":"","time24":null},"groin_puncture":{"value":"","quote":"","time24":null},"tici":{"value":"","quote":"","time24":null},"destination":{"value":"","quote":"","time24":null},"transfer_initiated":{"value":"","quote":"","time24":null}}`;

// ---------- time parsing for derived metrics ----------
function parseClockToMinutes(str) {
  if (!str) return null;
  const s = String(str).trim();
  // 24-hour with colon: 14:58, or 12-hour with AM/PM: 2:58 PM
  let m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ap = m[3] ? m[3].toUpperCase() : null;
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    if (h <= 23 && min <= 59) return h * 60 + min;
  }
  // bare military time without colon: 1440, 0958
  m = s.match(/\b([01]\d|2[0-3])([0-5]\d)\b/);
  if (m) {
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }
  return null;
}

function diffMinutes(aStr, bStr) {
  const a = parseClockToMinutes(aStr);
  const b = parseClockToMinutes(bStr);
  if (a === null || b === null) return null;
  let d = b - a;
  if (d < 0) d += 24 * 60; // crossed midnight
  return d;
}

// prefer the model-normalized time24, fall back to parsing the raw value
function fieldMinutes(fieldObj) {
  if (!fieldObj) return null;
  if (fieldObj.time24) {
    const m = parseClockToMinutes(fieldObj.time24);
    if (m !== null) return m;
  }
  return parseClockToMinutes(fieldObj.value);
}

function diffMinutesFromFields(fieldA, fieldB) {
  const a = fieldMinutes(fieldA);
  const b = fieldMinutes(fieldB);
  if (a === null || b === null) return null;
  let d = b - a;
  if (d < 0) d += 24 * 60;
  return d;
}

function fmtMin(m) {
  if (m === null || m === undefined) return "—";
  return `${m} min`;
}

// ---------- evidence highlighting ----------
function buildHighlightSegments(noteText, extraction) {
  if (!noteText) return [{ text: "", field: null }];
  const matches = [];
  FIELDS.forEach((f) => {
    const q = extraction?.[f.key]?.quote;
    if (q && q.length > 2) {
      const idx = noteText.indexOf(q);
      if (idx !== -1) matches.push({ start: idx, end: idx + q.length, field: f.key });
    }
  });
  matches.sort((a, b) => a.start - b.start);
  const segments = [];
  let cursor = 0;
  matches.forEach((m) => {
    if (m.start < cursor) return; // skip overlaps
    if (m.start > cursor) segments.push({ text: noteText.slice(cursor, m.start), field: null });
    segments.push({ text: noteText.slice(m.start, m.end), field: m.field });
    cursor = m.end;
  });
  if (cursor < noteText.length) segments.push({ text: noteText.slice(cursor), field: null });
  return segments;
}

// ---------- main component ----------
export default function TelestrokeDashboard() {
  const [noteText, setNoteText] = useState(SAMPLE_NOTES[0].text);
  const [activeSampleId, setActiveSampleId] = useState(SAMPLE_NOTES[0].id);
  const [extraction, setExtraction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeField, setActiveField] = useState(null);
  const [cases, setCases] = useState([]);
  const [storageReady, setStorageReady] = useState(false);
  const noteRef = useRef(null);

  // load dashboard history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("telestroke-cases");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setCases(parsed);
      }
    } catch (e) {
      // no existing data yet, that's fine
    } finally {
      setStorageReady(true);
    }
  }, []);

  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef(null);
  const dictationBaseRef = useRef("");

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  function startDictation() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }
    // dictation writes into the raw textarea, so drop out of the extracted/highlighted view
    setExtraction(null);
    setActiveField(null);
    setActiveSampleId(null);
    setError(null);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interim += transcript;
        }
      }
      setNoteText((prev) => {
        // prev may already include earlier finalized text from this session;
        // we rebuild from the base captured at start plus everything final + current interim
        return dictationBaseRef.current + finalTranscript + interim;
      });
    };

    recognition.onerror = (event) => {
      setError(
        event.error === "not-allowed"
          ? "Microphone permission was blocked. Check your browser's site settings and allow microphone access."
          : `Dictation error: ${event.error}`
      );
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setJustDictated(true);
    };

    dictationBaseRef.current = noteText ? noteText + " " : "";
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  function stopDictation() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  }

  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [justDictated, setJustDictated] = useState(false);

  const CLEANUP_SYSTEM_PROMPT = `You are correcting a raw speech-to-text transcript of a spoken stroke/telestroke consult note. Browser speech recognition frequently mishears clinical terminology, drug names, and numbers because it has no medical vocabulary model.

Your job: correct likely ASR mishearings of clinical terms based on context, while preserving the speaker's actual clinical content, structure, and meaning as closely as possible. Common things to watch for: stroke scale names and scores (e.g. "NIH stroke scale", "and a nurse", "and H triple S" -> "NIHSS"), drug names (e.g. "apixiban", "a pixaban" -> "apixaban"; "T-P-A" spoken out, "tissue plasminogen activator" -> "tPA"), imaging terms ("C-T-A", "cat scan" -> "CTA"/"CT" as appropriate, "M-1 occlusion" -> "M1 occlusion"), reperfusion grading ("ticky 2B", "T-I-C-I" -> "TICI"), and garbled clock times (e.g. "14 58" -> "14:58", "two fifty eight pm" -> "2:58 PM" if that is how it was clearly spoken).

Do not invent clinical content that was not said. Do not restructure sentences beyond what's needed to fix clear mishearings and add reasonable punctuation. If something is ambiguous and you are not confident it's a mishearing, leave it as-is rather than guessing.

Respond with ONLY the corrected note text. No preamble, no explanation, no markdown formatting.`;

  async function cleanupTranscript() {
    if (!noteText.trim()) return;
    if (!ANTHROPIC_API_KEY) {
      setError("No Anthropic API key configured. Add VITE_ANTHROPIC_API_KEY to .env and restart the dev server.");
      return;
    }
    setCleanupLoading(true);
    setError(null);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 1000,
          system: CLEANUP_SYSTEM_PROMPT,
          messages: [{ role: "user", content: noteText }],
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || `Request failed (${response.status})`);
      }
      const textBlock = (data.content || []).find((b) => b.type === "text");
      if (!textBlock) throw new Error("No response from model");
      setNoteText(textBlock.text.trim());
      setJustDictated(false);
    } catch (e) {
      setError("Cleanup failed. You can still edit the text manually below.");
    } finally {
      setCleanupLoading(false);
    }
  }

  const segments = useMemo(() => buildHighlightSegments(noteText, extraction), [noteText, extraction]);

  const derived = useMemo(() => {
    if (!extraction) return null;
    const dtn = diffMinutesFromFields(extraction.arrival, extraction.tpa);
    const dtp = diffMinutesFromFields(extraction.arrival, extraction.groin_puncture);
    const ott = diffMinutesFromFields(extraction.lkw, extraction.tpa);
    return { doorToNeedle: dtn, doorToPuncture: dtp, onsetToTreatment: ott };
  }, [extraction]);

  async function runExtraction() {
    if (!ANTHROPIC_API_KEY) {
      setError("No Anthropic API key configured. Add VITE_ANTHROPIC_API_KEY to .env and restart the dev server.");
      return;
    }
    setLoading(true);
    setError(null);
    setExtraction(null);
    setActiveField(null);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: noteText }],
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || `Request failed (${response.status})`);
      }
      const textBlock = (data.content || []).find((b) => b.type === "text");
      if (!textBlock) throw new Error("No response from model");
      const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setExtraction(parsed);

      const newCase = {
        id: `case-${Date.now()}`,
        timestamp: new Date().toISOString(),
        destination: parsed.destination?.value || "Unspecified",
        nihss: parsed.nihss?.value || "—",
        thrombectomy: parsed.thrombectomy_decision?.value || "—",
        preview: noteText.slice(0, 60).replace(/\n/g, " ") + "…",
      };
      const nextCases = [newCase, ...cases].slice(0, 25);
      setCases(nextCases);
      try {
        localStorage.setItem("telestroke-cases", JSON.stringify(nextCases));
      } catch (e) {
        // storage failure shouldn't block the demo
      }
    } catch (e) {
      setError("Extraction failed. Check connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function selectSample(sample) {
    setActiveSampleId(sample.id);
    setNoteText(sample.text);
    setExtraction(null);
    setActiveField(null);
    setError(null);
    setJustDictated(false);
  }

  return (
    <div
      style={{
        background: C.bg,
        color: C.text,
        fontFamily: C.sans,
        minHeight: "100%",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      {/* header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, letterSpacing: "0.12em", color: C.accent, fontFamily: C.mono, textTransform: "uppercase" }}>
            Telestroke Command Layer
          </span>
          <span style={{ fontSize: 11, color: C.textFaint, fontFamily: C.mono }}>· synthetic data only</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: "6px 0 4px" }}>Quality Metric Extraction &amp; Linked Evidence</h1>
        <p style={{ fontSize: 13, color: C.textDim, margin: 0, maxWidth: 640, lineHeight: 1.5 }}>
          Paste or select a stroke consult note. Extracted metrics are traced back to the exact
          source text they came from — click a metric to see where it was found.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        {/* left: intake */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
            {SAMPLE_NOTES.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSample(s)}
                style={{
                  fontSize: 11,
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: `1px solid ${activeSampleId === s.id ? C.accent : C.border}`,
                  background: activeSampleId === s.id ? C.accentDim : "transparent",
                  color: activeSampleId === s.id ? C.accent : C.textDim,
                  cursor: "pointer",
                  fontFamily: C.sans,
                }}
              >
                {s.title}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            {speechSupported ? (
              <button
                onClick={isRecording ? stopDictation : startDictation}
                style={{
                  fontSize: 11,
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: `1px solid ${isRecording ? C.red : C.border}`,
                  background: isRecording ? "rgba(232,102,79,0.15)" : "transparent",
                  color: isRecording ? C.red : C.textDim,
                  cursor: "pointer",
                  fontFamily: C.sans,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: isRecording ? C.red : C.textFaint,
                    display: "inline-block",
                    animation: isRecording ? "telestroke-pulse 1.1s infinite" : "none",
                  }}
                />
                {isRecording ? "Stop dictation" : "Dictate note"}
              </button>
            ) : (
              <span style={{ fontSize: 10.5, color: C.textFaint, fontFamily: C.mono }}>
                Dictation unsupported in this browser
              </span>
            )}
          </div>
          <style>{`@keyframes telestroke-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }`}</style>

          <div
            ref={noteRef}
            style={{
              fontFamily: C.mono,
              fontSize: 12.5,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: 14,
              minHeight: 260,
              maxHeight: 380,
              overflowY: "auto",
            }}
          >
            {extraction
              ? segments.map((seg, i) => (
                  <span
                    key={i}
                    style={{
                      background:
                        seg.field && seg.field === activeField
                          ? "rgba(242,169,78,0.35)"
                          : seg.field
                          ? "rgba(62,217,203,0.14)"
                          : "transparent",
                      borderBottom: seg.field ? `1px solid ${seg.field === activeField ? C.amber : C.accent}` : "none",
                      transition: "background 120ms ease",
                    }}
                  >
                    {seg.text}
                  </span>
                ))
              : (
                <textarea
                  value={noteText}
                  onChange={(e) => {
                    setNoteText(e.target.value);
                    setActiveSampleId(null);
                    setExtraction(null);
                    setJustDictated(false);
                  }}
                  style={{
                    width: "100%",
                    height: 300,
                    background: "transparent",
                    color: C.text,
                    border: "none",
                    outline: "none",
                    resize: "vertical",
                    fontFamily: C.mono,
                    fontSize: 12.5,
                    lineHeight: 1.7,
                  }}
                />
              )}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            {justDictated && !extraction && (
              <button
                onClick={cleanupTranscript}
                disabled={cleanupLoading || !noteText.trim()}
                style={{
                  background: cleanupLoading ? C.panelAlt : C.amberDim,
                  color: cleanupLoading ? C.textDim : C.amber,
                  border: `1px solid ${C.amber}`,
                  borderRadius: 7,
                  padding: "9px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: cleanupLoading ? "default" : "pointer",
                  fontFamily: C.sans,
                }}
              >
                {cleanupLoading ? "Cleaning up…" : "Clean up transcription"}
              </button>
            )}
            <button
              onClick={runExtraction}
              disabled={loading || !noteText.trim()}
              style={{
                background: loading ? C.panelAlt : C.accent,
                color: loading ? C.textDim : "#0B1310",
                border: "none",
                borderRadius: 7,
                padding: "9px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? "default" : "pointer",
                fontFamily: C.sans,
              }}
            >
              {loading ? "Extracting…" : "Extract quality metrics"}
            </button>
            {extraction && (
              <button
                onClick={() => {
                  setExtraction(null);
                  setActiveField(null);
                }}
                style={{
                  background: "transparent",
                  color: C.textDim,
                  border: `1px solid ${C.border}`,
                  borderRadius: 7,
                  padding: "9px 14px",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: C.sans,
                }}
              >
                Edit note
              </button>
            )}
            {error && <span style={{ fontSize: 12, color: C.red }}>{error}</span>}
          </div>
        </div>

        {/* right: extracted metrics */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", color: C.textFaint, textTransform: "uppercase", marginBottom: 10, fontFamily: C.mono }}>
            Extracted metrics
          </div>

          {!extraction && !loading && (
            <div style={{ color: C.textFaint, fontSize: 13, padding: "30px 4px" }}>
              Run extraction to populate structured fields with linked evidence.
            </div>
          )}

          {loading && (
            <div style={{ color: C.textDim, fontSize: 13, padding: "30px 4px" }}>Reading note…</div>
          )}

          {extraction && (
            <>
              <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
                {FIELDS.map((f) => {
                  const fieldObj = extraction[f.key];
                  const val = fieldObj?.value;
                  const hasEvidence = !!fieldObj?.quote;
                  const showsNormalized =
                    TIMING_KEYS.includes(f.key) &&
                    fieldObj?.time24 &&
                    val &&
                    !val.includes(fieldObj.time24);
                  return (
                    <div
                      key={f.key}
                      onMouseEnter={() => hasEvidence && setActiveField(f.key)}
                      onMouseLeave={() => setActiveField(null)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: 7,
                        background: activeField === f.key ? C.amberDim : C.panelAlt,
                        border: `1px solid ${activeField === f.key ? C.amber : "transparent"}`,
                        cursor: hasEvidence ? "pointer" : "default",
                      }}
                    >
                      <span style={{ fontSize: 12.5, color: C.textDim }}>{f.label}</span>
                      <span style={{ display: "flex", alignItems: "baseline", gap: 6, maxWidth: "58%" }}>
                        <span
                          style={{
                            fontSize: 12.5,
                            fontFamily: C.mono,
                            color: val ? C.text : C.textFaint,
                            textAlign: "right",
                          }}
                        >
                          {val || "not documented"}
                        </span>
                        {showsNormalized && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontFamily: C.mono,
                              color: C.accent,
                              background: C.accentDim,
                              borderRadius: 4,
                              padding: "1px 5px",
                            }}
                          >
                            {fieldObj.time24}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: 11, letterSpacing: "0.1em", color: C.textFaint, textTransform: "uppercase", marginBottom: 8, fontFamily: C.mono }}>
                Derived timing (auto-calculated)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Door-to-needle", value: derived?.doorToNeedle },
                  { label: "Door-to-puncture", value: derived?.doorToPuncture },
                  { label: "Onset-to-treatment", value: derived?.onsetToTreatment },
                ].map((d) => (
                  <div key={d.label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "10px 8px" }}>
                    <div style={{ fontSize: 10.5, color: C.textFaint, marginBottom: 4 }}>{d.label}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 15, color: C.amber, fontWeight: 600 }}>
                      {fmtMin(d.value)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* dashboard history */}
      <div style={{ marginTop: 16, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.1em", color: C.textFaint, textTransform: "uppercase", fontFamily: C.mono }}>
            System-wide case dashboard {storageReady ? "" : "(loading…)"}
          </span>
          <span style={{ fontSize: 11, color: C.textFaint, fontFamily: C.mono }}>{cases.length} case{cases.length === 1 ? "" : "s"} logged</span>
        </div>
        {cases.length === 0 ? (
          <div style={{ color: C.textFaint, fontSize: 13, padding: "10px 2px" }}>
            No cases extracted yet this session.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {cases.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px 160px 1fr",
                  gap: 10,
                  fontSize: 12,
                  padding: "8px 10px",
                  background: C.panelAlt,
                  borderRadius: 7,
                  alignItems: "center",
                }}
              >
                <span style={{ color: C.textDim, fontFamily: C.mono }}>{c.preview}</span>
                <span style={{ color: C.text }}>NIHSS {c.nihss}</span>
                <span style={{ color: C.accent }}>{c.destination}</span>
                <span style={{ color: C.textFaint, textAlign: "right" }}>
                  {new Date(c.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
