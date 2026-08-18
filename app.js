// Empty Classroom Finder - a browser-only Firebase Realtime Database client.
// Firebase compat scripts are included by index.html so this also runs from file:// URLs.

const firebaseConfig = {
  apiKey: 'AIzaSyBlLGeXkizR4L5-G5_GsF0GBI3D3aZgysg', authDomain: 'timetable-40bca.firebaseapp.com',
  databaseURL: 'https://timetable-40bca-default-rtdb.firebaseio.com', projectId: 'timetable-40bca',
  storageBucket: 'timetable-40bca.firebasestorage.app', messagingSenderId: '1084592474468', appId: '1:1084592474468:web:fd626ff21104851fadd271'
};
const database = firebase.database(firebase.initializeApp(firebaseConfig));
const blockSelect = document.querySelector('#blockSelect');
const daySelect = document.querySelector('#daySelect'); const slotSelect = document.querySelector('#slotSelect');
const refreshButton = document.querySelector('#refreshButton'); const connectionStatus = document.querySelector('#connectionStatus');
const summary = document.querySelector('#summary'); const freeCount = document.querySelector('#freeCount'); const roomList = document.querySelector('#roomList');
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SLOT_TIMES = {
  '1': '9:00 - 9:45', '2': '9:50 - 10:35', '3': '10:40 - 11:25',
  '4': '11:30 - 12:15', '5': '12:15 - 13:00', '6': '13:00 - 13:45',
  '7': '13:50 - 14:35', '8': '14:40 - 15:25', '9': '15:30 - 16:15'
};
let timetable = {}; let stopListening = null; let connectionTimer = null;
blockSelect.addEventListener('change', renderRooms);
daySelect.addEventListener('change', () => { populateSlots(); renderRooms(); });
slotSelect.addEventListener('change', renderRooms); refreshButton.addEventListener('click', connectToTimetable); connectToTimetable();

/** Opens one real-time listener; Firebase pushes later timetable changes automatically. */
function connectToTimetable() {
  stopListening?.(); clearTimeout(connectionTimer); setStatus('loading', 'Connecting to timetable…'); blockSelect.disabled = true; daySelect.disabled = true; slotSelect.disabled = true;
  const root = database.ref();
  const onData = snapshot => {
    clearTimeout(connectionTimer);
    timetable = getTimetableRoot(snapshot.val()); const rooms = Object.keys(timetable);
    if (!rooms.length) return showNoData('No classrooms found. Add data under /timetable or at the database root.');
    populateBlocks(rooms); populateDays(rooms); populateSlots(); blockSelect.disabled = false; daySelect.disabled = false; slotSelect.disabled = false;
    setStatus('connected', `Live timetable connected · ${rooms.length} classrooms`); renderRooms();
  };
  const onError = error => { clearTimeout(connectionTimer); console.error(error); setStatus('error', 'Unable to read the timetable'); showNoData(error.code === 'PERMISSION_DENIED' ? 'Firebase denied access. Update your Realtime Database rules to allow this app to read timetable data.' : `Firebase error: ${error.message}`); };
  root.on('value', onData, onError);
  stopListening = () => root.off('value', onData);
  connectionTimer = setTimeout(() => {
    setStatus('error', 'Firebase did not respond');
    showNoData('Still waiting for Firebase. Check your internet connection and Realtime Database read rules, then press Refresh.');
  }, 15000);
}

/** Accepts either /timetable/{room}/... or the room map directly at the database root. */
function getTimetableRoot(data) { if (!data || typeof data !== 'object') return {}; return data.timetable && typeof data.timetable === 'object' ? data.timetable : data; }
function getBlock(room) { return room.match(/-B(\d+)$/i)?.[1] || 'Other'; }
function populateBlocks(rooms) {
  const blocks = [...new Set(rooms.map(getBlock))].sort(numericSort);
  const values = ['All blocks', ...blocks.map(block => block === 'Other' ? block : `Block ${block}`)];
  if (!values.includes(blockSelect.value)) fillSelect(blockSelect, values, 'All blocks');
}
function populateDays(rooms) { const values = DAYS.filter(day => rooms.some(room => timetable[room]?.[day])); if (!values.includes(daySelect.value)) fillSelect(daySelect, values, values[0]); }
function populateSlots() {
  const values = [...new Set(Object.values(timetable).flatMap(schedule => Object.keys(schedule?.[daySelect.value] || {})))].sort(numericSort);
  if (!values.includes(slotSelect.value)) fillSelect(slotSelect, values, values[0], slot => SLOT_TIMES[slot] || `Slot ${slot}`);
}
function fillSelect(select, values, selected, label = value => value) { select.replaceChildren(...values.map(value => new Option(label(value), value, false, value === selected))); }
function numericSort(a, b) { return Number(a) - Number(b); }

/** A false value is available. Missing schedule data is deliberately not guessed to be free. */
function renderRooms() {
  const day = daySelect.value; const slot = slotSelect.value; if (!day || !slot) return showNoData('Choose a day and slot.');
  const selectedBlock = blockSelect.value;
  const freeRooms = Object.entries(timetable).filter(([room, schedule]) => (selectedBlock === 'All blocks' || selectedBlock === `Block ${getBlock(room)}` || (selectedBlock === 'Other' && getBlock(room) === 'Other')) && schedule?.[day] && schedule[day][slot] === false).map(([room]) => room).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  summary.textContent = `${selectedBlock} · ${day} · ${SLOT_TIMES[slot] || `Slot ${slot}`}`; freeCount.textContent = freeRooms.length; roomList.replaceChildren();
  if (!freeRooms.length) return showNoData('No free classrooms are recorded for this time.');
  freeRooms.forEach(room => { const item = document.createElement('div'); item.className = 'room'; item.textContent = `Room ${room.replace(/-B\d+$/i, '')} · B${getBlock(room)}`; roomList.append(item); });
}
function showNoData(message) { summary.textContent = message; freeCount.textContent = '–'; roomList.replaceChildren(); const item = document.createElement('p'); item.className = 'empty'; item.textContent = message; roomList.append(item); }
function setStatus(type, message) { connectionStatus.className = `status ${type}`; connectionStatus.textContent = message; }
