import { BERRIES, type BerryKind } from '../lib/farm';
export function BerryBadge({kind}:{kind:BerryKind}) {return <span aria-hidden className={`berry-badge berry-${kind}`} style={{background:BERRIES[kind].color}}><i/></span>;}
