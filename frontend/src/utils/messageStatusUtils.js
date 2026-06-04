export const MESSAGE_STATUS = {
  SENDING: "sending",
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read"
};

export const statusConfig = {
  [MESSAGE_STATUS.SENDING]: {
    icon: "⏳",
    label: "Enviando...",
    color: "text-gray-400",
    backgroundColor: "bg-gray-100",
    lucideIcon: "Clock"
  },
  [MESSAGE_STATUS.SENT]: {
    icon: "✓",
    label: "Enviado",
    color: "text-gray-400",
    backgroundColor: "bg-gray-100",
    lucideIcon: "Check"
  },
  [MESSAGE_STATUS.DELIVERED]: {
    icon: "✓✓",
    label: "Entregado",
    color: "text-gray-400",
    backgroundColor: "bg-gray-100",
    lucideIcon: "CheckCheck"
  },
  [MESSAGE_STATUS.READ]: {
    icon: "✓✓",
    label: "Leido",
    color: "text-green-400",
    backgroundColor: "bg-green-50",
    lucideIcon: "CheckCheck"
  }
};

export const getStatusPriority = (status) => {
  const priorities = {
    [MESSAGE_STATUS.READ]: 4,
    [MESSAGE_STATUS.DELIVERED]: 3,
    [MESSAGE_STATUS.SENT]: 2,
    [MESSAGE_STATUS.SENDING]: 1
  };
  return priorities[status] || 0;
};

export const shouldUpdateStatus = (currentStatus, newStatus) => {
  const currentPriority = getStatusPriority(currentStatus);
  const newPriority = getStatusPriority(newStatus);
  return newPriority > currentPriority;
};

export const getNextStatus = (currentStatus) => {
  const order = [MESSAGE_STATUS.SENDING, MESSAGE_STATUS.SENT, MESSAGE_STATUS.DELIVERED, MESSAGE_STATUS.READ];
  const currentIndex = order.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex === order.length - 1) {
    return currentStatus;
  }
  return order[currentIndex + 1];
};

export const isFinalStatus = (status) => {
  return status === MESSAGE_STATUS.READ;
};

export const isDelivered = (status) => {
  return status === MESSAGE_STATUS.DELIVERED || status === MESSAGE_STATUS.READ;
};

export const isRead = (status) => {
  return status === MESSAGE_STATUS.READ;
};

export const getStatusTooltip = (status, timestamp) => {
  const config = statusConfig[status];
  if (!config) return "";
  
  const date = timestamp ? new Date(timestamp).toLocaleTimeString() : "";
  return `${config.label}${date ? ` ${date}` : ""}`;
};

export const formatStatus = (status) => {
  return statusConfig[status]?.label || status;
};

export const groupMessagesByStatus = (messages) => {
  const grouped = {
    [MESSAGE_STATUS.SENDING]: [],
    [MESSAGE_STATUS.SENT]: [],
    [MESSAGE_STATUS.DELIVERED]: [],
    [MESSAGE_STATUS.READ]: []
  };
  
  messages.forEach(msg => {
    const status = msg.status || MESSAGE_STATUS.SENT;
    if (grouped[status]) {
      grouped[status].push(msg);
    }
  });
  
  return grouped;
};

export const getMessageStatistics = (messages, userId) => {
  const userMessages = messages.filter(msg => msg.senderId === userId);
  
  return {
    total: userMessages.length,
    [MESSAGE_STATUS.SENDING]: userMessages.filter(msg => msg.status === MESSAGE_STATUS.SENDING).length,
    [MESSAGE_STATUS.SENT]: userMessages.filter(msg => msg.status === MESSAGE_STATUS.SENT).length,
    [MESSAGE_STATUS.DELIVERED]: userMessages.filter(msg => msg.status === MESSAGE_STATUS.DELIVERED).length,
    [MESSAGE_STATUS.READ]: userMessages.filter(msg => msg.status === MESSAGE_STATUS.READ).length
  };
};

export const needsDeliveryNotification = (status) => {
  return status === MESSAGE_STATUS.SENT;
};

export const needsReadNotification = (status) => {
  return status === MESSAGE_STATUS.DELIVERED;
};

export const getStatusIconClass = (status, baseClass = "w-4 h-4 ml-1") => {
  const colorClass = status === MESSAGE_STATUS.READ 
    ? "text-green-400" 
    : "text-gray-400";
  return `${baseClass} ${colorClass}`;
};