/**
 * 🎙️ VOICE SCHEDULE PARSER (NLP ENGINE)
 * Context-Aware Productivity Assistant
 */

export const DAYS_MAP = {
  monday: "Mon", tue: "Tue", tuesday: "Tue", wed: "Wed", wednesday: "Wed",
  thu: "Thu", thursday: "Thu", fri: "Fri", friday: "Fri", sat: "Sat", saturday: "Sat",
  sun: "Sun", sunday: "Sun"
};

const GROUPS = {
  weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  weekends: ["Sat", "Sun"],
  daily: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  everyday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
};

/**
 * Normalizes time string to HH:mm (24h)
 * "9am" -> "09:00", "5pm" -> "17:00", "10" (start) -> "10:00", "6" (end) -> "18:00"
 */
function normalizeTime(timeStr, isEnd = false, startHour = null) {
  if (!timeStr) return null;
  const t = timeStr.toLowerCase().trim();

  // 1. Semantic Check
  if (t.includes("noon")) return "12:00";
  if (t.includes("midnight")) return "00:00";
  if (t.includes("morning")) return "09:00";
  if (t.includes("evening")) return "18:00";
  
  // Extract number and modifier (Normalize dots like a.m. to am)
  const cleanT = t.replace(/\./g, '');
  const match = cleanT.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!match) return null;

  let hour = parseInt(match[1]);
  const min = match[2] || "00";
  const modifier = match[3];

  if (modifier === "pm" && hour < 12) hour += 12;
  if (modifier === "am" && hour === 12) hour = 0;

  // Inference logic (e.g., "10 to 6")
  if (!modifier) {
    if (isEnd && startHour !== null) {
       // Heuristic: If end < start (e.g. 10 to 6), infer end is PM (+12)
       if (hour < startHour && hour <= 11) hour += 12;
    } else if (hour >= 1 && hour <= 8) {
       // Default 1-8 to PM if no context
       hour += 12;
    }
  }

  return `${hour.toString().padStart(2, '0')}:${min}`;
}

/**
 * Converts verbal numbers to digits (e.g., "ten" -> "10")
 * Vital for SpeechRecognition inconsistencies
 */
function wordsToDigits(text) {
  const map = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
    "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
    "ten": "10", "eleven": "11", "twelve": "12", "noon": "12", "midnight": "00"
  };
  let output = text;
  Object.keys(map).forEach(word => {
    output = output.replace(new RegExp(`\\b${word}\\b`, 'gi'), map[word]);
  });
  return output;
}

/**
 * Main NLP Parser
 * Transcript -> { startTime, endTime, days, label, priorityKeywords }
 * (Returns ONLY identified fields to avoid hardcoded placeholders)
 */
export function parseScheduleCommand(text) {
  const input = wordsToDigits(text.toLowerCase()).replace(/\./g, '');
  const result = { priorityKeywords: [] };

  // 1. IMPROVED TIME EXTRACTION (Decoupled Start/End)
  const startPatterns = [
    /start(?:ing|s)?\s*(?:at|from)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
    /from\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
    /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|until|till|-|and|through|2|for)/i
  ];
  
  const endPatterns = [
    /end(?:ing|s)?\s*(?:at|until|till)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
    /(?:to|until|till|-|and|through|2|for)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
    /until\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i
  ];

  let startRaw = null;
  for (const p of startPatterns) {
    const m = input.match(p);
    if (m) { startRaw = m[1]; break; }
  }

  let endRaw = null;
  for (const p of endPatterns) {
    const m = input.match(p);
    if (m) { endRaw = m[1]; break; }
  }

  if (startRaw) {
    result.startTime = normalizeTime(startRaw);
    if (endRaw) {
        const startHourInt = parseInt(result.startTime?.split(":")[0] || "0");
        result.endTime = normalizeTime(endRaw, true, startHourInt);
    }
  }

  // 2. EXTRACT PRIORITY BYPASS (Names/Keywords)
  // Phrasing: "allow mom and boss", "priority for team", "with jatin"
  const priorityPatterns = [
    /(?:allow|trust|with|priority for|bypass for)\s+([^,.-]+)/i,
    /including\s+([^,.-]+)/i
  ];
  
  for (const p of priorityPatterns) {
    const m = input.match(p);
    if (m) {
        // Split by 'and', 'with', or commas
        const rawItems = m[1].split(/\s+(?:and|with|,)\s+/);
        rawItems.forEach(item => {
            const clean = item.trim();
            if (clean && clean.length > 1 && clean.length < 15) {
                result.priorityKeywords.push(clean.charAt(0).toUpperCase() + clean.slice(1));
            }
        });
    }
  }

  // 3. EXTRACT DAYS (Explicit extraction only)
  let identifiedDays = [];
  if (input.includes("monday to friday") || input.includes("weekdays")) {
    identifiedDays = GROUPS.weekdays;
  } else if (input.includes("weekend")) {
    identifiedDays = GROUPS.weekends;
  } else if (input.includes("daily") || input.includes("every day") || input.includes("everyday")) {
    identifiedDays = GROUPS.daily;
  } else {
    // Check for individual days
    Object.keys(DAYS_MAP).forEach(dayKey => {
      const regex = new RegExp(`\\b${dayKey}\\b`, 'i');
      if (regex.test(input)) {
        if (!identifiedDays.includes(DAYS_MAP[dayKey])) identifiedDays.push(DAYS_MAP[dayKey]);
      }
    });
  }
  if (identifiedDays.length > 0) result.days = identifiedDays;

  // 4. LABEL HEURISTIC
  if (input.includes("work")) result.label = "Work Schedule";
  else if (input.includes("study")) result.label = "Study Time";
  else if (input.includes("gym")) result.label = "Workout";
  else if (input.includes("focus")) result.label = "Deep Focus";
  else if (input.includes("meeting")) result.label = "Meeting Time";

  return result;
}

/**
 * Web Speech API Wrapper
 */
export function startVoiceRecognition(onResult, onError) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Speech recognition not supported in this browser.");
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    console.log("🎙️ Final Transcript:", transcript);
    onResult(transcript);
  };

  recognition.onerror = (event) => {
    if (onError) onError(event.error);
  };

  recognition.start();
  return recognition;
}
