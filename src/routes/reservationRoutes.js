const express = require("express");
const db = require("../database");
const { validateReservation } = require("../validation");
const router = express.Router();

router.get("/", (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (status && !["active", "cancelled"].includes(status))
    return res
      .status(400)
      .json({ success: false, message: "Invalid reservation status." });
  let sql = `SELECT r.id,r.status,r.created_at,p.id passenger_id,p.name passenger_name,p.email,p.phone,
    s.id shuttle_id,s.name shuttle_name,s.slot,s.route,s.departure_time
    FROM reservations r JOIN passengers p ON p.id=r.passenger_id JOIN shuttles s ON s.id=r.shuttle_id
    WHERE (p.name LIKE ? OR s.name LIKE ?)`;
  const args = [`%${q}%`, `%${q}%`];
  if (status) {
    sql += " AND r.status=?";
    args.push(status);
  }
  sql += " ORDER BY r.id DESC";
  res.json({ success: true, data: db.prepare(sql).all(...args) });
});
router.post("/", (req, res) => {
  const error = validateReservation(req.body);
  if (error) return res.status(400).json({ success: false, message: error });
  const passenger = db
    .prepare("SELECT * FROM passengers WHERE id=?")
    .get(Number(req.body.passengerId));
  if (!passenger)
    return res
      .status(404)
      .json({ success: false, message: "Passenger not found." });
  const shuttle = db
    .prepare("SELECT * FROM shuttles WHERE id=?")
    .get(Number(req.body.shuttleId));
  if (!shuttle)
    return res
      .status(404)
      .json({ success: false, message: "Shuttle not found." });
  db.exec("BEGIN IMMEDIATE");
  try {
    const active = db
      .prepare(
        "SELECT COUNT(*) n FROM reservations WHERE passenger_id=? AND status='active'",
      )
      .get(passenger.id).n;
    if (active >= 3) {
      db.exec("ROLLBACK");
      return res
        .status(409)
        .json({
          success: false,
          message:
            "Limit of 3 reached. A passenger can hold at most 3 active reservations.",
        });
    }
    const booked = db
      .prepare(
        "SELECT COUNT(*) n FROM reservations WHERE shuttle_id=? AND status='active'",
      )
      .get(shuttle.id).n;
    if (booked >= shuttle.capacity) {
      db.exec("ROLLBACK");
      return res
        .status(409)
        .json({
          success: false,
          message: "This shuttle has no seats available.",
        });
    }
    const result = db
      .prepare("INSERT INTO reservations(passenger_id,shuttle_id) VALUES(?,?)")
      .run(passenger.id, shuttle.id);
    db.exec("COMMIT");
    return res
      .status(201)
      .json({
        success: true,
        message: "Reservation created.",
        data: { id: Number(result.lastInsertRowid) },
      });
  } catch (e) {
    try {
      db.exec("ROLLBACK");
    } catch (_) {}
    return res
      .status(500)
      .json({ success: false, message: "Could not create reservation." });
  }
});
router.patch("/:id/cancel", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1)
    return res
      .status(400)
      .json({ success: false, message: "Invalid reservation ID." });
  const row = db.prepare("SELECT * FROM reservations WHERE id=?").get(id);
  if (!row)
    return res
      .status(404)
      .json({ success: false, message: "Reservation not found." });
  if (row.status === "cancelled")
    return res
      .status(409)
      .json({ success: false, message: "Reservation is already cancelled." });
  db.prepare("UPDATE reservations SET status='cancelled' WHERE id=?").run(id);
  res.json({
    success: true,
    message: "Reservation cancelled. One passenger booking slot is now free.",
  });
});
module.exports = router;
