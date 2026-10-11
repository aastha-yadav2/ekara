import React, { useEffect, useRef } from 'react';
import { Volume2, Sparkles, AlertCircle, Bot, User, Cpu } from 'lucide-react';
import type { ConversationMessage } from '../types/assistant';

interface ConversationProps {
  messages: ConversationMessage[];
  isThinking: boolean;
  onSpeakText?: (text: string) => void;
  speakingText?: string | null;
  onRetrySimulated?: (promptText?: string) => void;
}

/**
 * Maps raw backend tool name to a friendly capability label for older adults.
 * e.g., get_daily_schedule -> "Daily Schedule"
 */
function getFriendlyToolName(toolName?: string | null): string | null {
  if (!toolName) return null;
  switch (toolName) {
    case 'get_daily_schedule':
      return 'Daily Schedule';
    case 'check_front_door':
      return 'Front Door Awareness';
    case 'notify_caregiver':
      return 'Caregiver Connection';
    default:
      // In case of other tools, format nicely
      return toolName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export const Conversation: React.FC<ConversationProps> = ({
  messages,
  isThinking,
  onSpeakText,
  speakingText,
  onRetrySimulated,
}) => {
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new messages arrive or when thinking state changes
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  return (
    <section
      className="conversation-container"
      aria-label="Conversation with EKARA"
      aria-live="polite"
      tabIndex={0}
    >
      {messages.length === 0 && !isThinking && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No messages yet.</p>
          <p style={{ fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Choose a quick action above, tap the microphone, or type below to begin.
          </p>
        </div>
      )}

      {messages.map((msg) => {
        const isAssistant = msg.sender === 'assistant';
        const friendlyTool = getFriendlyToolName(msg.toolUsed);
        const isCurrentlySpeaking = Boolean(speakingText && speakingText === msg.text);

        return (
          <article
            key={msg.id}
            className={`message-row ${msg.sender}`}
            aria-label={`${isAssistant ? 'EKARA response' : 'Your message'}`}
          >
            {isAssistant && (
              <div className="message-avatar assistant" aria-hidden="true">
                <Bot size={24} />
              </div>
            )}

            <div
              className={`message-bubble ${msg.sender} ${msg.isError ? 'error' : ''}`}
            >
              {friendlyTool && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <span className="capability-badge" title="Assistant capability invoked">
                    <Sparkles size={14} aria-hidden="true" />
                    <span>EKARA used: {friendlyTool}</span>
                  </span>
                </div>
              )}

              <div className="message-text">{msg.text}</div>

              {msg.isError && onRetrySimulated && msg.errorPrompt && (
                <div style={{ marginTop: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => onRetrySimulated(msg.errorPrompt)}
                    className="accessibility-btn"
                    style={{
                      background: 'var(--color-bg-surface)',
                      borderColor: 'var(--color-warning-border)',
                      fontSize: '0.85rem',
                      padding: '0.35rem 0.75rem',
                      minHeight: '36px',
                    }}
                    title="Run the verified prototype tool logic locally for demonstration"
                  >
                    <Cpu size={15} aria-hidden="true" />
                    <span>Preview Demo Response ("{msg.errorPrompt}")</span>
                  </button>
                </div>
              )}

              <div className="message-meta">
                <span>{msg.timestamp}</span>

                {isAssistant && onSpeakText && !msg.isError && (
                  <button
                    type="button"
                    onClick={() => onSpeakText(msg.text)}
                    aria-label={isCurrentlySpeaking ? 'Stop speaking this message' : 'Read message aloud'}
                    title={isCurrentlySpeaking ? 'Stop speaking' : 'Read aloud'}
                    style={{
                      background: 'transparent',
                      color: 'inherit',
                      padding: '0.2rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <Volume2 size={16} aria-hidden="true" />
                    <span>{isCurrentlySpeaking ? 'Speaking...' : 'Listen'}</span>
                  </button>
                )}

                {msg.isError && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-danger-text)' }}>
                    <AlertCircle size={14} aria-hidden="true" />
                    <span>Notice</span>
                  </span>
                )}
              </div>
            </div>

            {!isAssistant && (
              <div className="message-avatar user" aria-hidden="true">
                <User size={24} />
              </div>
            )}
          </article>
        );
      })}

      {/* Subtle Thinking State */}
      {isThinking && (
        <div className="message-row assistant" aria-live="assertive">
          <div className="message-avatar assistant" aria-hidden="true">
            <Bot size={24} />
          </div>
          <div className="thinking-bubble" role="status">
            <span>EKARA is thinking</span>
            <div className="dots-loader" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      <div ref={scrollEndRef} />
    </section>
  );
};
