const { app, BrowserWindow } = require('electron');
const path = require('path');
const dgram = require('dgram');
const os = require('os');
const express = require('express');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const [name, iface] of Object.entries(interfaces)) {
    if (name.toLowerCase().includes("wi-fi")) {
      for (const config of iface) {
        if (config.family === 'IPv4' && !config.internal) {
          return config.address;
        }
      }
    }
  }
  for (const iface of Object.values(interfaces)) {
    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        return config.address;
      }
    }
  }

  return '0.0.0.0';
}

let role = null;
let hostIP = null;

function sendToFrontend(window, role, hostIP) {
  const script = `
    window.dispatchEvent(new CustomEvent('role', { detail: '${role}' }));
    window.dispatchEvent(new CustomEvent('host-ip', { detail: '${hostIP}' }));
  `;
  window.webContents.executeJavaScript(script).catch((err) =>
    console.error("Failed to inject script:", err)
  );
}

function startUDPListener(window) {
  const udpClient = dgram.createSocket('udp4');
  let attempts = 0;
  const maxAttempts = 5;

  const interval = setInterval(() => {
    attempts++;
    if (role) {
      clearInterval(interval);
      udpClient.close();
      return;
    }

    if (attempts >= maxAttempts) {
      role = 'host';
      hostIP = getLocalIP();
      console.log('[UDP CLIENT] No host found after 5s, becoming Host');
      startUDPBroadcast();

      sendToFrontend(window, role, hostIP);
      clearInterval(interval);
      udpClient.close();
      startRestAPI(hostIP);
    }
  }, 1000);

  udpClient.on('message', (msg) => {
    const message = msg.toString();
    if (message.startsWith('I_AM_HOST') && !role) {
      hostIP = message.split(':')[1];
      role = 'client';
      console.log(`[UDP CLIENT] Host detected at: ${hostIP}`);
      sendToFrontend(window, role, hostIP);
      clearInterval(interval);
      udpClient.close();
    }
  });

  udpClient.bind(4000, () => {
    console.log('[UDP CLIENT] Listening for host on port 4000...');
  });
}

function startUDPBroadcast() {

  const udpHost = dgram.createSocket('udp4');

  setInterval(() => {
    const ip = getLocalIP();
    const message = Buffer.from(`I_AM_HOST:${ip}`);
    const broadcastIP = ip.split('.').slice(0, 3).join('.') + '.255';
    console.log(broadcastIP);

    try {
      udpHost.send(message, 0, message.length, 4000, broadcastIP);

    } catch (err) {
      console.error(err)
    }
  }, 1000);

  udpHost.bind(() => {
    udpHost.setBroadcast(true);
    console.log('[UDP HOST] Broadcasting I_AM_HOST every 1s');
  });
}

function startRestAPI(hostIP) {
  const app = express();
  const port = 3000;

  app.get('/', (req, res) => {
    res.send('Hello from the host API server!');
  });

  app.get('/login', (req, res) => {
    res.json({ "message": "Hello from local backend" });
  });

  app.listen(port, hostIP, () => {
    console.log(`[REST API] Server started at http://${hostIP}:${port}`);
  });
}

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  win.loadURL('https://pwa-crud-new-auth.netlify.app');

  startUDPListener(win);
});
