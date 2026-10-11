import React from 'react';
import { HeartPulse, Sun, Moon, Type, Volume2, VolumeX, Wifi, WifiOff, Cloud, Cpu } from 'lucide-react';
import type { ServerHealthResponse } from '../types/assistant';

interface HeaderProps {
  health: ServerHealthResponse | null;
  healthLoading: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  textScale: 'normal' | 'large' | 'xlarge';
  onCycleTextScale: () => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  simulatorMode: 'cloud' | 'prototype';
  onToggleSimulatorMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  healthLoading,
  theme,
  onToggleTheme,
  textScale,
  onCycleTextScale,
  autoSpeak,
  onToggleAutoSpeak,
  simulatorMode,
  onToggleSimulatorMode,
}) => {
  const isOnline = Boolean(health && health.status === 'ok');

  return (
    <header className="header-wrapper" role="banner">
      <div className="header-content">
        <div className="brand-section">
          <div className="logo-badge" aria-hidden="true">
            <HeartPulse size={30} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="brand-title">EKARA</h1>
            <p className="brand-tagline">Independent living, made easier.</p>
          </div>
        </div>

        <div className="header-controls">
          {/* Server Connection Status Indicator */}
          <div
            className={`status-pill ${
              healthLoading ? 'checking' : isOnline ? 'online' : 'offline'
            }`}
            role="status"
            aria-live="polite"
            title={
              healthLoading
                ? 'Checking EKARA server connection...'
                : isOnline
                ? `EKARA Server Connected (v${health?.version})`
                : 'EKARA Server Offline at http://localhost:3000'
            }
          >
            {isOnline ? (
              <>
                <span className="status-dot pulse-dot" aria-hidden="true" />
                <Wifi size={16} aria-hidden="true" />
                <span>Assistant Ready</span>
              </>
            ) : healthLoading ? (
              <>
                <span className="status-dot" aria-hidden="true" />
                <span>Checking Server...</span>
              </>
            ) : (
              <>
                <WifiOff size={16} aria-hidden="true" />
                <span>Server Offline</span>
              </>
            )}
          </div>

          {/* Assistant Execution Mode Selector */}
          <button
            type="button"
            className="accessibility-btn"
            onClick={onToggleSimulatorMode}
            aria-label={`Current execution mode: ${simulatorMode === 'cloud' ? 'Live Cloud API' : 'Local Prototype Mode'}. Click to toggle.`}
            title={
              simulatorMode === 'cloud'
                ? 'Mode: Live Cloud (Calls POST /api/assistant with Amazon Bedrock)'
                : 'Mode: Local Prototype Demo (Runs prototype flows directly)'
            }
          >
            {simulatorMode === 'cloud' ? <Cloud size={18} aria-hidden="true" /> : <Cpu size={18} aria-hidden="true" />}
            <span>Mode: {simulatorMode === 'cloud' ? 'Cloud API' : 'Demo Prototype'}</span>
          </button>

          {/* Text Size Accessibility Scaler for Seniors */}
          <button
            type="button"
            className="accessibility-btn"
            onClick={onCycleTextScale}
            aria-label={`Current text size: ${textScale}. Click to cycle text size.`}
            title="Adjust text size for easier reading"
          >
            <Type size={18} aria-hidden="true" />
            <span>
              Text:{' '}
              {textScale === 'normal'
                ? 'Standard'
                : textScale === 'large'
                ? 'Large'
                : 'Extra Large'}
            </span>
          </button>

          {/* Voice Readout Toggle */}
          <button
            type="button"
            className="accessibility-btn"
            onClick={onToggleAutoSpeak}
            aria-pressed={autoSpeak}
            aria-label={autoSpeak ? 'Disable voice readout' : 'Enable voice readout'}
            title="Automatically read EKARA answers aloud"
          >
            {autoSpeak ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
            <span>Voice: {autoSpeak ? 'On' : 'Off'}</span>
          </button>

          {/* High Contrast / Dark Mode Toggle */}
          <button
            type="button"
            className="accessibility-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to high-contrast dark theme'}
            title="Toggle contrast theme"
          >
            {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            <span>{theme === 'dark' ? 'Light' : 'Contrast'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
