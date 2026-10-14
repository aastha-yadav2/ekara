import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export const SafetyBanner: React.FC = () => {
  return (
    <footer className="safety-area-footer" role="contentinfo" aria-label="EKARA System Notice">
      {/* Global Subtle Prototype Disclosure */}
      <div className="global-prototype-disclosure" role="note">
        <Info size={16} aria-hidden="true" className="global-prototype-icon" />
        <span>Prototype Mode: Home telemetry and caregiver notifications are simulated for this demonstration.</span>
      </div>

      <div className="safety-banner">
        <div style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true">
          <AlertTriangle size={24} color="#D97706" />
        </div>
        <div>
          <div className="safety-banner-title">
            EKARA Prototype Demonstration & Safety Notice
          </div>
          <p style={{ lineHeight: 1.5 }}>
            <strong>Medical & Emergency Boundaries:</strong> EKARA is an independent living companion, not an emergency dispatch or medical monitoring device. In an emergency or severe medical event, always dial <strong>911</strong> or press your dedicated physical alert button.
          </p>
          <p style={{ marginTop: '0.4rem', lineHeight: 1.5 }}>
            <strong>Simulated Prototype Features:</strong> Smart home sensors, door lock statuses, and porch telemetry are simulated for prototype verification. Caregiver alerts are recorded in a safe mock notification log; no live SMS or external carrier calls are dispatched in this prototype mode.
          </p>
        </div>
      </div>
    </footer>
  );
};
