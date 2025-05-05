const sqlite3 = require('sqlite3').verbose();
const path=require('path')

const dbPath = path.join(__dirname, '../db/localDB.db');
const db = new sqlite3.Database(dbPath);

const getAllPosts = (req, res) => {
    db.all('SELECT * FROM posts', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({posts:rows});
    });
};

const createPost = (req, res) => {
    const { title, body } = req.body;
    if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required' });
    }

    const sync_status = 'pending';

    db.run(
        'INSERT INTO posts (title, body, sync_status) VALUES (?, ?, ?)',
        [title, body, sync_status],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            db.all('SELECT * FROM posts', [], (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({posts:rows});
            });
        }
    );
};

const updatePost = (req, res) => {
    const { id } = req.params;
    const { title, body } = req.body;

    if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required' });
    }

    db.run(
        'UPDATE posts SET title = ?, body = ? WHERE id = ?',
        [title, body, id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Post not found' });
            }
            res.json({ id, title, body });
        }
    );
};

const deletePost = (req, res) => {
    const { id } = req.params;

    db.run(
        'UPDATE posts SET sync_status = ? WHERE id = ?',
        ['deleted', id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Post not found' });
            }
            db.all('SELECT * FROM posts', [], (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({posts:rows});
            });
        }
    );
};

module.exports = {
    getAllPosts,
    createPost,
    updatePost,
    deletePost,
};
