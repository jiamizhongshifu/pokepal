/** Keep the same residents until a child summons another one. Collection is never changed. */
export function activeResidentIds(owned:readonly number[], previous:readonly number[], priority:readonly (number|null|undefined)[], limit=12):number[]{
 const available=new Set(owned),chosen=new Set<number>();
 for(const id of priority)if(id!=null&&available.has(id))chosen.add(id);
 // Explicit interactions take precedence, including both partners of a shared activity.
 const budget=Math.max(limit,chosen.size);
 for(const id of [...previous,...owned])if(chosen.size<budget&&available.has(id))chosen.add(id);
 // Preserve stable component order and facility assignment for unchanged residents.
 return [...previous.filter(id=>chosen.delete(id)),...chosen];
}
