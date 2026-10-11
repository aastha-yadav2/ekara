import React from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceInputButtonProps {
  isSupported: boolean;
  isListening: boolean;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  isSupported,
  isListening,
  disabled,
  onStart,
  onStop,
}) => {
  if (!isSupported) {
    return (
      <button
        type="button"
        className="btn-mic"
        disabled={true}
        title="Voice speech recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari."
        aria-label="Voice input unavailable in this browser"
      >
        <MicOff size={24} aria-hidden="true" />
      </button>
    );
  }

  const handleClick = () => {
    if (isListening) {
      onStop();
    } else {
      onStart();
    }
  };

  return (
    <button
      type="button"
      className={`btn-mic ${isListening ? 'listening' : ''}`}
      disabled={disabled}
      onClick={handleClick}
      aria-label={isListening ? 'Stop listening to your voice' : 'Start speaking with microphone'}
      aria-pressed={isListening}
      title={isListening ? 'Listening... click to stop' : 'Click to speak your question'}
    >
      <Mic size={24} aria-hidden="true" />
    </button>
  );
};
