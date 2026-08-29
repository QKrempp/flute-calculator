import { SPEED_OF_SOUND_CM_PER_SECOND } from './pipe';

/** Defensive floor for hole spacings, keeping formulas finite when positions cross. */
const MIN_SPACING_CM = 0.01;

/** The physical dimensions of a tone hole, all lengths in cm. */
export interface ToneHoleGeometry {
	/** Diameter of the hole itself (d^t). */
	holeDiameter: number;
	/** Diameter of the bore facing the hole (d^p). */
	boreDiameter: number;
	/** Wall thickness, i.e. the height of the hole (e). */
	wallThickness: number;
}

/** Computes the acoustic thickness of a hole: its wall thickness plus three quarters of its diameter. */
export function acousticThickness(hole: ToneHoleGeometry): number {
	return hole.wallThickness + (3 / 4) * hole.holeDiameter;
}

/** Computes the position correction of the lowest open hole, which vents the pipe imperfectly. */
export function openHoleCorrection(hole: ToneHoleGeometry, tailLength: number): number {
	const acousticThicknessOfHole = acousticThickness(hole);
	const holeToBoreAreaRatio = (hole.holeDiameter / hole.boreDiameter) ** 2;
	const tailConductance = 1 / tailLength;
	return acousticThicknessOfHole / (holeToBoreAreaRatio + acousticThicknessOfHole * tailConductance);
}

/** Computes the correction of a hole caused by the imperfectly venting open hole just below it. */
export function openHoleInteractionCorrection(
	hole: ToneHoleGeometry,
	spacingToOpenHoleBelow: number
): number {
	const acousticThicknessOfHole = acousticThickness(hole);
	const spacing = Math.max(spacingToOpenHoleBelow, MIN_SPACING_CM);
	const boreToHoleAreaRatio = (hole.boreDiameter / hole.holeDiameter) ** 2;
	const ratio = 4 * (acousticThicknessOfHole / spacing) * boreToHoleAreaRatio;
	return (spacing / 2) * (Math.sqrt(1 + ratio) - 1);
}

/** Computes the lowering correction caused by a closed hole sitting above the sounding hole. */
export function closedHoleCorrection(hole: ToneHoleGeometry): number {
	return (1 / 4) * hole.wallThickness * (hole.holeDiameter / hole.boreDiameter) ** 2;
}

/** Computes the cutoff frequency of a hole from its spacing to the hole below. */
export function cutoffFrequency(hole: ToneHoleGeometry, spacingToHoleBelow: number): number {
	const acousticThicknessOfHole = acousticThickness(hole);
	const spacing = Math.max(spacingToHoleBelow, MIN_SPACING_CM);
	const denominator =
		hole.boreDiameter *
		2 *
		Math.PI *
		Math.sqrt(acousticThicknessOfHole * spacing);
	return (SPEED_OF_SOUND_CM_PER_SECOND * hole.holeDiameter) / denominator;
}
