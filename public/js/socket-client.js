const socket = io();

export const sendMessage = (event, data) => {
  socket.emit(event, data);
};

export const onMessage = (event, callback) => {
  socket.on(event, callback);
};

export default socket;
