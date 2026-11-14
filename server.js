const express = require("express");
const path = require("path");
require("./src/database");
const passengerRoutes = require("./src/routes/passengerRoutes");
const shuttleRoutes = require("./src/routes/shuttleRoutes");
const reservationRoutes = require("./src/routes/reservationRoutes");
const db = require("./src/database");
const app = express(),
  PORT = process.env.PORT || 3000;
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.get("/api/health", (req, res) =>
  res.json({ success: true, message: "TravelBuddy Cabs API is running." }),
);
app.get("/api/dashboard", (req, res) => {
  const passengers = db.prepare("SELECT COUNT(*) n FROM passengers").get().n;
  const shuttles = db.prepare("SELECT COUNT(*) n FROM shuttles").get().n;
  const active = db
    .prepare("SELECT COUNT(*) n FROM reservations WHERE status='active'")
    .get().n;
  const cancelled = db
    .prepare("SELECT COUNT(*) n FROM reservations WHERE status='cancelled'")
    .get().n;
  const recent = db
    .prepare(
      `SELECT r.id,r.status,r.created_at,p.name passenger_name,s.name shuttle_name,s.slot
   FROM reservations r JOIN passengers p ON p.id=r.passenger_id JOIN shuttles s ON s.id=r.shuttle_id
   ORDER BY r.id DESC LIMIT 6`,
    )
    .all();
  res.json({
    success: true,
    data: { passengers, shuttles, active, cancelled, recent },
  });
});
app.use("/api/passengers", passengerRoutes);
app.use("/api/shuttles", shuttleRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api", (req, res) =>
  res.status(404).json({ success: false, message: "API endpoint not found." }),
);
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Unexpected server error." });
});
app.listen(PORT, () =>
  console.log(`TravelBuddy Cabs is running at http://localhost:${PORT}`),
);
