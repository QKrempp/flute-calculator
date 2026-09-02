import { computeHolePlacements, type ToneHolePlacement, type ToneHoleSpec } from './instrument';
import { endCorrection, SPEED_OF_SOUND_CM_PER_SECOND, theoreticalPipeLength } from './pipe';
import { cutoffFrequency, openHoleInteractionCorrection } from './tone-hole';

/** Step (cm) of the suggested drill grid: half a millimeter. */
export const DRILL_STEP_CM = 0.05;

/** Number of position/diameter solving rounds before the design stabilizes. */
const SOLVING_ROUNDS = 3;

/** Share of the spacing below a hole that its interaction correction may not exceed. */
const MAX_CORRECTION_SHARE = 1;

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
	/** Acoustic length (cm) the embouchure adds, deduced from the lowest note. */
	embouchureCorrection: number;
	/** Cutoff frequency (Hz) every hole is sized to reach. */
	cutoffTarget: number;
	/** Hole placements ordered from the embouchure (highest note) to the bell. */
	placements: SuggestedHolePlacement[];
}

/** Why a design request cannot produce a plan, in domain terms. */
export type DesignIssue =
	| { kind: 'holeBelowLowestNote'; frequency: number; lowestNoteFrequency: number }
	| { kind: 'measuredNoteNotFundamental'; measuredFrequency: number; limit: number }
	| { kind: 'holeAboveEmbouchure'; frequency: number };

/** The outcome of a design request: a drilling plan, or the issue that blocks it. */
export type DesignResult =
	| { kind: 'design'; design: FluteDesign }
	| { kind: 'invalid'; issue: DesignIssue };

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

/** Designs a flute from an existing tube and the target frequencies of its tone holes.
 * @param measuredLowestNoteFrequency Optional measured frequency of the lowest note on the
 *   finished tube, used to deduce the embouchure correction (Δ subtracted from every position). */
export function designFlute(
	tube: TubeSpec,
	holeFrequencies: number[],
	measuredLowestNoteFrequency?: number
): DesignResult {
	const lowestNoteFrequency =
		measuredLowestNoteFrequency ?? deriveLowestNoteFrequency(tube);
	const rawCorrection = embouchureCorrection(tube, lowestNoteFrequency);
	if (rawCorrection < -MEASUREMENT_NOISE_CM) {
		return {
			kind: 'invalid',
			issue: {
				kind: 'measuredNoteNotFundamental',
				measuredFrequency: lowestNoteFrequency,
				limit: deriveLowestNoteFrequency(tube)
			}
		};
	}
	const embouchure = Math.max(rawCorrection, 0);
	const cutoffTarget = 4 * lowestNoteFrequency;
	const acousticLength = SPEED_OF_SOUND_CM_PER_SECOND / (2 * lowestNoteFrequency);

	const frequenciesFromBellToEmbouchure = [...holeFrequencies].sort((left, right) => left - right);
	const belowLowestNote = frequenciesFromBellToEmbouchure.find(
		(frequency) => frequency <= lowestNoteFrequency
	);
	if (belowLowestNote !== undefined) {
		return {
			kind: 'invalid',
			issue: { kind: 'holeBelowLowestNote', frequency: belowLowestNote, lowestNoteFrequency }
		};
	}

	let positions = frequenciesFromBellToEmbouchure.map((frequency) =>
		theoreticalPipeLength(frequency, 'open')
	);
	let diameters: number[] = [];
	let placements: ReturnType<typeof computeHolePlacements>['placements'] = [];

	for (let round = 0; round < SOLVING_ROUNDS; round++) {
		diameters = positions.map((position, index) => {
			const spacingToHoleBelow =
				index === 0 ? acousticLength - position : positions[index - 1] - position;
			const forCutoff = solveHoleDiameter(tube, spacingToHoleBelow, cutoffTarget);
			// Tight spacings would need tiny holes to reach the cutoff target, but tiny holes
			// interact so strongly that positions cross: keep the correction within the spacing.
			const feasible =
				index === 0 ? 0 : minimumInteractionDiameter(tube, spacingToHoleBelow);
			return onDrillGrid(
				Math.min(Math.max(forCutoff, feasible), tube.boreDiameter),
				tube
			);
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
	const physicalPlacements = placementsFromBellToEmbouchure.map((placement, index) => ({
		...placement,
		holeDiameter: diameters[index],
		position: placement.position - embouchure
	}));
	const aboveEmbouchure = physicalPlacements.find((placement) => placement.position < 0);
	if (aboveEmbouchure !== undefined) {
		return {
			kind: 'invalid',
			issue: { kind: 'holeAboveEmbouchure', frequency: aboveEmbouchure.frequency }
		};
	}
	return {
		kind: 'design',
		design: {
			lowestNoteFrequency,
			embouchureCorrection: embouchure,
			cutoffTarget,
			placements: physicalPlacements.reverse()
		}
	};
}

/** Derives the lowest note of a tube from its physical length and the end correction. */
export function deriveLowestNoteFrequency(tube: TubeSpec): number {
	const acousticLength = tube.length + endCorrection(tube.boreDiameter);
	return SPEED_OF_SOUND_CM_PER_SECOND / (2 * acousticLength);
}

/** Measurement noise tolerated below zero before a measured fundamental is called wrong. */
const MEASUREMENT_NOISE_CM = 0.2;

/** Computes the raw acoustic length the embouchure adds to the tube; negative when the
 *  measurement sounds sharper than the tube allows (likely a harmonic, not the fundamental). */
export function embouchureCorrection(tube: TubeSpec, measuredFrequency: number): number {
	return (
		theoreticalPipeLength(measuredFrequency, 'open') -
		tube.length -
		endCorrection(tube.boreDiameter)
	);
}

/** Rounds a solved diameter to the drill grid, clamped between the minimum drill and the bore. */
function onDrillGrid(diameter: number, tube: TubeSpec): number {
	const rounded = Math.round(diameter / DRILL_STEP_CM) * DRILL_STEP_CM;
	return Math.min(Math.max(rounded, DRILL_STEP_CM), tube.boreDiameter);
}

/** Solves the smallest diameter whose interaction correction stays within the spacing below. */
function minimumInteractionDiameter(tube: TubeSpec, spacingToHoleBelow: number): number {
	const correctionOf = (holeDiameter: number) =>
		openHoleInteractionCorrection({ ...tube, holeDiameter }, spacingToHoleBelow);
	if (correctionOf(tube.boreDiameter) > spacingToHoleBelow * MAX_CORRECTION_SHARE) {
		return tube.boreDiameter;
	}
	let low = 0;
	let high = tube.boreDiameter;
	for (let iteration = 0; iteration < 50; iteration++) {
		const middle = (low + high) / 2;
		if (correctionOf(middle) > spacingToHoleBelow * MAX_CORRECTION_SHARE) {
			low = middle;
		} else {
			high = middle;
		}
	}
	return (low + high) / 2;
}

function toPipeSpec(tube: TubeSpec, lowestNoteFrequency: number) {
	return {
		boreDiameter: tube.boreDiameter,
		resonator: 'open' as const,
		lowestNoteFrequency
	};
}
