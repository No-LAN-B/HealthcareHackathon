import { useRef, useEffect, useState, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface Props {
  transcript: string;
  onTranscriptChange: (text: string) => void;
  onExtract: (text: string) => void;
  extracting: boolean;
  autoStart?: boolean;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

function createRecognition(): SpeechRecognition | null {
  const Ctor =
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition ||
    (window as unknown as Record<string, unknown>).SpeechRecognition;
  if (!Ctor) return null;
  const recognition = new (Ctor as new () => SpeechRecognition)();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  return recognition;
}

export default function TranscriptPane({
  transcript,
  onTranscriptChange,
  onExtract,
  extracting,
  autoStart = false,
}: Props) {
  const [listening, setListening] = useState(false);
  const [speechSupported] = useState(
    () => "webkitSpeechRecognition" in window || "SpeechRecognition" in window
  );
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const transcriptRef = useRef(transcript);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep ref in sync so speech callbacks read latest value
  transcriptRef.current = transcript;

  const startListening = useCallback(() => {
    if (listening) return;
    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = transcriptRef.current;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += " " + event.results[i][0].transcript;
        }
      }
      onTranscriptChange(finalTranscript.trim());
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    try {
      recognition.start();
      setListening(true);
    } catch {
      // Browser blocked auto-start — user will type instead
    }
  }, [listening, onTranscriptChange]);

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function toggleMic() {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }

  // Auto-start on mount when prop is set
  useEffect(() => {
    if (!autoStart || !speechSupported) return;
    const timer = setTimeout(() => startListening(), 500);
    return () => clearTimeout(timer);
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus textarea on mount if no speech support
  useEffect(() => {
    if (autoStart && !speechSupported) {
      textareaRef.current?.focus();
    }
  }, [autoStart, speechSupported]);

  // Trigger extraction on ANY transcript change (voice or typing)
  useEffect(() => {
    if (transcript.trim().length < 20) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onExtract(transcript), 2000);
  }, [transcript, onExtract]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      recognitionRef.current?.stop();
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {listening ? (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
          ) : (
            <span className="inline-flex rounded-full h-3 w-3 bg-gray-300" />
          )}
          <h3 className="font-semibold text-gray-900">
            {listening ? "Live Transcript" : "Transcript"}
          </h3>
          {listening && (
            <span className="text-xs text-green-600 font-medium">Recording</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {extracting && (
            <span className="flex items-center gap-1 text-xs text-teal-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              Analyzing...
            </span>
          )}
          {speechSupported && (
            <button
              onClick={toggleMic}
              className={`p-2 rounded-lg transition-colors ${
                listening
                  ? "bg-red-100 text-red-600"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              title={listening ? "Pause listening" : "Resume listening"}
            >
              {listening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={transcript}
        onChange={(e) => onTranscriptChange(e.target.value)}
        placeholder={
          autoStart
            ? "MedRelay is listening. Speak naturally during the appointment..."
            : "Begin typing or use voice input to record the patient encounter..."
        }
        className="w-full h-64 p-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400"
      />
    </div>
  );
}
