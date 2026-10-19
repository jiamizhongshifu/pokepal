// A closed vocabulary: never accept lesson/Pokemon IDs, results, words or free text.
export const INTERACTION_EVENTS=[
 'trainer_created','lesson_started','lesson_completed','practice_started','practice_completed',
 'review_started','review_completed','energy_earned','ball_exchange_started','ball_exchanged',
 'capture_started','capture_succeeded','story_started','story_completed',
 'together_started','together_completed','together_timeout','companion_interacted',
 'help_opened','family_tip_opened','rest_shown','learning_settings_saved',
 'author_contact_opened','source_repository_opened','feedback_copied',
] as const;
export type InteractionEvent=typeof INTERACTION_EVENTS[number];
const allowed=new Set<string>(INTERACTION_EVENTS);
export function interactionEvent(value:unknown):InteractionEvent|null{return typeof value==='string'&&allowed.has(value)?value as InteractionEvent:null;}
