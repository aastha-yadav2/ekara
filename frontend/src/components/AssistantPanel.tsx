import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Conversation } from './Conversation';
import { VoiceInputButton } from './VoiceInputButton';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import type { ConversationMessage } from '../types/assistant';

interface AssistantPanelProps {
  messages: ConversationMessage[];
  isThinking: boolean;
  onSendMessage: (text: string) => void;
  onSpeakText?: (text: string) => void;
  speakingText?: string | null;
  onRetrySimulated?: (promptText?: string) => void;
}

const EXAMPLE_PROMPTS = [
  'What do I need to do today?',
  'Is anyone at the front door?',
  'Tell my daughter I need help.',
];

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  messages,
  isThinking,
  onSendMessage,
  onSpeakText,
  speakingText,
  onRetrySimulated,
}) => {
  const [inputValue, setInputValue] = useState('');

  // Voice speech recognition hook
  const {
    isSupported,
    isListening,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition((recognizedText) => {
    setInputValue(recognizedText);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isThinking) return;

    if (isListening) {
      stopListening();
    }

    onSendMessage(trimmed);
    setInputValue('');
    resetTranscript();
  };

  const handlePromptClick = (prompt: string) => {
    if (isThinking) return;
    setInputValue(prompt);
    onSendMessage(prompt);
  };

  return (
    <section className="app-card assistant-panel" aria-label="EKARA Voice Assistant Panel">
      <div className="assistant-welcome">
        <h2>How can I help you today?</h2>
        <p>Ask about your schedule, check the front door, or alert family.</p>
      </div>

      {/* Conversation Messages */}
      <Conversation
        messages={messages}
        isThinking={isThinking}
        onSpeakText={onSpeakText}
        speakingText={speakingText}
        onRetrySimulated={onRetrySimulated}
      />

      {/* Voice Recognition Notice / Status if active or error */}
      {isListening && (
        <div
          role="status"
          aria-live="assertive"
          style={{
            padding: '0.65rem 1rem',
            background: 'var(--color-warning-bg)',
            color: 'var(--color-warning-text)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.95rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span className="status-dot pulse-dot" style={{ backgroundColor: '#DC2626' }} />
          <span>Listening... speak clearly into your microphone</span>
        </div>
      )}

      {speechError && (
        <div
          role="alert"
          style={{
            padding: '0.65rem 1rem',
            background: 'var(--color-danger-bg)',
            color: 'var(--color-danger-text)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.9rem',
          }}
        >
          {speechError}
        </div>
      )}

      {/* Chat Input Form */}
      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="input-row">
          <input
            type="text"
            className="chat-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask EKARA anything..."
            disabled={isThinking}
            aria-label="Ask EKARA anything"
            autoComplete="off"
          />

          <VoiceInputButton
            isSupported={isSupported}
            isListening={isListening}
            disabled={isThinking}
            onStart={startListening}
            onStop={stopListening}
          />

          <button
            type="submit"
            className="btn-send"
            disabled={isThinking || !inputValue.trim()}
            aria-label="Send message to EKARA"
          >
            <Send size={20} aria-hidden="true" />
            <span>Ask</span>
          </button>
        </div>

        {/* Example prompts for quick access */}
        <div className="prompt-chips-wrapper" aria-label="Example prompts">
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Try asking:
          </span>
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="prompt-chip"
              disabled={isThinking}
              onClick={() => handlePromptClick(prompt)}
              aria-label={`Ask: ${prompt}`}
            >
              <Sparkles size={14} aria-hidden="true" style={{ color: 'var(--color-brand-primary)' }} />
              <span>{prompt}</span>
            </button>
          ))}
        </div>
      </form>
    </section>
  );
};
