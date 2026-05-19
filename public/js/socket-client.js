export const socket = window.io ? window.io() : null;

export const sendMessage = (event, data) => {
  if (socket) socket.emit(event, data);
};

export const onMessage = (event, callback) => {
  if (socket) socket.on(event, callback);
};

export default socket;