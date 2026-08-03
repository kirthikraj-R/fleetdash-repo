const STATE_CODE_BY_HUB = {
  Delhi: 'DL',
  Mumbai: 'MH',
  Bengaluru: 'KA',
  Kolkata: 'WB',
  Chennai: 'TN',
  Hyderabad: 'TS',
  Pune: 'MH',
  Ahmedabad: 'GJ',
  Jaipur: 'RJ',
  Lucknow: 'UP',
};

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function initials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Deterministic Indian-style mobile number derived from the vehicle ID, so it's stable across renders. */
export function driverPhone(vehicleId) {
  const h = hashString(vehicleId);
  const prefix = [90, 91, 92, 93, 94, 95, 96, 97, 98, 99][h % 10];
  const rest = String(1000000 + (h % 9000000)).padStart(8, '0').slice(0, 8);
  return `+91 ${prefix}${rest.slice(0, 3)} ${rest.slice(3, 8)}`;
}

/** Deterministic Indian-style license plate derived from the vehicle ID and assigned city hub. */
export function licensePlate(vehicleId, hubName) {
  const stateCode = STATE_CODE_BY_HUB[hubName] || 'IN';
  const h = hashString(vehicleId + hubName);
  const rto = String(1 + (h % 60)).padStart(2, '0');
  const letters = String.fromCharCode(65 + (h % 26)) + String.fromCharCode(65 + ((h >> 4) % 26));
  const digits = String(1000 + (h % 9000));
  return `${stateCode} ${rto} ${letters} ${digits}`;
}
