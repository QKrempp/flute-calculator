import { frequencyToNearestNoteName, noteNameToFrequency } from './notes';

/** A hole layout preset: a scale above the lowest note, or free note entry. */
export type ScaleType = 'pentatonic' | 'diatonic' | 'chromatic' | 'free';

/** Selectable scale types, in dropdown order. */
export const SCALE_TYPES: ScaleType[] = ['pentatonic', 'diatonic', 'chromatic', 'free'];

/** Semitone offsets of each scale's holes above the lowest note, from the bell. */
const SCALE_SEMITONE_OFFSETS: Record<Exclude<ScaleType, 'free'>, number[]> = {
	pentatonic: [2, 4, 7, 9],
	diatonic: [2, 4, 5, 7, 9, 11],
	chromatic: [1, 2, 3, 4, 5, 6]
};

/** Suggests the hole note names of a flute in the given scale, above its lowest note. */
export function suggestHoleNotes(
	lowestNoteName: string,
	scale: ScaleType,
	tuning: number = 440
): string[] {
	const offsets = SCALE_SEMITONE_OFFSETS[scale as Exclude<ScaleType, 'free'>];
	if (!offsets) {
		throw new Error(`Gamme inconnue : « ${scale} »`);
	}
	const lowestFrequency = noteNameToFrequency(lowestNoteName, tuning);
	return offsets.map((offset) =>
		frequencyToNearestNoteName(lowestFrequency * 2 ** (offset / 12), tuning)
	);
}
