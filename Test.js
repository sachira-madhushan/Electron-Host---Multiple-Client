const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();

  console.log(interfaces)
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

getLocalIP();