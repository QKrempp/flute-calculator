import { describe, expect, it } from 'vitest';
import { computeHolePlacements } from './instrument';
import { embouchureCorrection, type TubeSpec } from './design';
import { noteNameToFrequency } from './notes';

/** Empirical tuning margin of the book's maker, who tunes by ear (book pp. 32-33). */
const TOLERANCE_CM = 1.5;

/** A tone hole as documented in the book's instrument photos. */
interface BookHole {
	note: string;
	holeDiameter: number;
	distanceFromBell: number;
}

/** Checks that the model + deduced embouchure correction reproduce a book instrument. */
function checkBookFlute(tube: TubeSpec, lowestNote: string, holes: BookHole[]): void {
	const fundamental = noteNameToFrequency(lowestNote);
	const delta = embouchureCorrection(tube, fundamental);
	const specs = holes.map((hole) => ({
		frequency: noteNameToFrequency(hole.note),
		boreDiameter: tube.boreDiameter,
		holeDiameter: hole.holeDiameter,
		wallThickness: tube.wallThickness
	}));
	const design = computeHolePlacements(
		{ boreDiameter: tube.boreDiameter, resonator: 'open', lowestNoteFrequency: fundamental },
		specs
	);
	for (const placement of design.placements) {
		const hole = holes.find((entry) => noteNameToFrequency(entry.note) === placement.frequency);
		const bookPositionFromEmbouchure = tube.length - (hole?.distanceFromBell ?? Number.NaN);
		expect(Math.abs(placement.position - delta - bookPositionFromEmbouchure)).toBeLessThanOrEqual(
			TOLERANCE_CM
		);
	}
}

describe('book instrument fixtures (Building PVC Pipes Instruments)', () => {
	it('reproduces the chromojara-style end-blown flute in G (p.135, 25mm bore)', () => {
		const tube: TubeSpec = { length: 80.8, boreDiameter: 2.5, wallThickness: 0.15 };
		checkBookFlute(tube, 'Sol3', [
			{ note: 'Sol#3', holeDiameter: 1.05, distanceFromBell: 6.7 },
			{ note: 'La3', holeDiameter: 1.05, distanceFromBell: 10.9 },
			{ note: 'Sib3', holeDiameter: 1.05, distanceFromBell: 15.3 },
			{ note: 'Si3', holeDiameter: 1.05, distanceFromBell: 19.5 },
			{ note: 'Do4', holeDiameter: 1.05, distanceFromBell: 23.6 },
			{ note: 'Do#4', holeDiameter: 1.05, distanceFromBell: 27.2 }
		]);
	});

	it('reproduces the major diatonic end-blown flute in D (p.134, 20mm bore)', () => {
		const tube: TubeSpec = { length: 53, boreDiameter: 2, wallThickness: 0.15 };
		checkBookFlute(tube, 'Ré4', [
			{ note: 'Mi4', holeDiameter: 0.75, distanceFromBell: 8.55 },
			{ note: 'Fa#4', holeDiameter: 1.05, distanceFromBell: 12.8 },
			{ note: 'Sol4', holeDiameter: 0.75, distanceFromBell: 16 },
			{ note: 'La4', holeDiameter: 0.7, distanceFromBell: 21.5 },
			{ note: 'Si4', holeDiameter: 0.8, distanceFromBell: 25.3 },
			{ note: 'Do#5', holeDiameter: 0.8, distanceFromBell: 29.1 }
		]);
	});
});