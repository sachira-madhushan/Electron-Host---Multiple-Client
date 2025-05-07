const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const cron = require('node-cron');
const path = require('path');
const os=require('os');
const CLOUD_URL = 'https://react-pwa-crud-backend-auth.onrender.com/api/v1/posts/sync';

const homeDir = os.homedir();
const documentsDir = path.join(homeDir, 'Documents', 'CrudPWAAPP');
const dbPath = path.join(documentsDir, 'localDB.db');
const db = new sqlite3.Database(dbPath);

function syncPosts() {
    db.get(`SELECT * FROM data LIMIT 1`, [], (err, row) => {
        if (err) {
            console.error("Error fetching data row:", err.message);
            return;
        }

        if (!row || row.type !== 1) {
            console.log(`[${new Date().toISOString()}] Sync skipped (offline mode or missing row).`);
            return;
        }

        const email = row.email;

        db.all(`SELECT * FROM posts`, [], (err, posts) => {
            if (err) {
                console.error("Error fetching posts:", err.message);
                return;
            }

            if (!posts || posts.length === 0) {
                console.log(`[${new Date().toISOString()}] No posts to sync.`);
                return;
            }

            axios.post(CLOUD_URL, {
                posts: posts,
                email: email
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(response => {
                if (response.status === 200) {
                    const toSync = posts.filter(p => p.sync_status !== 'deleted');
                    const toDelete = posts.filter(p => p.sync_status === 'deleted');

                    if (toSync.length > 0) {
                        const idsToSync = toSync.map(p => p.id);
                        const placeholders = idsToSync.map(() => '?').join(',');
                        const updateQuery = `UPDATE posts SET sync_status = 'synced' WHERE id IN (${placeholders})`;
                        db.run(updateQuery, idsToSync, function (err) {
                            if (err) {
                                console.error("Failed to update sync status:", err.message);
                            } else {
                                console.log(`[${new Date().toISOString()}] Synced ${idsToSync.length} posts.`);
                            }
                        });
                    }
                    if (toDelete.length > 0) {
                        const idsToDelete = toDelete.map(p => p.id);
                        const placeholders = idsToDelete.map(() => '?').join(',');
                        const deleteQuery = `DELETE FROM posts WHERE id IN (${placeholders})`;
                        db.run(deleteQuery, idsToDelete, function (err) {
                            if (err) {
                                console.error("Failed to delete posts:", err.message);
                            } else {
                                console.log(`[${new Date().toISOString()}] Deleted ${idsToDelete.length} posts.`);
                            }
                        });
                    }
                } else {
                    console.error("Cloud server responded with status:", response.status);
                }
            }).catch(error => {
                console.error("Error during sync:", error);
            });
        });
    });
}

function startPostSyncCron() {
    cron.schedule('*/30 * * * *', () => {
        console.log(`[${new Date().toISOString()}] Running scheduled post sync...`);
        syncPosts();
    });

    syncPosts();
}

module.exports = startPostSyncCron;
