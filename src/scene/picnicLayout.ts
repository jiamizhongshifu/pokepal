/** One composition for the default picnic, upgrades and optional table. */
export function picnicLayout(table: boolean, level: number) {
  return {
    clothWidth: level > 0 ? 2.7 : 2.5,
    clothDepth: level > 0 ? 1.8 : 1.5,
    cushionX: 1.02,
    // Local Y above the cloth; table top is .35 including its ground offset.
    bookY: table ? .365 : .04,
    bookZ: table ? -.22 : .16,
    snackY: table ? .37 : .085,
    snackZ: table ? .3 : .66,
  };
}
