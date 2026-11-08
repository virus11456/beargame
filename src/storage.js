import { fresh, parseSave, serialize } from './sim.js';
export const SAVE_KEY = 'polar-camp-three-v2';
const valid = text => {
  if (!text) return null;
  try { return parseSave(text); } catch { return null; }
};
export function loadGame(storage) {
  try {
    const primary = storage.getItem(SAVE_KEY);
    const loaded = valid(primary);
    if (loaded) return { state: loaded, notice: '' };
    const backup = valid(storage.getItem(SAVE_KEY + '-backup'));
    if (backup) return { state: backup, notice: '已從備份恢復營地進度。' };
    if (primary) storage.setItem(SAVE_KEY + '-damaged', primary);
    return { state: fresh(), notice: primary ? '存檔無法讀取，已保留損壞資料並建立新營地。' : '' };
  } catch { return { state: fresh(), notice: '無法使用瀏覽器儲存；本次進度可能無法保留。' }; }
}
export function saveGame(storage, state) {
  const previous = storage.getItem(SAVE_KEY);
  if (valid(previous)) storage.setItem(SAVE_KEY + '-backup', previous);
  storage.setItem(SAVE_KEY, serialize(state));
}
export function resetGame(storage, state) {
  storage.setItem(SAVE_KEY, serialize(state));
  storage.removeItem(SAVE_KEY + '-backup');
}

// Transfer codes let a camp move between devices without a server: the
// state is serialized without the prey and loot (they respawn) and encoded
// as base64 text the player can copy and paste.
const bytesToBase64 = bytes => { let bin = ''; for (const b of bytes) bin += String.fromCharCode(b); return btoa(bin); };
const base64ToBytes = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
export const exportCode = state => bytesToBase64(new TextEncoder().encode(serialize({ ...state, bears: [], drops: [], padLatch: null })));
export function importCode(text) {
  const clean = String(text || '').replace(/\s+/g, '');
  if (!clean) throw Error('empty');
  return parseSave(new TextDecoder().decode(base64ToBytes(clean)));
}
