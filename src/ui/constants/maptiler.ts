const DEFAULT_MAP_STYLE = 'streets-v2';
const OPEN_STREET_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const apiKey = process.env.EXPO_PUBLIC_MAPTILER_KEY;
const mapStyle = process.env.EXPO_PUBLIC_MAPTILER_STYLE || DEFAULT_MAP_STYLE;

export const MAPTILER_TILE_URL = apiKey
  ? `https://api.maptiler.com/maps/${mapStyle}/{z}/{x}/{y}.png?key=${apiKey}`
  : OPEN_STREET_TILE_URL;

export const MAPTILER_STYLE_NAME = mapStyle;
export const HAS_MAPTILER_KEY = Boolean(apiKey);
