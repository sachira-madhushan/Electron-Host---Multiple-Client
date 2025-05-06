const { app, BrowserWindow } = require('electron');
const path = require('path');
const dgram = require('dgram');
const os = require('os');
const express = require('express');
const http = require('http');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const postSyncCron = require('./postSyncCron')

function startReactServer() {
  const port = 3011;
  const buildPath = path.join(__dirname, 'dist');
  copyDBToUserDocuments();
  const server = http.createServer((req, res) => {
    let filePath = path.join(buildPath, req.url === '/' ? 'index.html' : req.url);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
      } else {
        const extname = path.extname(filePath);
        let contentType = 'text/plain';
        if (extname === '.js') contentType = 'application/javascript';
        else if (extname === '.css') contentType = 'text/css';
        else if (extname === '.png') contentType = 'image/png';
        else if (extname === '.jpg') contentType = 'image/jpeg';
        else if (extname === '.html') contentType = 'text/html';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      }
    });
  });

  function copyDBToUserDocuments() {
    const dbFileName = '/server/db/localDB.db';

    const targetDir = path.join(os.homedir(), 'Documents', 'CrudPWAAPP');

    const targetPath = path.join(targetDir, path.basename(dbFileName));

    const sourcePath = path.join(__dirname, dbFileName);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`[DB COPY] Copied to: ${targetPath}`);
    } else {
      console.log(`[DB COPY] File already exists at: ${targetPath}`);
    }
  }

  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);


    const win = new BrowserWindow({
      width: 1000,
      height: 700,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });


    win.loadURL(`http://localhost:${port}`);
    startUDPListener(win);

  });
}


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
  const userRoutes = require('./server/routes/userRoutes')
  const dataRoutes = require('./server/routes/dataRoutes')
  const postRoutes = require('./server/routes/postRoutes')
  const backupRoutes = require('./server/routes/backupRoutes')

  const corsOptions = {
    allowedOrigins: [
      'http://localhost:3011',
    ],
    allowedHeaders: ['*'],
    credentials: true,
  };

  app.use(cors(corsOptions));
  app.options('/{*any}', cors(corsOptions));

  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.json());

  app.get('/', (req, res) => {
    res.send('Hello from the host API server!');
  });

  app.use('/api/users', userRoutes);

  app.use('/api/data', dataRoutes);

  app.use('/api/posts', postRoutes);

  app.use('/api/backup', backupRoutes);

  app.listen(port, hostIP, () => {
    console.log(`[REST API] Server started at http://${hostIP}:${port}`);

    postSyncCron();
  });
}

app.whenReady().then(() => {
  startReactServer();
});
