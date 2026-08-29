import { endCorrection, theoreticalPipeLength, type ResonatorKind } from './pipe';
import {
	closedHoleCorrection,
	cutoffFrequency,
	openHoleCorrection,
	openHoleInteractionCorrection,
	type ToneHoleGeometry
} from './tone-hole';

/** Number of correction rounds recommended by the article for a stable result. */
export const CORRECTION_ITERATIONS = 5;

/** Minimum gap kept between adjacent holes when corrections would cross them. */
const MIN_HOLE_GAP_CM = 0.1;

/** The physical characteristics of the instrument tube, all lengths in cm. */
export interface PipeSpec {
	/** Inner diameter of the bore (d^i). */
	boreDiameter: number;
	/** Family of resonator the instrument belongs to. */
	resonator: ResonatorKind;
	/** Frequency (Hz) of the lowest note, played with all holes closed. */
	lowestNoteFrequency: number;
}

/** A tone hole to place: its target note plus its physical dimensions. */
export interface ToneHoleSpec extends ToneHoleGeometry {
	/** Frequency (Hz) the hole must produce when opened. */
	frequency: number;
}

/** The computed position of a tone hole on the tube. */
export interface ToneHolePlacement {
	/** Frequency (Hz) the hole produces. */
	frequency: number;
	/** Distance (cm) from the embouchure to the hole center, corrections included. */
	position: number;
	/** Cutoff frequency (Hz) of the hole, for homogeneity checking across holes. */
	cutoffFrequency: number;
}

/** The full drilling plan of an instrument. */
export interface InstrumentDesign {
	/** Hole placements ordered from the embouchure (highest note) to the bell. */
	placements: ToneHolePlacement[];
	/** Physical length (cm) to cut the pipe at, end correction included. */
	pipeLength: number;
}

/** Computes the corrected hole positions following the article's iterative design process. */
export function computeHolePlacements(
	pipe: PipeSpec,
	holes: ToneHoleSpec[],
	iterations: number = CORRECTION_ITERATIONS
): InstrumentDesign {
	const pipeTheoreticalLength = theoreticalPipeLength(pipe.lowestNoteFrequency, pipe.resonator);

	// Order the holes from the bell (lowest note) up to the embouchure: corrections are computed bottom-up.
	const holesFromBellToEmbouchure = [...holes].sort(
		(left, right) => left.frequency - right.frequency
	);
	const theoreticalPositions = holesFromBellToEmbouchure.map((hole) =>
		theoreticalPipeLength(hole.frequency, pipe.resonator)
	);
	const positions = [...theoreticalPositions];

	// Fixed-point iteration: each round recomputes every correction from the previous round's
	// positions and repositions every hole relative to its theoretical length simultaneously.
	// Sequential updates would let a lower hole jump past an upper one before it moves,
	// and cumulative subtraction would diverge, as the article's author suspected.
	for (let iteration = 0; iteration < iterations; iteration++) {
		const corrections = holesFromBellToEmbouchure.map((hole, index) => {
			const openCorrection =
				index === 0
					? openHoleCorrection(hole, pipeTheoreticalLength - positions[0])
					: openHoleInteractionCorrection(
							hole,
							positions[index - 1] - positions[index]
					);
			const closedCorrection = holesFromBellToEmbouchure
				.slice(index + 1)
				.reduce((sum, closedHole) => sum + closedHoleCorrection(closedHole), 0);
			return openCorrection + closedCorrection;
		});
		for (let index = 0; index < holesFromBellToEmbouchure.length; index++) {
			positions[index] = theoreticalPositions[index] - corrections[index];
		}
		// Safeguard: tightly spaced holes can attract each other past their neighbor because
		// the interaction correction vanishes as spacing shrinks. Pin such pairs a millimeter
		// apart so the plan stays drillable; the tiny gap stays visible in the output.
		for (let index = 1; index < positions.length; index++) {
			positions[index] = Math.min(positions[index], positions[index - 1] - MIN_HOLE_GAP_CM);
		}
	}

	const placements = holesFromBellToEmbouchure
		.map((hole, index) => toPlacement(hole, index, positions, holesFromBellToEmbouchure, pipeTheoreticalLength))
		.reverse();

	return {
		placements,
		pipeLength: pipeTheoreticalLength - endCorrection(pipe.boreDiameter)
	};
}

/** Builds the placement report of a hole, including its cutoff frequency. */
function toPlacement(
	hole: ToneHoleSpec,
	index: number,
	positions: number[],
	holesFromBellToEmbouchure: ToneHoleSpec[],
	pipeTheoreticalLength: number
): ToneHolePlacement {
	// The bell-most hole is spaced from the pipe end; the others from the hole below.
	const spacingToHoleBelow =
		index === 0
			? pipeTheoreticalLength - positions[0]
			: positions[index - 1] - positions[index];

	return {
		frequency: hole.frequency,
		position: positions[index],
		cutoffFrequency: cutoffFrequency(hole, spacingToHoleBelow)
	};
}
