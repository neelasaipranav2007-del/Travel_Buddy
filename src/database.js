const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "..", "travelbuddy.db"));
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS passengers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS shuttles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slot TEXT NOT NULL CHECK(slot IN ('Morning','Afternoon','Evening')),
  route TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK(capacity > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  passenger_id INTEGER NOT NULL,
  shuttle_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(passenger_id) REFERENCES passengers(id),
  FOREIGN KEY(shuttle_id) REFERENCES shuttles(id)
);
`);

const count = db.prepare("SELECT COUNT(*) AS n FROM shuttles").get().n;
if (count === 0) {
  const add = db.prepare(
    "INSERT INTO shuttles(name,slot,route,departure_time,capacity) VALUES(?,?,?,?,?)",
  );
  add.run(
    "Campus Express",
    "Morning",
    "Main Gate → Academic Block",
    "08:30 AM",
    30,
  );
  add.run(
    "City Connector",
    "Afternoon",
    "Campus → Bus Station",
    "01:30 PM",
    25,
  );
  add.run(
    "Evening Shuttle",
    "Evening",
    "Academic Block → Main Gate",
    "05:15 PM",
    20,
  );
  add.run("North Route", "Morning", "North Hostel → Campus", "09:00 AM", 18);
}
module.exports = db;
