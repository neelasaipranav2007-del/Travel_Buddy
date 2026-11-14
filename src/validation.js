const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validatePassenger(data) {
  if (!data || typeof data.name !== "string" || data.name.trim().length < 2)
    return "Name must contain at least 2 characters.";
  if (data.name.trim().length > 60) return "Name cannot exceed 60 characters.";
  if (typeof data.email !== "string" || !emailPattern.test(data.email.trim()))
    return "Enter a valid email address.";
  if (
    typeof data.phone !== "string" ||
    !/^[0-9+\-\s()]{7,18}$/.test(data.phone.trim())
  )
    return "Enter a valid phone number.";
  return null;
}
function validateShuttle(data) {
  if (!data || typeof data.name !== "string" || data.name.trim().length < 2)
    return "Shuttle name must contain at least 2 characters.";
  if (!["Morning", "Afternoon", "Evening"].includes(data.slot))
    return "Choose Morning, Afternoon or Evening.";
  if (typeof data.route !== "string" || data.route.trim().length < 3)
    return "Enter a valid shuttle route.";
  if (typeof data.departureTime !== "string" || !data.departureTime.trim())
    return "Enter a departure time.";
  const capacity = Number(data.capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 200)
    return "Capacity must be between 1 and 200.";
  return null;
}
function validateReservation(data) {
  if (
    !Number.isInteger(Number(data?.passengerId)) ||
    Number(data.passengerId) < 1
  )
    return "Select a passenger.";
  if (!Number.isInteger(Number(data?.shuttleId)) || Number(data.shuttleId) < 1)
    return "Select a shuttle.";
  return null;
}
module.exports = { validatePassenger, validateShuttle, validateReservation };
