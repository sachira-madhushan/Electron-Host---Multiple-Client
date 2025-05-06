const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const os = require('os');

const homeDir = os.homedir();
const documentsDir = path.join(homeDir, 'Documents', 'CrudPWAAPP');
const dbPath = path.join(documentsDir, 'localDB.db');

const db = new sqlite3.Database(dbPath);

function getData(req, res) {
    db.all("SELECT * FROM data", (err, rows) => {
        if (err) {
            res.status(500).send({ message: "Error while fetching data" });
        } else {
            res.json({
                data: rows[0]
            })
        }
    });
}

function setData(req, res) {
    const { expire_date,type,email} = req.body;

    db.all("SELECT * FROM data", (err, rows) => {
        if (rows.length > 0) {
            const stmt = db.prepare("UPDATE data SET expire_date=?,type=?,email=? where id=1");
            stmt.run(expire_date,type,email);

            stmt.finalize();
        } else {
            const stmt = db.prepare("INSERT INTO data (id,expire_date,type,email) VALUES (1,?,?,?)");
            stmt.run(expire_date,type,email);
            stmt.finalize();
        }
    });

    res.send({ message: "Data updated successfully" });

}

module.exports = { getData, setData };