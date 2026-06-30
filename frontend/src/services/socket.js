import { io } from "socket.io-client";

let socket = null;

export const getSocket = () => socket;

export const connectSocket = (token) => {
  if (!socket) {
    socket = io(process.env.REACT_APP_SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }

  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

export const SOCKET_EVENTS = {
  JOIN_WORKER: "join:worker",
  JOIN_ADMIN: "join:admin",
  JOIN_ORDER: "join:order",
  JOIN_CUSTOMER: "join:customer",

  ORDER_NEW: "order:new",
  ORDER_STATUS_UPDATED: "order:status_updated",
  QUEUE_UPDATED: "queue:updated",
  ANALYTICS_UPDATED: "analytics:updated",
};