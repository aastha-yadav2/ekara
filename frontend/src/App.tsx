import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { QuickActionCard } from './components/QuickActionCard';
import { AssistantPanel } from './components/AssistantPanel';
import { StatusCard } from './components/StatusCard';
import { SafetyBanner } from './components/SafetyBanner';
import { sendAssistantMessage, checkServerHealth } from './services/assistantApi';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import type {
  ConversationMessage,
  QuickActionItem,
  StatusCardState,
  ServerHealthResponse
} from './types/assistant';

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: 'schedule',
    title: "Today's Schedule",
    description: 'See what you need to do today.',
    prompt: 'What do I need to do today?',
    iconName: 'calendar',
    toolExpected: 'get_daily_schedule',
  },
  {
    id: 'front-door',
    title: 'Front Door',
    description: "Check what's happening at your front door.",
    prompt: 'Is anyone at the front door?',
    iconName: 'door',
    toolExpected: 'check_front_door',
  },
  {
    id: 'caregiver',
    title: 'Contact Caregiver',
    description: 'Let your caregiver know you need help.',
    prompt: 'Tell my daughter I need help.',
    iconName: 'heart',
    toolExpected: 'notify_caregiver',
  },
];

export const App: React.FC = () => {
  // Accessibility & Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('ekara_theme') as 'light' | 'dark') || 'light';
  });

  const [textScale, setTextScale] = useState<'normal' | 'large' | 'xlarge'>(() => {
    return (localStorage.getItem('ekara_text_scale') as 'normal' | 'large' | 'xlarge') || 'normal';
  });

  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => {
    return localStorage.getItem('ekara_auto_speak') === 'true';
  });

  // Simulator Execution Mode ('cloud' = Live POST /api/assistant; 'prototype' = Local verified prototype demo)
  const [simulatorMode, setSimulatorMode] = useState<'cloud' | 'prototype'>(() => {
    return (localStorage.getItem('ekara_sim_mode') as 'cloud' | 'prototype') || 'cloud';
  });

  // Server health state
  const [health, setHealth] = useState<ServerHealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);

  // Assistant State
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>(() => [
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Good day! I am EKARA, your personal home assistant. You can ask me about your schedule, check your front door, or send a message to your family.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Status Cards State
  const [statusData, setStatusData] = useState<StatusCardState>({
    routineStatus: 'ready',
    routineDetail: 'Ready to review medications and activities.',
    frontDoorStatus: 'ready',
    frontDoorDetail: 'Front Porch: Locked • No motion detected • Telemetry clear.',
    caregiverStatus: 'connected',
    caregiverDetail: 'Designated contact: Sarah (Daughter) via Family App.',
  });

  // Speech output hook
  const { isSpeaking, speak, stop } = useSpeechSynthesis();
  const [currentSpeakingText, setCurrentSpeakingText] = useState<string | null>(null);

  // Sync theme, text scale, and sim mode to localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ekara_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-text-scale', textScale);
    localStorage.setItem('ekara_text_scale', textScale);
  }, [textScale]);

  useEffect(() => {
    localStorage.setItem('ekara_auto_speak', autoSpeak ? 'true' : 'false');
  }, [autoSpeak]);

  useEffect(() => {
    localStorage.setItem('ekara_sim_mode', simulatorMode);
  }, [simulatorMode]);

  // Periodic health check
  useEffect(() => {
    let isMounted = true;

    async function fetchHealth() {
      const result = await checkServerHealth();
      if (isMounted) {
        setHealth(result);
        setHealthLoading(false);
      }
    }

    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Toggle theme
  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Cycle text size
  const handleCycleTextScale = () => {
    setTextScale((prev) => {
      if (prev === 'normal') return 'large';
      if (prev === 'large') return 'xlarge';
      return 'normal';
    });
  };

  // Toggle auto speech readout
  const handleToggleAutoSpeak = () => {
    setAutoSpeak((prev) => !prev);
  };

  // Toggle simulator execution mode
  const handleToggleSimulatorMode = () => {
    setSimulatorMode((prev) => (prev === 'cloud' ? 'prototype' : 'cloud'));
  };

  // Manual speech playback
  const handleSpeakText = (text: string) => {
    if (isSpeaking && currentSpeakingText === text) {
      stop();
      setCurrentSpeakingText(null);
    } else {
      setCurrentSpeakingText(text);
      speak(text);
    }
  };

  // Central Message Handling Logic (calls real backend POST /api/assistant by default)
  const handleSendMessage = async (text: string, forceSimulated = false) => {
    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsThinking(true);

    const lower = text.toLowerCase();

    // Update status cards preview state
    if (lower.includes('schedule') || lower.includes('today')) {
      setStatusData((prev) => ({ ...prev, routineStatus: 'checking' }));
    } else if (lower.includes('door') || lower.includes('front')) {
      setStatusData((prev) => ({ ...prev, frontDoorStatus: 'checking' }));
    } else if (lower.includes('daughter') || lower.includes('help') || lower.includes('caregiver')) {
      setStatusData((prev) => ({ ...prev, caregiverStatus: 'checking' }));
    }

    // If prototype demo mode is explicitly enabled or fallback is requested
    if (simulatorMode === 'prototype' || forceSimulated) {
      await new Promise((resolve) => setTimeout(resolve, 600)); // natural conversational pause

      let simMessage = 'I am here to help you live comfortably and independently at home.';
      let simTool: string | null = null;

      if (lower.includes('schedule') || lower.includes('today')) {
        simTool = 'get_daily_schedule';
        simMessage = 'You have two items on your schedule today: Morning blood pressure check at 8:30 AM and Physical therapy at 2:00 PM.';
        setStatusData((prev) => ({
          ...prev,
          routineStatus: 'action_completed',
          routineDetail: 'Today: Morning blood pressure check (8:30 AM), Physical therapy (2:00 PM).',
        }));
      } else if (lower.includes('door') || lower.includes('front')) {
        simTool = 'check_front_door';
        simMessage = 'According to simulated smart home telemetry, your front door is locked and no motion is currently detected.';
        setStatusData((prev) => ({
          ...prev,
          frontDoorStatus: 'action_completed',
          frontDoorDetail: 'Front Porch: Locked • No motion detected • Telemetry clear.',
        }));
      } else if (lower.includes('daughter') || lower.includes('help') || lower.includes('caregiver')) {
        simTool = 'notify_caregiver';
        simMessage = 'I have recorded your request for your daughter in the prototype notification log. Please note no live SMS was sent in this prototype.';
        setStatusData((prev) => ({
          ...prev,
          caregiverStatus: 'action_completed',
          caregiverDetail: 'Notification recorded in mock adapter for Sarah (Daughter).',
        }));
      } else {
        simTool = null;
        simMessage = 'Hello! I am EKARA, your voice assistant. You can ask me to check your schedule, inspect the front door, or alert family.';
      }

      const assistantMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: simMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolUsed: simTool,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsThinking(false);

      if (autoSpeak) {
        handleSpeakText(simMessage);
      }
      return;
    }

    try {
      // Execute call to existing POST /api/assistant endpoint
      const response = await sendAssistantMessage(text);

      if (response.success && response.message) {
        const assistantMessage: ConversationMessage = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: response.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolUsed: response.toolUsed,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Reflect completed tool in status cards
        if (response.toolUsed === 'get_daily_schedule') {
          setStatusData((prev) => ({
            ...prev,
            routineStatus: 'action_completed',
            routineDetail: 'Today: Morning blood pressure check (8:30 AM), Physical therapy (2:00 PM).',
          }));
        } else if (response.toolUsed === 'check_front_door') {
          setStatusData((prev) => ({
            ...prev,
            frontDoorStatus: 'action_completed',
            frontDoorDetail: 'Front Porch: Locked • No motion detected • Telemetry clear.',
          }));
        } else if (response.toolUsed === 'notify_caregiver') {
          setStatusData((prev) => ({
            ...prev,
            caregiverStatus: 'action_completed',
            caregiverDetail: 'Notification recorded in mock adapter for Sarah (Daughter).',
          }));
        }

        // Auto-read response aloud if enabled
        if (autoSpeak) {
          handleSpeakText(response.message);
        }
      } else {
        // Display graceful error message
        const errorMessage: ConversationMessage = {
          id: `assistant-err-${Date.now()}`,
          sender: 'assistant',
          text: response.error || 'EKARA was unable to complete that request at this time.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
          errorPrompt: text,
        };

        setMessages((prev) => [...prev, errorMessage]);

        // Set failed checking status cards to error
        setStatusData((prev) => ({
          routineStatus: prev.routineStatus === 'checking' ? 'error' : prev.routineStatus,
          frontDoorStatus: prev.frontDoorStatus === 'checking' ? 'error' : prev.frontDoorStatus,
          caregiverStatus: prev.caregiverStatus === 'checking' ? 'error' : prev.caregiverStatus,
          routineDetail: prev.routineDetail,
          frontDoorDetail: prev.frontDoorDetail,
          caregiverDetail: prev.caregiverDetail,
        }));
      }
    } catch {
      const errorMessage: ConversationMessage = {
        id: `assistant-err-${Date.now()}`,
        sender: 'assistant',
        text: 'A network error occurred while communicating with EKARA. Please make sure the server is running.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
        errorPrompt: text,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setStatusData((prev) => ({
        routineStatus: prev.routineStatus === 'checking' ? 'error' : prev.routineStatus,
        frontDoorStatus: prev.frontDoorStatus === 'checking' ? 'error' : prev.frontDoorStatus,
        caregiverStatus: prev.caregiverStatus === 'checking' ? 'error' : prev.caregiverStatus,
        routineDetail: prev.routineDetail,
        frontDoorDetail: prev.frontDoorDetail,
        caregiverDetail: prev.caregiverDetail,
      }));
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Senior-Friendly Header */}
      <Header
        health={health}
        healthLoading={healthLoading}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        textScale={textScale}
        onCycleTextScale={handleCycleTextScale}
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={handleToggleAutoSpeak}
        simulatorMode={simulatorMode}
        onToggleSimulatorMode={handleToggleSimulatorMode}
      />

      {/* Main Content Area */}
      <main id="main-content" className="app-container">
        {/* Quick Actions Row */}
        <section className="quick-actions-section" aria-label="Quick Actions">
          <div className="section-heading-row">
            <h2 className="section-heading">Quick Actions</h2>
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Tap any card to ask EKARA instantly
            </span>
          </div>

          <div className="quick-actions-grid">
            {QUICK_ACTIONS.map((action) => (
              <QuickActionCard
                key={action.id}
                action={action}
                disabled={isThinking}
                onSelectAction={handleSendMessage}
              />
            ))}
          </div>
        </section>

        {/* Dashboard Grid: Assistant Panel + Status Overview */}
        <div className="dashboard-grid">
          {/* Main Conversational Interface */}
          <AssistantPanel
            messages={messages}
            isThinking={isThinking}
            onSendMessage={handleSendMessage}
            onSpeakText={handleSpeakText}
            speakingText={currentSpeakingText}
            onRetrySimulated={(prompt) => handleSendMessage(prompt || '', true)}
          />

          {/* Real-time Status Overview Cards */}
          <StatusCard statusData={statusData} />
        </div>

        {/* System Truthfulness & Safety Boundaries Banner */}
        <SafetyBanner />
      </main>
    </>
  );
};

export default App;
