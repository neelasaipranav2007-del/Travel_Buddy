const express = require("express");
const db = require("../database");
const { validatePassenger } = require("../validation");
const router = express.Router();

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1)
    return res
      .status(400)
      .json({ success: false, message: "Invalid passenger ID." });
  const row = db
    .prepare(
      `SELECT p.*,(SELECT COUNT(*) FROM reservations r WHERE r.passenger_id=p.id AND r.status='active') AS active_reservations
    FROM passengers p WHERE p.id=?`,
    )
    .get(id);
  if (!row)
    return res
      .status(404)
      .json({ success: false, message: "Passenger not found." });
  res.json({ success: true, data: row });
});
router.get("/", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const rows = db
    .prepare(
      `SELECT p.*, (SELECT COUNT(*) FROM reservations r WHERE r.passenger_id=p.id AND r.status='active') AS active_reservations
    FROM passengers p WHERE p.name LIKE ? OR p.email LIKE ? OR p.phone LIKE ? ORDER BY p.id DESC`,
    )
    .all(`%${q}%`, `%${q}%`, `%${q}%`);
  res.json({ success: true, data: rows });
});
router.post("/", (req, res) => {
  const error = validatePassenger(req.body);
  if (error) return res.status(400).json({ success: false, message: error });
  try {
    const result = db
      .prepare("INSERT INTO passengers(name,email,phone) VALUES(?,?,?)")
      .run(
        req.body.name.trim(),
        req.body.email.trim().toLowerCase(),
        req.body.phone.trim(),
      );
    res
      .status(201)
      .json({
        success: true,
        message: "Passenger added successfully.",
        data: db
          .prepare("SELECT * FROM passengers WHERE id=?")
          .get(result.lastInsertRowid),
      });
  } catch (e) {
    if (String(e.message).includes("UNIQUE"))
      return res
        .status(409)
        .json({ success: false, message: "This email is already registered." });
    res
      .status(500)
      .json({ success: false, message: "Unable to add passenger." });
  }
});
router.put("/:id", (req, res) => {
  const id = Number(req.params.id),
    error = validatePassenger(req.body);
  if (!Number.isInteger(id) || id < 1)
    return res
      .status(400)
      .json({ success: false, message: "Invalid passenger ID." });
  if (error) return res.status(400).json({ success: false, message: error });
  const existing = db.prepare("SELECT id FROM passengers WHERE id=?").get(id);
  if (!existing)
    return res
      .status(404)
      .json({ success: false, message: "Passenger not found." });
  try {
    db.prepare("UPDATE passengers SET name=?,email=?,phone=? WHERE id=?").run(
      req.body.name.trim(),
      req.body.email.trim().toLowerCase(),
      req.body.phone.trim(),
      id,
    );
    res.json({ success: true, message: "Passenger updated." });
  } catch (e) {
    res
      .status(409)
      .json({
        success: false,
        message: "Email is already used by another passenger.",
      });
  }
});
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT id FROM passengers WHERE id=?").get(id);
  if (!existing)
    return res
      .status(404)
      .json({ success: false, message: "Passenger not found." });
  const used = db
    .prepare("SELECT COUNT(*) n FROM reservations WHERE passenger_id=?")
    .get(id).n;
  if (used)
    return res
      .status(409)
      .json({
        success: false,
        message: "Passenger has reservation history and cannot be deleted.",
      });
  db.prepare("DELETE FROM passengers WHERE id=?").run(id);
  res.json({ success: true, message: "Passenger deleted." });
});
module.exports = router;
