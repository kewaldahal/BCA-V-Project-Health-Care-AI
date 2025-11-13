import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getChatResponse, findNearbyHospitals } from '../services/geminiService';
import { ChatMessage, Hospital } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BotIcon } from './icons/BotIcon';
import { VolumeOnIcon } from './icons/VolumeOnIcon';
import { VolumeOffIcon } from './icons/VolumeOffIcon';
import { StopCircleIcon } from './icons/StopCircleIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';


// Helper functions for audio decoding (from Gemini docs)
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


interface DisplayMessage {
  text: string;
  sender: 'user' | 'ai';
}

const VOICES = [
    { name: 'English - Female', id: 'Zephyr' },
    { name: 'English - Male', id: 'Kore' },
    // As requested, providing English voice options. Gemini TTS has a wide range of voices.
];

const SPEECH_LANGUAGES = [
    { name: 'English', id: 'en-US' },
    { name: 'Nepali', id: 'ne-NP' },
];

const ChatAssistant: React.FC = () => {
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([
    { sender: 'ai', text: "Hello! I'm your AI health assistant. How can I help you today? Please remember, I'm not a doctor." }
  ]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [emergencyHospitals, setEmergencyHospitals] = useState<Hospital[] | null>(null);
  const [emergencySummary, setEmergencySummary] = useState<string | null>(null);
  const [isSearchingHospitals, setIsSearchingHospitals] = useState(false);

  // Voice Output State
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);
  const [selectedVoice, setSelectedVoice] = useState<string>(VOICES[0].id);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Voice Input State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechLang, setSpeechLang] = useState<string>(SPEECH_LANGUAGES[0].id);
  const recognitionRef = useRef<any>(null); // Using `any` for browser compatibility (e.g., webkitSpeechRecognition)
  const finalTranscriptRef = useRef<string>('');


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages]);

  const stopAudio = useCallback(() => {
    if (currentAudioSourceRef.current) {
        currentAudioSourceRef.current.stop();
        currentAudioSourceRef.current.disconnect();
        currentAudioSourceRef.current = null;
    }
    setIsPlayingAudio(false);
  }, []);

  const playAudio = useCallback(async (base64Audio: string) => {
    stopAudio(); 
    
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
        ctx.resume();
    }
    
    try {
        setIsPlayingAudio(true);
        const audioBytes = decode(base64Audio);
        const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        
        source.onended = () => {
            setIsPlayingAudio(false);
            if (currentAudioSourceRef.current === source) {
                currentAudioSourceRef.current = null;
            }
        };
        
        source.start();
        currentAudioSourceRef.current = source;
    } catch (e) {
        console.error("Error playing audio:", e);
        setIsPlayingAudio(false);
    }
  }, [stopAudio]);

  const handleSend = useCallback(async () => {
    if (input.trim() === '' || isLoading) return;

    stopAudio();

  const sentText = input.trim();

  const userDisplayMessage: DisplayMessage = { text: sentText, sender: 'user' };
  setDisplayMessages(prev => [...prev, userDisplayMessage]);
    
  const userMessage: ChatMessage = { role: 'user', parts: [{ text: sentText }] };
  const currentHistory = [...chatHistory, userMessage];

  setInput('');
  setIsLoading(true);

    try {
       const { response: aiResponse, audio: audioContent } = await getChatResponse(
          input, 
          currentHistory, 
          { enabled: isVoiceEnabled, voice: selectedVoice }
      );

      const aiDisplayMessage: DisplayMessage = { text: aiResponse, sender: 'ai' };
      const aiMessage: ChatMessage = { role: 'model', parts: [{ text: aiResponse }] };
      setDisplayMessages(prev => [...prev, aiDisplayMessage]);
      setChatHistory([...currentHistory, aiMessage]);

      if (audioContent) {
          playAudio(audioContent);
      }

      // Emergency detection: if the user's message looks like a serious symptom, try to find nearby hospitals.
      try {
        const emergencyKeywords = [
          'chest pain', 'sharp pain', 'shortness of breath', 'difficulty breathing', 'unconscious', 'fainting', 'severe bleeding', 'heavy bleeding', 'stroke', 'heart attack', 'loss of consciousness', 'not breathing', 'collapse'
        ];
        const lowerSent = sentText.toLowerCase();
        const isEmergency = emergencyKeywords.some(k => lowerSent.includes(k));

        if (isEmergency) {
          // Inform the user we're trying to locate nearby hospitals
          const infoMsg: DisplayMessage = { sender: 'ai', text: "I detected signs of a possible medical emergency. I'm attempting to find nearby hospitals—please allow location access if prompted." };
          setDisplayMessages(prev => [...prev, infoMsg]);
          setIsSearchingHospitals(true);
          setEmergencyHospitals(null);
          setEmergencySummary(null);

          // Try browser geolocation first
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
              try {
                const { latitude, longitude } = position.coords;
                const res = await findNearbyHospitals({ lat: latitude, lon: longitude });
                setEmergencyHospitals(res.hospitals || []);
                setEmergencySummary(res.summary || 'Nearby hospitals found:');
                setIsSearchingHospitals(false);
                // Append a summary AI message
                const hospitalsMsg: DisplayMessage = { sender: 'ai', text: res.summary || 'I found some hospitals near you.' };
                setDisplayMessages(prev => [...prev, hospitalsMsg]);
              } catch (err: any) {
                setIsSearchingHospitals(false);
                const failMsg: DisplayMessage = { sender: 'ai', text: 'I was unable to fetch nearby hospitals automatically. Please try the Hospitals page or enter your location manually.' };
                setDisplayMessages(prev => [...prev, failMsg]);
              }
            }, (geoErr) => {
              setIsSearchingHospitals(false);
              const geoMsg: DisplayMessage = { sender: 'ai', text: 'Location access denied or unavailable. Please open the Hospitals page and enter your location to search for nearby hospitals.' };
              setDisplayMessages(prev => [...prev, geoMsg]);
            }, { timeout: 8000 });
          } else {
            setIsSearchingHospitals(false);
            const noGeoMsg: DisplayMessage = { sender: 'ai', text: 'Geolocation is not supported by your browser. Please open the Hospitals page and search manually.' };
            setDisplayMessages(prev => [...prev, noGeoMsg]);
          }
        }
      } catch (e) {
        console.error('Error during emergency hospital lookup:', e);
      }

    } catch (error) {
      const errorMessage: DisplayMessage = { text: 'Sorry, I encountered an error. Please try again.', sender: 'ai' };
      setDisplayMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, chatHistory, stopAudio, isVoiceEnabled, selectedVoice, playAudio]);

  // Setup Speech Recognition
  useEffect(() => {
    // FIX: Property 'SpeechRecognition' does not exist on type 'Window & typeof globalThis'.
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported by this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechLang;

    // FIX: Cannot find name 'SpeechRecognitionEvent'. Did you mean 'SpeechRecognitionResult'?
    recognition.onresult = (event: any) => {
        let interim_transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscriptRef.current += event.results[i][0].transcript + ' ';
            } else {
                interim_transcript += event.results[i][0].transcript;
            }
        }
        setInput(finalTranscriptRef.current + interim_transcript);
    };

    // FIX: Cannot find name 'SpeechRecognitionErrorEvent'. Did you mean 'SpeechRecognitionResult'?
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;

    return () => {
        recognition.stop();
    };
  }, [speechLang]);

  const handleMicClick = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      finalTranscriptRef.current = '';
      setInput('');
      recognition.start();
      setIsListening(true);
    }
  };


  useEffect(() => {
    return () => {
        stopAudio();
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
    };
  }, [stopAudio]);

  // FIX: Property 'SpeechRecognition' does not exist on type 'Window & typeof globalThis'.
  const isSpeechRecognitionSupported = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white">AI Health Assistant</h2>
      </div>
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="space-y-4">
          {displayMessages.map((msg, index) => (
            <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'ai' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white"><BotIcon className="w-5 h-5"/></div>}
              <div
                className={`max-w-md px-4 py-2 rounded-2xl ${
                  msg.sender === 'user'
                    ? 'bg-red-600 text-white rounded-br-none'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none'
                }`}
              >
                {msg.sender === 'ai' ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, ...props }) => (
                        // @ts-ignore - props align with react-markdown's link props
                        <a {...props} target="_blank" rel="noopener noreferrer" className="text-red-600 underline" />
                      ),
                      // render paragraphs without extra margins inside the chat bubble
                      p: ({ node, ...props }) => <p {...props} className="m-0" />,
                      li: ({ node, ...props }) => <li {...props} className="ml-4 list-disc" />,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex items-end gap-2 justify-start">
               <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white"><BotIcon className="w-5 h-5"/></div>
                <div className="px-4 py-3 bg-gray-200 dark:bg-gray-800 rounded-2xl rounded-bl-none">
                    <div className="flex items-center justify-center space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    </div>
                </div>
            </div>
          )}
          {/* Emergency hospitals panel */}
          {isSearchingHospitals && (
            <div className="text-center p-4">
              <div className="w-10 h-10 border-4 border-red-500 border-dashed rounded-full animate-spin mx-auto"></div>
              <p className="mt-3 text-gray-600 dark:text-gray-300">Searching for nearby hospitals...</p>
            </div>
          )}

          {emergencyHospitals && emergencyHospitals.length > 0 && (
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow mt-4 border border-gray-200 dark:border-gray-800">
              <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Nearby Hospitals</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{emergencySummary}</p>
              <div className="space-y-2">
                {emergencyHospitals.map((h, idx) => (
                  <a key={idx} href={h.uri} target="_blank" rel="noopener noreferrer" className="block p-3 bg-gray-50 dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800 hover:border-red-500 dark:hover:border-red-500">
                    <p className="font-semibold text-red-600">{h.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Click to view on map</p>
                  </a>
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
         <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
                <button onClick={() => setIsVoiceEnabled(!isVoiceEnabled)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label={isVoiceEnabled ? 'Disable voice output' : 'Enable voice output'}>
                    {isVoiceEnabled ? <VolumeOnIcon className="w-6 h-6 text-red-500"/> : <VolumeOffIcon className="w-6 h-6 text-gray-500"/>}
                </button>
                <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    disabled={!isVoiceEnabled}
                    className="bg-gray-100 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg text-sm px-3 py-1.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 transition-opacity"
                    aria-label="Select voice"
                >
                    {VOICES.map(voice => (
                        <option key={voice.id} value={voice.id}>{voice.name}</option>
                    ))}
                </select>
            </div>

            {isSpeechRecognitionSupported && (
                <div className="flex items-center gap-2">
                     <label htmlFor="speech-lang" className="text-sm text-gray-600 dark:text-gray-300">Listen In:</label>
                     <select
                        id="speech-lang"
                        value={speechLang}
                        onChange={(e) => setSpeechLang(e.target.value)}
                        className="bg-gray-100 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg text-sm px-3 py-1.5 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        aria-label="Select speech recognition language"
                    >
                        {SPEECH_LANGUAGES.map(lang => (
                            <option key={lang.id} value={lang.id}>{lang.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {isPlayingAudio && (
                <button onClick={stopAudio} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                    <StopCircleIcon className="w-5 h-5"/> Stop Audio
                </button>
            )}
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            className="flex-grow p-3 bg-gray-100 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
            placeholder={isListening ? 'Listening...' : 'Ask a health question...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
          />
          {isSpeechRecognitionSupported && (
             <button
                type="button"
                onClick={handleMicClick}
                disabled={isLoading}
                className={`p-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 disabled:opacity-50 ${
                    isListening
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
                aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            >
                <MicrophoneIcon className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={handleSend}
            disabled={isLoading || input.trim() === ''}
            className="px-5 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;