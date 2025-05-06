const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs'); // Add fs module
const os = require('os');
const multer = require('multer');
const moment = require('moment-timezone');

const homeDir = os.homedir();
const documentsDir = path.join(homeDir, 'Documents', 'CrudPWAAPP');
const dbPath = path.join(documentsDir, 'localDB.db');

const db = new sqlite3.Database(dbPath);

let downloadsFolder = path.join(os.homedir(), 'Downloads');

const uploadDir = path.join(os.homedir(), 'Documents', 'CrudPWAAPP');

const upload = multer({ dest: uploadDir});

function backup(req, res) {
    const timestamp = moment().tz('Asia/Colombo').format('YYYY-MM-DD HH_mm_ss');
    const backupFileName = `backup-${timestamp}.db`;
    const backupFilePath = path.join(downloadsFolder, backupFileName);

    fs.copyFile(dbPath, backupFilePath, (err) => {
        if (err) {
            return res.status(500).send('Error creating backup: ' + err.message);
        }
        res.send(`Backup successful! Database saved to ${backupFilePath}`);
    });
}


function restore(req, res) {
    const file = req.file;

    if (!file) {
        return res.status(400).send('No file uploaded.');
    }

    fs.copyFile(file.path, dbPath, (err) => {
        if (err) {
            return res.status(500).send('Error restoring database: ' + err.message);
        }

        
        fs.unlinkSync(file.path);

        res.send('Database restored successfully!');
    });
}

module.exports = { backup, restore };
