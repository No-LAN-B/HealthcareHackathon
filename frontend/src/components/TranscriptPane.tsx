import { useRef, useEffect, useState, useCallback } from "react";
import { Mic, MicOff, Keyboard, Loader2 } from "lucide-react";

interface Props {
  transcript: string;
  onTranscriptChange: (text: string) => void;
  onExtract: (text: string) => void;
  extracting: boolean;
}

export default function TranscriptPane({
  transcript,
  onTranscriptChange,
  onExtract,
  extracting,
}: Props) {
  const [listening, setListening] = useState(false);
  const [speechSupported] = useState(
    () => "webkitSpeechRecognition" in window || "SpeechRecognition" in window
  );
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  function createRecognition() {
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition ||
      (window as unknown as Record<string, unknown>).SpeechRecognition;
    if (!SpeechRecognition) return null;
    const recognition = new (SpeechRecognition as new () => SpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    return recognition;
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
    item: (index: number) => SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item: (index: number) => SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = transcript;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += " " + event.results[i][0].transcript;
        }
      }
      onTranscriptChange(finalTranscript.trim());
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.start();
    setListening(true);
  }

  const debouncedExtract = useCallback(
    (text: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onExtract(text), 2000);
    },
    [onExtract]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChange(text: string) {
    onTranscriptChange(text);
    debouncedExtract(text);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Transcript</h3>
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
              title={listening ? "Stop listening" : "Start voice input"}
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
        value={transcript}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Begin typing or use voice input to record the patient encounter. Claude will analyze the transcript and generate a clinical note in real time..."
        className="w-full h-64 p-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400"
      />

      {listening && (
        <div className="mt-3 flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="text-sm text-red-600">Listening...</span>
        </div>
      )}
    </div>
  );
}
