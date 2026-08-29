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
	const positions = holesFromBellToEmbouchure.map((hole) =>
		theoreticalPipeLength(hole.frequency, pipe.resonator)
	);

	for (let iteration = 0; iteration < iterations; iteration++) {
		applyOpenHoleCorrections(holesFromBellToEmbouchure, positions, pipeTheoreticalLength);
		applyClosedHoleCorrections(holesFromBellToEmbouchure, positions);
	}

	const placements = holesFromBellToEmbouchure
		.map((hole, index) => toPlacement(hole, index, positions, holesFromBellToEmbouchure, pipeTheoreticalLength))
		.reverse();

	return {
		placements,
		pipeLength: pipeTheoreticalLength - endCorrection(pipe.boreDiameter)
	};
}

/** Applies the venting corrections of open holes, going up from the bell-most hole. */
function applyOpenHoleCorrections(
	holesFromBellToEmbouchure: ToneHoleSpec[],
	positions: number[],
	pipeTheoreticalLength: number
): void {
	for (let index = 0; index < holesFromBellToEmbouchure.length; index++) {
		const correction =
			index === 0
				? openHoleCorrection(
						holesFromBellToEmbouchure[0],
						pipeTheoreticalLength - positions[0]
					)
				: openHoleInteractionCorrection(
						holesFromBellToEmbouchure[index],
						positions[index - 1] - positions[index]
					);
		positions[index] -= correction;
	}
}

/** Applies the lowering effect of closed holes to every hole sounding below them. */
function applyClosedHoleCorrections(holesFromBellToEmbouchure: ToneHoleSpec[], positions: number[]): void {
	for (let index = 0; index < holesFromBellToEmbouchure.length; index++) {
		const closedHolesAbove = holesFromBellToEmbouchure.slice(index + 1);
		const totalCorrection = closedHolesAbove.reduce(
			(sum, hole) => sum + closedHoleCorrection(hole),
			0
		);
		positions[index] -= totalCorrection;
	}
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
