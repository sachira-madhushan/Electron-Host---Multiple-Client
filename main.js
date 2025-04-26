const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dgram = require('dgram');
const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        return config.address;
      }
    }
  }
  return '0.0.0.0';
}

let role = null; // Will be 'host' or 'client'
let hostIP = null;

function startUDPListener(window) {
  const udpClient = dgram.createSocket('udp4');

  udpClient.on('message', (msg, rinfo) => {
    const message = msg.toString();
    if (message.startsWith('I_AM_HOST')) {
      if (!role) { // Only set role if it is not already set
        hostIP = message.split(':')[1];
        role = 'client';
        console.log(`[UDP CLIENT] Host detected at: ${hostIP}`);
        window.webContents.send('role', role);
        window.webContents.send('host-ip', hostIP);
        udpClient.close(); // Stop listening once we know
      }
    }
  });

  udpClient.bind(4000, () => {
    console.log('[UDP CLIENT] Listening for Host on port 4000');
  });

  // After 5 seconds, if no host detected, become Host
  setTimeout(() => {
    if (!role) {
      role = 'host';
      hostIP = getLocalIP();
      console.log('[UDP CLIENT] No host found, becoming Host');
      startUDPBroadcast(window);
      window.webContents.send('role', role);
      window.webContents.send('host-ip', hostIP);
      udpClient.close();
    }
  }, 5000);
}

function startUDPBroadcast(window) {
  const udpHost = dgram.createSocket('udp4');

  setInterval(() => {
    const ip = getLocalIP();
    const message = Buffer.from(`I_AM_HOST:${ip}`);
    udpHost.send(message, 0, message.length, 4000, '255.255.255.255');
  }, 2000);

  udpHost.bind(() => {
    udpHost.setBroadcast(true);
    console.log('[UDP HOST] Broadcasting I_AM_HOST every 2s');
  });
}

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  win.loadURL('http://localhost:4173/');

  startUDPListener(win); // Start by listening
});
