// In-memory store — replace with DB later
const users = new Map();       // id -> user object
const attendance = new Map();  // `${userId}_${date}` -> record

let idCounter = 1;
const newId = () => String(idCounter++);

module.exports = { users, attendance, newId };
