import { CROPS, type CropKind } from '../lib/farm';
import { Icon } from '../icons';
/** A fruit from the farm, drawn with the same picture as its word on the learning path. */
export function CropBadge({kind}:{kind:CropKind}) {return <span aria-hidden className={`berry-badge berry-${kind}`} style={{background:`color-mix(in srgb, ${CROPS[kind].color} 22%, white)`}}><Icon name={kind} size={30}/></span>;}
