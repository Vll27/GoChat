import React from 'react';
import { Clock, Check, CheckCheck } from 'lucide-react';
import { MESSAGE_STATUS, statusConfig } from '../utils/messageStatusUtils';

const iconMap = {
  Clock: Clock,
  Check: Check,
  CheckCheck: CheckCheck
};

const MessageStatusIcon = ({ status, className = "w-3.5 h-3.5" }) => {
  const config = statusConfig[status] || statusConfig[MESSAGE_STATUS.SENT];
  const IconComponent = iconMap[config.lucideIcon] || Check;
  
  const colorClass = status === MESSAGE_STATUS.READ 
    ? "text-green-400" 
    : "text-gray-400";

  return (
    <div className={`flex items-center ${colorClass}`} title={config.label}>
      <IconComponent className={className} />
    </div>
  );
};

export default MessageStatusIcon;