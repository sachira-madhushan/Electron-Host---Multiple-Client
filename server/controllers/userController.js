const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '../db/localDB.db');
const db = new sqlite3.Database(dbPath);

function getUsers(req, res) {
    db.all("SELECT * FROM users", (err, rows) => {
        if (err) {
            res.status(500).send({ message: "Error while fetching users" });
        } else {
            res.json({
                users:rows
            })
        }
    });
}

function createUser(req, res) {
    const { name, email, password, role } = req.body;

    const stmt = db.prepare("INSERT INTO users (name, email,password,role) VALUES (?, ?,?,?)");
    stmt.run(name, email, password, role);
    stmt.finalize();

    db.all("SELECT * FROM users", (err, rows) => {
        if (err) {
            res.status(500).send({ message: "Error while creating a user" });
        } else {
            res.status(201).send({ 
                users:rows,
                message: "User created successfully" });

        }
    });

}

module.exports={createUser,getUsers};