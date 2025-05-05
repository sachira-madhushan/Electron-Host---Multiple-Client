const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '../db/localDB.db');
const db = new sqlite3.Database(dbPath);

const moment = require('moment-timezone');

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

function loginLocalUsers(req, res) {
    const { email, password } = req.body;
    

    db.all("SELECT * FROM users WHERE email=? AND password=? LIMIT 1", [email, password], (err, rows) => {
        if (err) {
            res.status(500).send({ message: "Error while logging in" });
        } else if (rows.length > 0) {
            db.all("SELECT * FROM data", (err1, rows1) => {
                res.status(200).send({ message: "Login successful", user:{name:rows[0].name,email:rows[0].email,role:rows[0].role ,expire_date:rows1[0].expire_date,last_sync: moment.tz("Asia/Colombo").format("YYYY-MM-DD HH:mm:ss")} });
            });
            
        } else {
            res.status(401).send({ message: "Invalid email or password" });
        }
    });
}

module.exports={createUser,getUsers,loginLocalUsers};