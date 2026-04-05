export type UnitSystem = 'imperial' | 'metric';

// Distance: meters -> miles or km
export function formatDistance(meters: number, units: UnitSystem, decimals = 1): string {
  if (units === 'imperial') {
    return (meters / 1609.344).toFixed(decimals);
  }
  return (meters / 1000).toFixed(decimals);
}

export function distanceUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'mi' : 'km';
}

// Pace: sec/km -> min:ss/mile or min:ss/km
export function formatPace(secPerKm: number, units: UnitSystem): string {
  const secPer = units === 'imperial' ? secPerKm * 1.60934 : secPerKm;
  const min = Math.floor(secPer / 60);
  const sec = Math.round(secPer % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function paceUnit(units: UnitSystem): string {
  return units === 'imperial' ? '/mi' : '/km';
}

// Elevation: meters -> feet or meters
export function formatElevation(meters: number, units: UnitSystem): string {
  if (units === 'imperial') {
    return Math.round(meters * 3.28084).toLocaleString();
  }
  return Math.round(meters).toLocaleString();
}

export function elevationUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'ft' : 'm';
}

// Speed: m/s -> mph or kph
export function formatSpeed(mps: number, units: UnitSystem): string {
  if (units === 'imperial') {
    return (mps * 2.23694).toFixed(1);
  }
  return (mps * 3.6).toFixed(1);
}

export function speedUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'mph' : 'kph';
}

// Temperature: celsius -> fahrenheit or celsius
export function formatTemp(celsius: number, units: UnitSystem): string {
  if (units === 'imperial') {
    return Math.round(celsius * 9 / 5 + 32).toString();
  }
  return Math.round(celsius).toString();
}

export function tempUnit(units: UnitSystem): string {
  return units === 'imperial' ? '°F' : '°C';
}

// Weight: kg -> lbs or kg
export function formatWeight(kg: number, units: UnitSystem): string {
  if (units === 'imperial') {
    return (kg * 2.20462).toFixed(1);
  }
  return kg.toFixed(1);
}

export function weightUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'lbs' : 'kg';
}

// Duration formatting
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
