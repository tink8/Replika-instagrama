const db = require("../config/db");


// blokiranje korisnika
exports.blockUser = (req, res) => {

    const { blockerId, blockedId } = req.body;

    const query = `
        INSERT INTO blocks (blocker_id, blocked_id)
        VALUES (?, ?)
    `;

    db.query(query, [blockerId, blockedId], (err, result) => {

        if (err) {
            return res.status(500).json({ error: err });
        }

        res.json({
            message: "User blocked successfully"
        });

    });

};


// odblokiranje korisnika
exports.unblockUser = (req, res) => {

    const { blockerId, blockedId } = req.body;

    const query = `
        DELETE FROM blocks
        WHERE blocker_id = ? AND blocked_id = ?
    `;

    db.query(query, [blockerId, blockedId], (err, result) => {

        if (err) {
            return res.status(500).json({ error: err });
        }

        res.json({
            message: "User unblocked successfully"
        });

    });

};


// proverava blok
exports.checkBlock = (req, res) => {

    const { userA, userB } = req.query;

    const query = `
        SELECT * FROM blocks
        WHERE blocker_id = ? AND blocked_id = ?
    `;

    db.query(query, [userA, userB], (err, result) => {

        if (err) {
            return res.status(500).json({ error: err });
        }

        if (result.length > 0) {
            return res.json({ blocked: true });
        }

        res.json({ blocked: false });

    });

};