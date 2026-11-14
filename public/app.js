const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
let passengers = [],
  shuttles = [],
  reservations = [],
  editing = null;
const initials = (name) =>
  String(name || "?")
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function toast(text, error = false) {
  const el = $("#toast");
  el.textContent = text;
  el.className = "show" + (error ? " error" : "");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => (el.className = ""), 3200);
}
async function api(url, opts = {}) {
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  let data = {};
  try {
    data = await r.json();
  } catch {}
  if (!r.ok) throw Error(data.message || `Request failed (${r.status})`);
  return data;
}
function setView(view) {
  $$(".view").forEach((x) =>
    x.classList.toggle("active", x.id === view + "-view"),
  );
  $$(".nav-item").forEach((x) =>
    x.classList.toggle("active", x.dataset.view === view),
  );
  $("#page-title").textContent = {
    overview: "Overview",
    reservations: "Reservations",
    passengers: "Passengers",
    shuttles: "Shuttle routes",
  }[view];
  if (view === "reservations") loadReservations();
  if (view === "passengers") loadPassengers();
  if (view === "shuttles") loadShuttles();
}
$$(".nav-item").forEach((b) =>
  b.addEventListener("click", () => setView(b.dataset.view)),
);
$$("[data-go]").forEach((b) =>
  b.addEventListener("click", () => setView(b.dataset.go)),
);
async function loadDashboard() {
  const r = await api("/api/dashboard"),
    d = r.data;
  $("#stat-passengers").textContent = d.passengers;
  $("#stat-shuttles").textContent = d.shuttles;
  $("#stat-active").textContent = d.active;
  $("#stat-cancelled").textContent = d.cancelled;
  $("#recent-list").innerHTML = d.recent.length
    ? d.recent
        .map(
          (x) =>
            `<div class="recent-row"><div class="mini-avatar">${initials(x.passenger_name)}</div><div><b>${esc(x.passenger_name)}</b><small>${esc(x.shuttle_name)} · ${esc(x.slot)}</small></div><time><span class="status ${x.status}">${x.status}</span></time></div>`,
        )
        .join("")
    : '<div class="empty">No reservations yet. Create your first booking.</div>';
}
async function loadPassengers() {
  const q = $("#passenger-search")?.value || "";
  const r = await api("/api/passengers?q=" + encodeURIComponent(q));
  passengers = r.data;
  $("#passenger-rows").innerHTML = passengers.length
    ? passengers
        .map(
          (p) =>
            `<tr><td><div class="person-cell"><div class="mini-avatar">${initials(p.name)}</div><b>${esc(p.name)}</b></div></td><td>${esc(p.email)}</td><td>${esc(p.phone)}</td><td>${p.active_reservations} / 3</td><td><div class="card-actions"><button data-edit-passenger="${p.id}">Edit</button><button data-delete-passenger="${p.id}">Delete</button></div></td></tr>`,
        )
        .join("")
    : '<tr><td colspan="5" class="empty">No passengers found.</td></tr>';
}
async function loadShuttles() {
  const q = $("#shuttle-search")?.value || "",
    slot = $("#shuttle-slot")?.value || "";
  const r = await api(
    "/api/shuttles?q=" +
      encodeURIComponent(q) +
      "&slot=" +
      encodeURIComponent(slot),
  );
  shuttles = r.data;
  $("#shuttle-cards").innerHTML = shuttles.length
    ? shuttles
        .map((s) => {
          const pct = Math.min(100, Math.round((s.booked / s.capacity) * 100));
          return `<article class="shuttle-card"><div class="shuttle-card-head"><div class="shuttle-symbol">⇄</div><span class="slot-pill">${esc(s.slot)}</span></div><h3>${esc(s.name)}</h3><p>${esc(s.route)}</p><div class="shuttle-meta"><span>Departure <b>${esc(s.departure_time)}</b></span><span>${s.booked} / ${s.capacity} seats</span></div><div class="capacity-track"><span style="width:${pct}%"></span></div><div class="shuttle-meta"><span>${pct}% occupied</span><div class="card-actions"><button data-edit-shuttle="${s.id}">Edit</button><button data-delete-shuttle="${s.id}">Delete</button></div></div></article>`;
        })
        .join("")
    : '<div class="panel empty">No shuttle routes found.</div>';
}
async function loadReservations() {
  const q = $("#reservation-search")?.value || "",
    status = $("#reservation-status")?.value || "";
  const r = await api(
    "/api/reservations?q=" +
      encodeURIComponent(q) +
      "&status=" +
      encodeURIComponent(status),
  );
  reservations = r.data;
  $("#reservation-rows").innerHTML = reservations.length
    ? reservations
        .map(
          (x) =>
            `<tr><td><div class="person-cell"><div class="mini-avatar">${initials(x.passenger_name)}</div><b>${esc(x.passenger_name)}</b></div></td><td>${esc(x.shuttle_name)}</td><td>${esc(x.slot)}</td><td>${esc(x.created_at)}</td><td><span class="status ${x.status}">${x.status}</span></td><td>${x.status === "active" ? `<button class="row-action" data-cancel="${x.id}">Cancel</button>` : "-"}</td></tr>`,
        )
        .join("")
    : '<tr><td colspan="6" class="empty">No reservations match your search.</td></tr>';
}
function field(
  name,
  label,
  type = "text",
  value = "",
  opts = null,
  full = false,
) {
  let html = opts
    ? `<select name="${name}" required>${opts.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(value) ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select>`
    : `<input name="${name}" type="${type}" value="${esc(value)}" ${type === "number" ? 'min="1" max="200"' : ""} required>`;
  return `<div class="field ${full ? "full" : ""}"><label>${label}</label>${html}</div>`;
}
function openModal(type, data = null) {
  editing = data ? { type, id: data.id } : null;
  $("#modal-title").textContent =
    (data ? "Edit " : "Add ") +
    {
      passenger: "passenger",
      shuttle: "shuttle route",
      reservation: "reservation",
    }[type];
  $("#modal-subtitle").textContent = data
    ? "Update the details and save your changes."
    : "Enter the details below. Fields marked by the form are required.";
  let html = "";
  if (type === "passenger")
    html = `<div class="field-grid">${field("name", "Full name", "text", data?.name || "")}${field("email", "Email address", "email", data?.email || "", null, true)}${field("phone", "Phone number", "tel", data?.phone || "", null, true)}</div>`;
  if (type === "shuttle")
    html = `<div class="field-grid">${field("name", "Shuttle name", "text", data?.name || "")}${field(
      "slot",
      "Time slot",
      "text",
      data?.slot || "Morning",
      [
        { value: "Morning", label: "Morning" },
        { value: "Afternoon", label: "Afternoon" },
        { value: "Evening", label: "Evening" },
      ],
    )}${field("route", "Route", "text", data?.route || "", null, true)}${field("departureTime", "Departure time", "text", data?.departure_time || "08:30 AM")}${field("capacity", "Seat capacity", "number", data?.capacity || 30)}</div>`;
  if (type === "reservation") {
    const pOpts = passengers.map((p) => ({
        value: p.id,
        label: p.name + " · " + p.email,
      })),
      sOpts = shuttles.map((s) => ({
        value: s.id,
        label: s.name + " · " + s.slot + " · " + s.departure_time,
      }));
    html = `<div class="field-grid">${field("passengerId", "Passenger", "text", "", pOpts, true)}${field("shuttleId", "Shuttle route", "text", "", sOpts, true)}</div><p class="note">A passenger can have up to 3 active reservations. A fourth booking will be rejected with HTTP 409.</p>`;
  }
  $("#modal-fields").innerHTML = html;
  $("#modal-backdrop").classList.add("open");
  $("#modal-form").dataset.type = type;
}
function closeModal() {
  $("#modal-backdrop").classList.remove("open");
  $("#modal-form").reset();
  editing = null;
}
async function prepareModal(type) {
  try {
    if (type === "reservation") {
      await loadPassengers();
      await loadShuttles();
    }
    openModal(type);
  } catch (e) {
    toast(e.message, true);
  }
}
$$("[data-modal]").forEach((b) =>
  b.addEventListener("click", () => prepareModal(b.dataset.modal)),
);
$("#quick-book").addEventListener("click", () => prepareModal("reservation"));
$("#modal-close").onclick = closeModal;
$("#modal-cancel").onclick = closeModal;
$("#modal-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "modal-backdrop") closeModal();
});
$("#modal-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const type = e.currentTarget.dataset.type,
    data = Object.fromEntries(new FormData(e.currentTarget));
  try {
    let url,
      method = "POST";
    if (editing) {
      url = `/api/${type === "passenger" ? "passengers" : "shuttles"}/${editing.id}`;
      method = "PUT";
    } else
      url = `/api/${type === "passenger" ? "passengers" : type === "shuttle" ? "shuttles" : "reservations"}`;
    await api(url, { method, body: JSON.stringify(data) });
    closeModal();
    toast(
      editing
        ? "Changes saved successfully."
        : type === "reservation"
          ? "Reservation created successfully."
          : type === "passenger"
            ? "Passenger added successfully."
            : "Shuttle route added successfully.",
    );
    await refreshAll();
    if (type === "reservation") setView("reservations");
    else if (type === "passenger") setView("passengers");
    else setView("shuttles");
  } catch (err) {
    toast(err.message, true);
  }
});
document.addEventListener("click", async (e) => {
  const cancel = e.target.closest("[data-cancel]");
  if (cancel) {
    if (!confirm("Cancel this reservation?")) return;
    try {
      await api("/api/reservations/" + cancel.dataset.cancel + "/cancel", {
        method: "PATCH",
      });
      toast("Reservation cancelled.");
      await refreshAll();
      loadReservations();
    } catch (err) {
      toast(err.message, true);
    }
  }
  const ep = e.target.closest("[data-edit-passenger]");
  if (ep) {
    const p = passengers.find((x) => x.id === Number(ep.dataset.editPassenger));
    openModal("passenger", p);
  }
  const es = e.target.closest("[data-edit-shuttle]");
  if (es) {
    const s = shuttles.find((x) => x.id === Number(es.dataset.editShuttle));
    openModal("shuttle", s);
  }
  const dp = e.target.closest("[data-delete-passenger]");
  if (dp) {
    if (
      !confirm(
        "Delete this passenger? This is only allowed when the passenger has no reservation history.",
      )
    )
      return;
    try {
      await api("/api/passengers/" + dp.dataset.deletePassenger, {
        method: "DELETE",
      });
      toast("Passenger deleted.");
      await loadPassengers();
      await loadDashboard();
    } catch (err) {
      toast(err.message, true);
    }
  }
  const ds = e.target.closest("[data-delete-shuttle]");
  if (ds) {
    if (
      !confirm(
        "Delete this shuttle? This is only allowed when it has no reservation history.",
      )
    )
      return;
    try {
      await api("/api/shuttles/" + ds.dataset.deleteShuttle, {
        method: "DELETE",
      });
      toast("Shuttle deleted.");
      await loadShuttles();
      await loadDashboard();
    } catch (err) {
      toast(err.message, true);
    }
  }
});
let searchTimer;
["#passenger-search", "#shuttle-search", "#reservation-search"].forEach((sel) =>
  $(sel).addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (sel === "#passenger-search") loadPassengers();
      if (sel === "#shuttle-search") loadShuttles();
      if (sel === "#reservation-search") loadReservations();
    }, 220);
  }),
);
$("#shuttle-slot").addEventListener("change", loadShuttles);
$("#reservation-status").addEventListener("change", loadReservations);
async function refreshAll() {
  await Promise.all([loadDashboard()]);
}
(async () => {
  try {
    await refreshAll();
  } catch (e) {
    toast(e.message, true);
  }
})();
