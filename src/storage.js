import { fresh, restore, serialize } from './sim.js';
export const SAVE_KEY = 'polar-camp-three-v2';
const valid = text => {
  if (!text) return null;
  const state = restore(text);
  // restore is intentionally forgiving; only accept an exact canonical round trip.
  try {
    const candidate = JSON.parse(text);
    return candidate?.version === 2 && JSON.stringify(candidate) === serialize(state) ? state : null;
  } catch { return null; }
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
