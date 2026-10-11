import React from 'react';
import { Calendar, DoorClosed, HeartHandshake, Info } from 'lucide-react';
import type { StatusCardState } from '../types/assistant';

interface StatusCardProps {
  statusData: StatusCardState;
}

export const StatusCard: React.FC<StatusCardProps> = ({ statusData }) => {
  const getBadgeClass = (status: string) => {
    switch (status) {
      case 'ready':
      case 'connected':
      case 'action_completed':
        return 'ready';
      case 'checking':
        return 'checking';
      case 'error':
        return 'error';
      default:
        return 'ready';
    }
  };

  const formatStatusLabel = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'checking':
        return 'Checking';
      case 'connected':
        return 'Connected';
      case 'action_completed':
        return 'Action completed';
      case 'error':
        return 'Error';
      default:
        return status;
    }
  };

  return (
    <aside className="status-cards-column" aria-label="Smart Home & Routine Status">
      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
        Home & Routine Overview
      </h3>

      {/* Card 1: Today's Routine */}
      <div className="status-card">
        <div className="status-card-header">
          <div className="status-card-title-group">
            <div className="status-card-icon" aria-hidden="true">
              <Calendar size={20} />
            </div>
            <h4 className="status-card-title">Today's Routine</h4>
          </div>
          <span className={`status-card-badge ${getBadgeClass(statusData.routineStatus)}`}>
            {formatStatusLabel(statusData.routineStatus)}
          </span>
        </div>
        <div className="status-card-body">
          {statusData.routineDetail}
        </div>
        <div className="status-card-disclaimer">
          <Info size={14} aria-hidden="true" />
          <span>Simulated senior schedule (mock data)</span>
        </div>
      </div>

      {/* Card 2: Front Door Awareness */}
      <div className="status-card">
        <div className="status-card-header">
          <div className="status-card-title-group">
            <div className="status-card-icon" aria-hidden="true">
              <DoorClosed size={20} />
            </div>
            <h4 className="status-card-title">Front Door Awareness</h4>
          </div>
          <span className={`status-card-badge ${getBadgeClass(statusData.frontDoorStatus)}`}>
            {formatStatusLabel(statusData.frontDoorStatus)}
          </span>
        </div>
        <div className="status-card-body">
          {statusData.frontDoorDetail}
        </div>
        <div className="status-card-disclaimer">
          <Info size={14} aria-hidden="true" />
          <span>Simulated telemetry (no physical sensor or camera)</span>
        </div>
      </div>

      {/* Card 3: Caregiver Connection */}
      <div className="status-card">
        <div className="status-card-header">
          <div className="status-card-title-group">
            <div className="status-card-icon" aria-hidden="true">
              <HeartHandshake size={20} />
            </div>
            <h4 className="status-card-title">Caregiver Connection</h4>
          </div>
          <span className={`status-card-badge ${getBadgeClass(statusData.caregiverStatus)}`}>
            {formatStatusLabel(statusData.caregiverStatus)}
          </span>
        </div>
        <div className="status-card-body">
          {statusData.caregiverDetail}
        </div>
        <div className="status-card-disclaimer">
          <Info size={14} aria-hidden="true" />
          <span>Mock adapter (prototype notification log)</span>
        </div>
      </div>
    </aside>
  );
};
