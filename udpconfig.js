// udpconfig.js
// Solo UDP host/port (sin MySQL)
module.exports = {
  UDP_HOST: process.env.UDP_HOST || "0.0.0.0",
  UDP_PORT: Number(process.env.UDP_PORT || 9007),
};
