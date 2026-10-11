import React from 'react';
import { Calendar, DoorClosed, HeartHandshake, ArrowRight } from 'lucide-react';
import type { QuickActionItem } from '../types/assistant';

interface QuickActionCardProps {
  action: QuickActionItem;
  disabled: boolean;
  onSelectAction: (prompt: string) => void;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  action,
  disabled,
  onSelectAction,
}) => {
  const renderIcon = () => {
    switch (action.iconName) {
      case 'calendar':
        return <Calendar size={26} aria-hidden="true" />;
      case 'door':
        return <DoorClosed size={26} aria-hidden="true" />;
      case 'heart':
        return <HeartHandshake size={26} aria-hidden="true" />;
    }
  };

  return (
    <button
      type="button"
      className="action-card"
      disabled={disabled}
      onClick={() => onSelectAction(action.prompt)}
      aria-label={`${action.title}: ${action.description}`}
      title={`Ask: "${action.prompt}"`}
    >
      <div className="action-card-header">
        <div className="action-icon-circle">
          {renderIcon()}
        </div>
        <div className="action-card-title">{action.title}</div>
      </div>
      <div className="action-card-desc">{action.description}</div>
      <div className="action-card-prompt-hint">
        <span>"{action.prompt}"</span>
        <ArrowRight size={16} aria-hidden="true" />
      </div>
    </button>
  );
};
