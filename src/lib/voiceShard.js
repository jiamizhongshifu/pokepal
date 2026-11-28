// @ts-check
export const VOICE_SHARD_COUNT = 256;

/** Existing releases hash UTF-16 code units, including both halves of a surrogate pair.
 * @param {string} key
 */
export function voiceShard(key) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  }
  return (hash >>> 0) % VOICE_SHARD_COUNT;
}
