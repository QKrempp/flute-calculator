import { computeHolePlacements, type ToneHolePlacement, type ToneHoleSpec } from './instrument';
import { endCorrection, SPEED_OF_SOUND_CM_PER_SECOND, theoreticalPipeLength } from './pipe';
import { cutoffFrequency } from './tone-hole';

/** Step (cm) of the suggested drill grid: half a millimeter. */
export const DRILL_STEP_CM = 0.05;

/** Number of position/diameter solving rounds before the design stabilizes. */
const SOLVING_ROUNDS = 3;

/** The physical dimensions of an existing tube, all lengths in cm. */
export interface TubeSpec {
	/** Physical length of the tube. */
	length: number;
	/** Inner diameter of the bore. */
	boreDiameter: number;
	/** Wall thickness at the tone holes. */
	wallThickness: number;
}

/** A tone hole placement enriched with the suggested drill diameter. */
export interface SuggestedHolePlacement extends ToneHolePlacement {
	/** Suggested hole diameter (cm), on the drill grid. */
	holeDiameter: number;
}

/** The complete drilling plan of a flute built from an existing tube. */
export interface FluteDesign {
	/** Lowest note (Hz) driving the design: measured if provided, derived from the tube otherwise. */
	lowestNoteFrequency: number;
	/** Cutoff frequency (Hz) every hole is sized to reach. */
	cutoffTarget: number;
	/** Hole placements ordered from the embouchure (highest note) to the bell. */
	placements: SuggestedHolePlacement[];
}

/** Solves the hole diameter reaching the target cutoff frequency at the given spacing. */
export function solveHoleDiameter(
	tube: TubeSpec,
	spacingToHoleBelow: number,
	targetCutoff: number
): number {
	const fullBoreCutoff = cutoffFrequency(
		{ ...tube, holeDiameter: tube.boreDiameter },
		spacingToHoleBelow
	);
	if (targetCutoff >= fullBoreCutoff) {
		return tube.boreDiameter;
	}

	// The cutoff frequency grows monotonically with the diameter: bisect.
	let low = 0;
	let high = tube.boreDiameter;
	for (let iteration = 0; iteration < 50; iteration++) {
		const middle = (low + high) / 2;
		const isTooWide =
			cutoffFrequency({ ...tube, holeDiameter: middle }, spacingToHoleBelow) > targetCutoff;
		if (isTooWide) {
			high = middle;
		} else {
			low = middle;
		}
	}
	return (low + high) / 2;
}

/** Designs a flute from an existing tube and the target frequencies of its tone holes. */
export function designFlute(
	tube: TubeSpec,
	holeFrequencies: number[],
	measuredLowestNoteFrequency?: number
): FluteDesign {
	const lowestNoteFrequency =
		measuredLowestNoteFrequency ?? deriveLowestNoteFrequency(tube);
	const cutoffTarget = 4 * lowestNoteFrequency;
	const acousticLength = SPEED_OF_SOUND_CM_PER_SECOND / (2 * lowestNoteFrequency);

	const frequenciesFromBellToEmbouchure = [...holeFrequencies].sort((left, right) => left - right);
	validateHoleFrequencies(frequenciesFromBellToEmbouchure, lowestNoteFrequency);

	let positions = frequenciesFromBellToEmbouchure.map((frequency) =>
		theoreticalPipeLength(frequency, 'open')
	);
	let diameters: number[] = [];
	let placements: ReturnType<typeof computeHolePlacements>['placements'] = [];

	for (let round = 0; round < SOLVING_ROUNDS; round++) {
		diameters = positions.map((position, index) => {
			const spacingToHoleBelow =
				index === 0 ? acousticLength - position : positions[index - 1] - position;
			return onDrillGrid(solveHoleDiameter(tube, spacingToHoleBelow, cutoffTarget), tube);
		});

		const specs: ToneHoleSpec[] = frequenciesFromBellToEmbouchure.map((frequency, index) => ({
			frequency,
			boreDiameter: tube.boreDiameter,
			holeDiameter: diameters[index],
			wallThickness: tube.wallThickness
		}));
		placements = computeHolePlacements(toPipeSpec(tube, lowestNoteFrequency), specs).placements;
		positions = [...placements].reverse().map((placement) => placement.position);
	}

	const placementsFromBellToEmbouchure = [...placements].reverse();
	return {
		lowestNoteFrequency,
		cutoffTarget,
		placements: placementsFromBellToEmbouchure
			.map((placement, index) => ({ ...placement, holeDiameter: diameters[index] }))
			.reverse()
	};
}

/** Derives the lowest note of a tube from its physical length and the end correction. */
function deriveLowestNoteFrequency(tube: TubeSpec): number {
	const acousticLength = tube.length + endCorrection(tube.boreDiameter);
	return SPEED_OF_SOUND_CM_PER_SECOND / (2 * acousticLength);
}

/** Throws when a hole would sound at or below the lowest note of the tube. */
function validateHoleFrequencies(frequencies: number[], lowestNoteFrequency: number): void {
	const belowLowestNote = frequencies.find((frequency) => frequency <= lowestNoteFrequency);
	if (belowLowestNote !== undefined) {
		throw new Error(
			`Trou à ${belowLowestNote.toFixed(0)} Hz : au-dessus de la note grave (${lowestNoteFrequency.toFixed(0)} Hz) requis`
		);
	}
}

/** Rounds a solved diameter to the drill grid, clamped between the minimum drill and the bore. */
function onDrillGrid(diameter: number, tube: TubeSpec): number {
	const rounded = Math.round(diameter / DRILL_STEP_CM) * DRILL_STEP_CM;
	return Math.min(Math.max(rounded, DRILL_STEP_CM), tube.boreDiameter);
}

function toPipeSpec(tube: TubeSpec, lowestNoteFrequency: number) {
	return {
		boreDiameter: tube.boreDiameter,
		resonator: 'open' as const,
		lowestNoteFrequency
	};
}
