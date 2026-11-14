const express = require("express");
const db = require("../database");
const { validateShuttle } = require("../validation");
const router = express.Router();

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1)
    return res
      .status(400)
      .json({ success: false, message: "Invalid shuttle ID." });
  const row = db
    .prepare(
      `SELECT s.*,(SELECT COUNT(*) FROM reservations r WHERE r.shuttle_id=s.id AND r.status='active') AS booked
    FROM shuttles s WHERE s.id=?`,
    )
    .get(id);
  if (!row)
    return res
      .status(404)
      .json({ success: false, message: "Shuttle not found." });
  res.json({ success: true, data: row });
});
router.get("/", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const slot = typeof req.query.slot === "string" ? req.query.slot.trim() : "";
  if (slot && !["Morning", "Afternoon", "Evening"].includes(slot))
    return res
      .status(400)
      .json({ success: false, message: "Invalid time slot." });
  let sql = `SELECT s.*,(SELECT COUNT(*) FROM reservations r WHERE r.shuttle_id=s.id AND r.status='active') AS booked
    FROM shuttles s WHERE (s.name LIKE ? OR s.route LIKE ?)`;
  const args = [`%${q}%`, `%${q}%`];
  if (slot) {
    sql += " AND s.slot=?";
    args.push(slot);
  }
  sql += " ORDER BY s.id DESC";
  res.json({ success: true, data: db.prepare(sql).all(...args) });
});
router.post("/", (req, res) => {
  const error = validateShuttle(req.body);
  if (error) return res.status(400).json({ success: false, message: error });
  const r = db
    .prepare(
      "INSERT INTO shuttles(name,slot,route,departure_time,capacity) VALUES(?,?,?,?,?)",
    )
    .run(
      req.body.name.trim(),
      req.body.slot,
      req.body.route.trim(),
      req.body.departureTime.trim(),
      Number(req.body.capacity),
    );
  res
    .status(201)
    .json({
      success: true,
      message: "Shuttle created.",
      data: { id: Number(r.lastInsertRowid) },
    });
});
router.put("/:id", (req, res) => {
  const id = Number(req.params.id),
    error = validateShuttle(req.body);
  if (!Number.isInteger(id) || id < 1)
    return res
      .status(400)
      .json({ success: false, message: "Invalid shuttle ID." });
  if (error) return res.status(400).json({ success: false, message: error });
  const old = db.prepare("SELECT * FROM shuttles WHERE id=?").get(id);
  if (!old)
    return res
      .status(404)
      .json({ success: false, message: "Shuttle not found." });
  const booked = db
    .prepare(
      "SELECT COUNT(*) n FROM reservations WHERE shuttle_id=? AND status='active'",
    )
    .get(id).n;
  if (Number(req.body.capacity) < booked)
    return res
      .status(409)
      .json({
        success: false,
        message: "Capacity cannot be lower than current active bookings.",
      });
  db.prepare(
    "UPDATE shuttles SET name=?,slot=?,route=?,departure_time=?,capacity=? WHERE id=?",
  ).run(
    req.body.name.trim(),
    req.body.slot,
    req.body.route.trim(),
    req.body.departureTime.trim(),
    Number(req.body.capacity),
    id,
  );
  res.json({ success: true, message: "Shuttle updated." });
});
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const old = db.prepare("SELECT id FROM shuttles WHERE id=?").get(id);
  if (!old)
    return res
      .status(404)
      .json({ success: false, message: "Shuttle not found." });
  const used = db
    .prepare("SELECT COUNT(*) n FROM reservations WHERE shuttle_id=?")
    .get(id).n;
  if (used)
    return res
      .status(409)
      .json({
        success: false,
        message: "Shuttle has reservation history and cannot be deleted.",
      });
  db.prepare("DELETE FROM shuttles WHERE id=?").run(id);
  res.json({ success: true, message: "Shuttle deleted." });
});
module.exports = router;
