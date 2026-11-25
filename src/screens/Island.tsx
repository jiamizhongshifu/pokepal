import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useEvent } from '../lib/hooks';
import { useGame } from '../store';
import { BottomNav } from '../components/BottomNav';
import { ParentButton } from '../components/TopBar';
import { MusicToggle } from '../components/MusicToggle';
import { CreatureImg } from '../components/CreatureImg';
import { Evolution } from '../components/Evolution';
import { LearningArt } from '../components/LearningItem';
import { IslandErrandSession } from '../components/IslandErrandSession';
import { IslandPartySession } from '../components/IslandPartySession';
import { IslandPlaySession } from '../components/IslandPlaySession';
import { IslandAskRound } from '../components/IslandAskRound';
import { GardenPlots } from '../island/GardenPlots';
import { BallTurns } from '../island/BallTurns';
import { Confetti } from '../components/Celebration';
import { InviteBerry } from '../components/InviteBerry';
import { FeatureGuide } from '../components/FeatureGuide';
import { ScrollPeek } from '../components/ScrollPeek';
import { firstFruitUnit, plantAsk, seedOf, type IslandAsk } from '../lib/islandAsk';
import type { CropKind } from '../lib/farm';
import { Icon } from '../icons';
import { withTransition } from '../lib/viewTransition';
import { learningPath, pathNodes, withReview, withWelcomeFriend } from '../lib/learningPath';
import { BEHAVIORS } from '../data/behaviors';
import { creatureArt, creatureExpression, getCreature } from '../data/creatures';
import { sceneEdge, storyBackground, storyProp } from '../data/sceneArt';
import { SceneFill } from '../components/SceneFill';
import { IslandDepth } from '../island/IslandDepth';
import { bi } from '../lib/bi';
import { nextDistrict, stationDistrict, unlockedDistricts, unlockingUnit } from '../lib/islandPlan';
import { cryOnIsland, sayOnIsland as say } from '../lib/islandSpeech';
import { learningVoice } from '../lib/learningVoice';
import { skyFor } from '../lib/routine';
import { sfx, stopSpeech } from '../lib/speech';
import { weatherAt } from '../lib/weather';
import { shownTraces } from '../island/errands';
import { learnedKeys, readyToGrow } from '../island/plays';
import { ISLAND_DAY, SCENES, dayDone, inviteKey, islandDone, islandInvites, scenePlays, sceneThings, type Invite, type Standing } from '../island/scenes';
import { shownStickers } from '../island/stickers';
import { DISTRICTS, PLACES, placeOf, placesIn, whereNow, type District, type Spot } from '../island/world';
import '../island/island-home.css';

const RESIDENTS = 12, REACT_MS = 1400, PERIOD = 20 * 60 * 1000;
/** Where a scene's things lie and where its friends stand, in % of the scene. */
const THING_SPOTS: Spot[] = [[13, 74], [29, 86], [44, 76], [59, 88], [73, 76], [88, 86], [94, 68], [5, 90]];
const FRIEND_SPOTS: Spot[] = [[50, 62], [26, 60], [74, 60], [88, 52]];
/** The garden keeps its middle for the plots: one friend helps at the side, the things lie in a row in front. */
const GARDEN_FRIEND: Spot[] = [[16, 62]], GARDEN_THINGS: Spot[] = [0, 1, 2, 3, 4, 5].map(i => [9 + i * 16.4, 90] as const);
const SOIL = { icon: 'seed', label: '地里' };
/** At a party the other friends stand behind, watching. */
const GUEST_SPOTS: Spot[] = [[38, 50], [54, 47], [70, 50], [86, 47]];
const side = (spot: Spot, slot: number, of: number): Spot => of < 2 ? spot : [spot[0] + (slot - (of - 1) / 2) * 5.5, spot[1] + (slot % 2) * 1.5];

/**
 * The island: an overview to look around, and five scenes to step into. A child only taps: a place to walk in, a
 * friend to hear it, a thing to hear its name, the picture above a friend to do that with it. Nothing needs reading.
 */
export function Island({ initialStation, initialCompanion, active = true }: { initialStation?: string; initialCompanion?: number; active?: boolean }) {
 const save = useGame(s => s.save), go = useGame(s => s.go);
 const [now, setNow] = useState(() => Date.now());
 const [district, setDistrict] = useState<District | null>(null);
 const [session, setSession] = useState<Invite | null>(null);
 const [react, setReact] = useState<{ id: number | string; at: number } | null>(null);
 const [nudged, setNudged] = useState<District | null>(null);
 // A closed area, once tapped, offers its lesson: a second tap goes there.
 const [armed, setArmed] = useState<District | null>(null), armTicket = useRef(0);
 const [evolving, setEvolving] = useState<number | null>(null);
 const [asleep, setAsleep] = useState(false), [party, setParty] = useState(false);
 const [planting, setPlanting] = useState<{ index: number; ask: IslandAsk } | null>(null);
 const view = useRef<HTMLDivElement>(null), world = useRef<HTMLDivElement>(null);
 // When the island is wider than the screen (a tall phone), start in its middle.
 useEffect(() => { const v = view.current; if (v && v.scrollWidth > v.clientWidth) v.scrollLeft = (v.scrollWidth - v.clientWidth) / 2; }, [district, active]);
 const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
 const later = (run: () => void, ms: number) => { timers.current.push(setTimeout(run, ms)); };
 useEffect(() => () => timers.current.forEach(clearTimeout), []);
 useEffect(() => { if (!active) return; setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, [active]);
 useEffect(() => { if (!active) { setSession(null); setPlanting(null); stopSpeech(); } }, [active]);

 const open = useMemo(() => unlockedDistricts(save), [save]);
 const sky = skyFor(new Date(now)), weather = weatherAt(now, save.settings.islandWeather ?? 'auto');
 const residents = useMemo(() => { const fav = save.settings.favorites; return [...save.captures].sort((a, b) => Number(fav.includes(b.id)) - Number(fav.includes(a.id))).slice(0, RESIDENTS); }, [save.captures, save.settings.favorites]);
 const standing: Standing[] = useMemo(() => {
  const date = new Date(now), hour = date.getHours() + date.getMinutes() / 60, cycle = Math.floor(now / PERIOD);
  return residents.map(c => { const species = getCreature(c.id).species, place = whereNow(species, hour, weather.kind, cycle, c.id); return { id: c.id, species, place: open.has(place.district) ? place.id : 'tent' }; });
 }, [residents, now, weather.kind, open]);
 const invites = useMemo(() => islandInvites(save, standing, save.daily.date, now), [save, standing, now]);
 const stickers = useMemo(() => shownStickers(save), [save]);

 const enter = (d: District) => {
  stopSpeech();
  if (open.has(d)) { sfx('click'); withTransition(() => { setSession(null); setDistrict(d); }); return; }
  const unit = unlockingUnit(d);
  if (unit && armed === d) {
   // The lesson opens only when the learning path itself lets it; otherwise the path shows where the child is.
   sfx('click'); armTicket.current++; setArmed(null);
   const stop = pathNodes(withWelcomeFriend(save, withReview(save, learningPath(save)))).find(n => n.kind === 'lesson' && n.unit?.id === unit.id);
   if (stop && stop.state !== 'locked') useGame.getState().startUnit(unit.id); else go({ name: 'home' });
   return;
  }
  sfx('boop'); setNudged(d); later(() => setNudged(n => n === d ? null : n), 700);
  if (unit) { const ticket = ++armTicket.current; setArmed(d); later(() => { if (armTicket.current === ticket) setArmed(null); }, 8000); void say(['zh', unit.mission]); }
 };
 const begin = (invite: Invite) => { if (invite.partner === undefined) return; stopSpeech(); sfx('sparkle'); withTransition(() => { setDistrict(invite.district); setSession(invite); }); };
 // The way back: out of what is being done first, then out of the scene.
 const leave = () => { stopSpeech(); sfx('click'); withTransition(() => { if (session || planting) { setSession(null); setPlanting(null); } else { setDistrict(null); setAsleep(false); } }); };
 // The third thing of the day: back on the island everyone cheers, once.
 const done = islandDone(save), cheered = useRef(done);
 useEffect(() => {
  if (district || !active || done <= cheered.current) return;
  cheered.current = done;
  if (done < ISLAND_DAY) return;
  setParty(true); sfx('sparkle'); void say(['en', 'You did it!']); later(() => setParty(false), 3200);
 }, [district, active, done]);

 // The path's island stop hands over a place: walk into its scene and start the lesson's errand there.
 const enterStation = useEvent((station: string) => {
  const d = stationDistrict(station);
  if (!d || !open.has(d)) return;
  const waiting = islandInvites(save, standing, save.daily.date).find(i => i.kind === 'errand' && i.district === d);
  setDistrict(d); setSession(waiting ?? null);
 });
 useEffect(() => { if (active && initialStation) enterStation(initialStation); }, [initialStation, active, enterStation]);
 const meetCompanion = useEvent((id: number) => {
  const friend = standing.find(f => f.id === id);
  if (friend) { setSession(null); setDistrict(placeOf(friend.place).district); }
 });
 useEffect(() => { if (active && initialCompanion !== undefined) meetCompanion(initialCompanion); }, [initialCompanion, active, meetCompanion]);

 const grows = (id: number) => { const c = save.captures.find(c => c.id === id), creature = getCreature(id); return !!c && readyToGrow(c, creature.stage) && !c.stay && creature.evolvesTo.some(to => !save.captures.some(x => x.id === to)); };
 const tapFriend = (id: number) => {
  if (grows(id)) { stopSpeech(); setEvolving(id); return; }
  stopSpeech(); sfx('pop'); setReact({ id, at: Date.now() }); later(() => setReact(r => r?.id === id ? null : r), REACT_MS);
  const trait = BEHAVIORS[id]?.trait;
  void cryOnIsland(id).then(() => { if (trait) void say(...bi(['en', trait.en], ['zh', trait.zh])); });
 };
 const tapThing = (key: string, en: string) => {
  const entry = sceneThings(save, district!).find(t => t.entry.key === key);
  if (!entry?.learned) { sfx('boop'); setReact({ id: key, at: Date.now() }); later(() => setReact(r => r?.id === key ? null : r), 500); void say(['zh', '学到它，它就会亮起来。']); return; }
  stopSpeech(); sfx('pop'); setReact({ id: key, at: Date.now() }); later(() => setReact(r => r?.id === key ? null : r), 900);
  void say(...learningVoice(entry.entry)).then(heard => { if (heard) useGame.getState().noteWord(en, 'heard'); });
 };

 // An empty plot: the friend names a fruit the child has learned, and that one is planted. Before any fruit word
 // is learned, the plot says which lesson brings the first seed.
 const plant = (index: number) => {
  const ask = plantAsk(save, seedOf(`plot-${index}-${Math.floor(Date.now() / 60000)}`));
  if (ask) { sfx('click'); setPlanting({ index, ask }); return; }
  sfx('boop'); const unit = firstFruitUnit(); if (unit) void say(['zh', unit.mission]);
 };
 const corner = <div className="island-corner"><FeatureGuide id="island" enabled={active && evolving === null && save.captures.length > 0} /><MusicToggle /><ParentButton onOpen={() => go({ name: 'parent' })} /></div>;
 const growing = evolving !== null && <Evolution from={getCreature(evolving)} options={getCreature(evolving).evolvesTo.filter(id => !save.captures.some(c => c.id === id)).map(getCreature)}
  onDone={to => { const from = evolving; setEvolving(null); if (to) useGame.getState().evolve(from, to); else useGame.getState().stayAsIs(from); }} />;

 if (district) {
  const here = standing.filter(f => placeOf(f.place).district === district);
  const partner = session?.partner;
  const garden = district === 'garden', friendSpots = garden ? GARDEN_FRIEND : FRIEND_SPOTS, thingSpots = garden ? GARDEN_THINGS : THING_SPOTS, busy = !!session || !!planting;
  const friends = [...new Set([...(partner !== undefined ? [partner] : []), ...here.map(f => f.id), ...(here.length ? [] : residents.slice(0, 1).map(c => c.id))])].slice(0, friendSpots.length);
  const guests = session?.kind === 'party' ? residents.map(c => c.id).filter(id => id !== partner).slice(0, GUEST_SPOTS.length) : [];
  const waiting = invites.filter(i => i.district === district);
  const ball = district === 'play' && learnedKeys(save).has('ball') && friends.length > 0;
  // The ball lies in the middle of the front; the other things keep clear of it.
  const spots = ball ? thingSpots.filter((_, i) => i !== 2 && i !== 3) : thingSpots;
  const things = sceneThings(save, district).filter(t => !(ball && t.entry.key === 'ball')).slice(0, spots.length);
  const plays = scenePlays(save, district).filter(p => !waiting.some(i => i.kind === 'play' && i.play.id === p.id));
  return <div className={`screen island-home is-scene sky-${asleep ? 'night' : sky}`}>
   <div className={`island-scene${busy ? ' is-busy' : ''}`} style={{ backgroundImage: `url(${storyBackground(SCENES[district].background)})` }}>
    <button type="button" className="island-back" aria-label={busy ? '先不做了' : '回到小岛'} onClick={leave}><Icon name={busy ? 'back' : 'island'} size={48} /></button>
    {!busy && things.map((t, i) => <button key={t.entry.key} type="button" className={`island-thing${t.learned ? '' : ' is-shadow'}${react?.id === t.entry.key ? ' is-tapped' : ''}`}
     style={{ left: `${spots[i][0]}%`, top: `${spots[i][1]}%` }} aria-label={t.learned ? `${t.entry.zh} ${t.entry.en}` : '还没学到的东西'} onClick={() => tapThing(t.entry.key, t.entry.en)}>
     <LearningArt entry={t.entry} />
    </button>)}
    {friends.map((id, i) => {
     const creature = getCreature(id), invite = !busy && !asleep ? waiting.find(w => w.partner === id) ?? (i === 0 ? waiting.find(w => !friends.includes(w.partner!)) : undefined) : undefined;
     const leading = busy && id === (partner ?? friends[0]);
     if (busy && !leading) return null;
     const spot = leading ? [16, 62] as const : friendSpots[i];
     return <div key={id} className={`island-friend${leading ? ' is-leading' : ''}${grows(id) ? ' is-growing' : ''}`} style={{ left: `${spot[0]}%`, top: `${spot[1]}%` }}>
      {invite && <button type="button" className={`island-invite${invite.lesson ? ' is-lesson' : ''}`} aria-label="和它一起做这件事" onClick={() => begin({ ...invite, partner: id })}><Icon name={invite.icon} size={56} /></button>}
      <button type="button" className="island-friend-body" aria-label={`${creature.nameZh} ${creature.nameEn}`} onClick={() => tapFriend(id)}>
       <CreatureImg src={react?.id === id ? creatureExpression(id, 'giggle') : asleep ? creatureExpression(id, 'sleepy') : creatureArt(id)} alt="" />
      </button>
     </div>;
    })}
    {garden && !busy && friends.length > 0 && <GardenPlots helper={friends[0]} onPlant={plant} />}
    {guests.map((id, i) => <div key={`guest-${id}`} className="island-friend is-guest" style={{ left: `${GUEST_SPOTS[i][0]}%`, top: `${GUEST_SPOTS[i][1]}%` }}><span className="island-friend-body"><CreatureImg src={creatureExpression(id, 'cheer')} alt="" /></span></div>)}
    {ball && !busy && <BallTurns friend={friends[0]} />}
    {district === 'beach' && !busy && save.balls.poke > 0 && <button type="button" className="beach-boat" aria-label="小船来了，去迎接新朋友" onClick={() => { stopSpeech(); sfx('sparkle'); go({ name: 'catch' }); }}><img src={storyProp('visit-boat')} alt="" /><span className="island-invite is-lesson"><InviteBerry type="poke" size={56} /></span></button>}
    {!busy && plays.length > 0 && friends.length > 0 && <nav className="island-shelf" aria-label="在这里可以一起做的事">
     {plays.map(p => <button key={p.id} type="button" aria-label={p.title} onClick={() => begin({ kind: 'play', play: p, district, place: p.place, partner: friends[0], icon: p.icon, lesson: false })}><Icon name={p.icon} size={52} /></button>)}
    </nav>}
    {session && partner !== undefined && <section className="island-stage" aria-label="一起做的事">
     {session.kind === 'party' ? <IslandPartySession key={inviteKey(session)} party={session.party} partner={partner} station={session.place} onClose={() => withTransition(() => setSession(null))} />
      : session.kind === 'errand' ? <IslandErrandSession key={inviteKey(session)} errand={session.errand} partner={partner} station={session.place} onClose={() => withTransition(() => setSession(null))} onRoute={() => { stopSpeech(); go({ name: 'home' }); }} />
      : <IslandPlaySession key={inviteKey(session)} play={session.play} partner={partner} station={session.place} onClose={() => withTransition(() => setSession(null))} onFinished={play => { if (play.sleeps) setAsleep(true); }} />}
    </section>}
    {planting && friends.length > 0 && <section className="island-stage" aria-label="种一种水果">
     <IslandAskRound key={`plant-${planting.index}`} ask={planting.ask} speaker={friends[0]} station="farm" kind="do" to={SOIL} onClose={() => setPlanting(null)}
      onSolved={id => { useGame.getState().plantCrop(planting.index, id as CropKind); setPlanting(null); }} />
    </section>}
    <div className="island-tint" aria-hidden="true" />
   </div>
   {active && evolving === null && friends.length > 0 && <div className="island-scene-help"><FeatureGuide id={busy ? 'islandDo' : garden ? 'garden' : 'scene'} autoOpen={busy || garden || things.some(t => t.learned)} /></div>}
   {growing}
  </div>;
 }

 const groups = new Map<string, number[]>();
 for (const f of standing) groups.set(f.place, [...(groups.get(f.place) ?? []), f.id]);
 return <div className={`screen island-home sky-${sky}${weather.cloud > 0.55 ? ' is-cloudy' : ''}`}>
  <div className="island-view scene-host" ref={view} style={sceneEdge('island-map')}>
   <div className="island-world" ref={world} role="group" aria-label="我的小岛">
    <IslandDepth world={world} scroller={view} props={stickers} nudged={nudged} active={active} />
    {shownTraces(save, now).map(t => <span key={t.id} className="island-world-trace" role="img" aria-label={t.label} style={{ left: `${t.spot[0]}%`, top: `${t.spot[1]}%` }}><Icon name={t.icon} size={30} /></span>)}
    {PLACES.map(p => { const locked = !open.has(p.district); return <button key={p.id} type="button" className={`island-place${locked ? ' is-locked' : ''}${nudged === p.district ? ' is-nudged' : ''}`} style={{ left: `${p.spot[0]}%`, top: `${p.spot[1]}%` }} aria-label={locked ? `${p.name}（还没开放）` : `走进${p.name}`} onClick={() => enter(p.district)} />; })}
    {(() => {
     // Areas the path has not opened are simply quiet; only the next one shows a sign saying it opens with learning.
     const d = nextDistrict(save), places = d ? placesIn(d) : [];
     if (!d || !places.length) return null;
     const at = [places.reduce((n, p) => n + p.spot[0], 0) / places.length, places.reduce((n, p) => n + p.spot[1], 0) / places.length];
     return <button type="button" className={`island-teaser${nudged === d ? ' is-nudged' : ''}`} style={{ left: `${at[0]}%`, top: `${at[1]}%` }} aria-label={armed === d ? `${DISTRICTS.find(x => x.id === d)?.name}，再点一下去学这一课` : `${DISTRICTS.find(x => x.id === d)?.name}，学到这里就开放`} onClick={() => enter(d)}>
      <Icon name="lock" size={30} /><span><b>{DISTRICTS.find(x => x.id === d)?.name}</b><small>{armed === d ? '再点一下，去学这一课' : '学到这里就开放'}</small></span>
      {armed === d && <span className="island-teaser-go" aria-hidden="true"><Icon name="play" size={26} /></span>}
     </button>;
    })()}
    {standing.map(f => {
     const group = groups.get(f.place)!, spot = side(placeOf(f.place).spot, group.indexOf(f.id), group.length), creature = getCreature(f.id);
     const invite = invites.find(i => i.partner === f.id);
     return <div key={f.id} className={`island-walker${grows(f.id) ? ' is-growing' : ''}`} style={{ left: `${spot[0]}%`, top: `${spot[1]}%`, '--size': `${[11, 13, 15][creature.stage - 1] ?? 11}%` } as CSSProperties}>
      {invite && <button type="button" className={`island-invite${invite.lesson ? ' is-lesson' : ''}`} aria-label="和它一起做这件事" onClick={() => begin(invite)}><Icon name={invite.icon} size={40} /></button>}
      <button type="button" className="island-walker-body" aria-label={`${creature.nameZh} ${creature.nameEn}`} onClick={() => enter(placeOf(f.place).district)}><CreatureImg src={party ? creatureExpression(f.id, 'cheer') : creatureArt(f.id)} alt="" /></button>
     </div>;
    })}
    <div className="island-tint" aria-hidden="true" />
   </div>
   <SceneFill scene="island-map" />
   {active && save.captures.length === 0 && <button type="button" className="island-first-friend" aria-label="去海边迎接新朋友" onClick={() => go({ name: 'catch' })}><img src={storyProp('visit-boat')} alt="" /><Icon name="play" size={44} /></button>}
  </div>
  {active && <ScrollPeek target={view} watch={district} />}
  {save.captures.length > 0 && <ol className={`island-day${dayDone(save) ? ' is-done' : ''}`} aria-label={`今天在小岛做了 ${done} 件事，一共 ${ISLAND_DAY} 件`}>{Array.from({ length: ISLAND_DAY }, (_, i) => <li key={i} className={i < done ? 'is-done' : undefined}><Icon name={i < done ? 'star' : 'star-empty'} size={40} /></li>)}</ol>}
  {party && <Confetti />}
  {corner}
  <BottomNav active="island" />
  {growing}
 </div>;
}
