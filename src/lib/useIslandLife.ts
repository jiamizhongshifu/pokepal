import type { WeatherKind } from './weather';
import { activeResidentIds } from './activeResidents';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Capture } from '../types';
import { getCreature } from '../data/creatures';
import { placeById, whereNow, type Visit } from '../island/world';

/**
 * Who is where on the island: each companion at its home or favourite place, moved by time of day and weather
 * (`whereNow`), unless the child invited it somewhere or it is in shared play. Derived only; no save mutation.
 */
export function useIslandLife(captures: Capture[], now: Date, paused: boolean, careId?: number, group: Visit[] = [], focus: readonly (number | null | undefined)[] = [], weather: WeatherKind = 'sunny') {
 const [request, setRequest] = useState<{ stationId: string; pokemonId: number; nonce: number } | null>(null);
 const [arrivals, setArrivals] = useState<Record<number, string>>({});
 const [timedOut, setTimedOut] = useState(false);
 const nonceRef = useRef(0);
 const previous = useRef<number[]>([]);
 const ids = import.meta.env.VITE_ONLINE ? activeResidentIds(captures.map(c => c.id), previous.current, [...focus, careId, request?.pokemonId, ...group.map(v => v.pokemonId)]) : captures.map(c => c.id);
 previous.current = ids;
 const residentKey = ids.join(',');
 const residents = useMemo(() => ids.map(id => captures.find(c => c.id === id)!), [residentKey, captures]); // eslint-disable-line react-hooks/exhaustive-deps
 const cycle = Math.floor(now.getTime() / 120000), hour = now.getHours() + now.getMinutes() / 60;
 const visits = useMemo(() => {
  if (paused) return [];
  const result: Visit[] = group.filter(v => captures.some(c => c.id === v.pokemonId));
  const asked = request && placeById(request.stationId);
  if (!group.length && request && asked && captures.some(c => c.id === request.pokemonId)) result.push({ station: { ...asked, id: request.stationId }, pokemonId: request.pokemonId, manual: true, key: `manual-${request.nonce}` });
  for (const c of residents) {
   if (result.some(v => v.pokemonId === c.id)) continue;
   const p = getCreature(c.id), station = whereNow(p.species, hour, weather, cycle, c.id);
   result.push({ station, pokemonId: c.id, manual: false, key: `auto-${cycle}-${station.id}` });
  }
  return result;
  // Time changes within one two-minute cycle don't restart a journey.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [residentKey, cycle, Math.floor(hour * 2), weather, request, paused, careId, group.map(v => v.key).join(',')]);
 const arrive = useCallback((id: number, key: string, ready: boolean) => setArrivals(old => {
  const value = ready ? key : '';
  return old[id] === value ? old : { ...old, [id]: value };
 }), []);
 const active = visits.filter(v => arrivals[v.pokemonId] === v.key);
 const ready = !!request && arrivals[request.pokemonId] === `manual-${request.nonce}`;
 useEffect(() => {
  if (!request || ready) return;
  // Bound a journey that never finishes; never claim arrival or consume a resource on timeout.
  const timer = setTimeout(() => { setRequest(old => old?.nonce === request.nonce ? null : old); setTimedOut(true); }, 90_000);
  return () => clearTimeout(timer);
 }, [request, ready]);
 /** Invite a companion to a place: the one asked for, the next one when cycling, or whoever lives closest to it. */
 const invite = (stationId: string, cyclePartner = false, preferredId?: number) => {
  const place = placeById(stationId);
  if (!place || !captures.length) return null;
  const byHome = [...captures].map(c => getCreature(c.id)).sort((a, b) => Number(whereNow(b.species, hour, weather).district === place.district) - Number(whereNow(a.species, hour, weather).district === place.district));
  const i = cyclePartner && request ? byHome.findIndex(p => p.id === request.pokemonId) + 1 : 0;
  const p = preferredId === undefined ? byHome[i % byHome.length] : byHome.find(p => p.id === preferredId);
  const nonce = nonceRef.current = Math.max(Date.now(), nonceRef.current + 1);
  setTimedOut(false);
  setRequest(p ? { stationId, pokemonId: p.id, nonce } : null);
  return p ? { pokemon: p, nonce } : null;
 };
 return { residents, visits, active, arrive, invite, request, timedOut, cancel: () => { setRequest(null); setTimedOut(false); }, manual: visits.find(v => v.manual) };
}
