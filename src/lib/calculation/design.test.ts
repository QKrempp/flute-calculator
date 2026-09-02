import { describe, expect, it } from 'vitest';
import { cutoffFrequency } from './tone-hole';
import {
	designFlute,
	deriveLowestNoteFrequency,
	embouchureCorrection,
	solveHoleDiameter,
	type DesignResult,
	type FluteDesign,
	type TubeSpec
} from './design';
import { noteNameToFrequency } from './notes';

const tube: TubeSpec = { length: 60, boreDiameter: 2, wallThickness: 0.2 };

/** Unwraps a design result, failing the test when the request was rejected. */
function expectDesign(result: DesignResult): FluteDesign {
	expect(result.kind).toBe('design');
	if (result.kind !== 'design') throw new Error('plan de perçage attendu');
	return result.design;
}

describe('solveHoleDiameter', () => {
	it('finds the diameter whose cutoff frequency reaches the target', () => {
		// Round trip of the cutoff example: d = 1 cm on bore 2, wall 0.2, spacing 3 gives 1626.25 Hz
		const diameter = solveHoleDiameter(tube, 3, 1626.25);

		expect(diameter).toBeCloseTo(1, 2);
		expect(
			cutoffFrequency({ ...tube, holeDiameter: diameter }, 3)
		).toBeCloseTo(1626.25, 0);
	});

	it('clamps to the bore diameter when the target is unreachable', () => {
		// Even a full-bore hole only reaches 2431 Hz at spacing 3
		expect(solveHoleDiameter(tube, 3, 5000)).toBe(tube.boreDiameter);
	});
});

describe('designFlute', () => {
	it('derives the lowest note from the tube length and the end correction', () => {
		// 34500 / (2 * (60 + 0.6133)) = 284.59 Hz
		const design = expectDesign(designFlute(tube, []));

		expect(design.lowestNoteFrequency).toBeCloseTo(284.59, 1);
	});

	it('uses the measured lowest note when provided', () => {
		const design = expectDesign(designFlute(tube, [], 280));

		expect(design.lowestNoteFrequency).toBe(280);
	});

	it('targets twice the register-change frequency, an octave above the lowest note', () => {
		expect(expectDesign(designFlute(tube, [])).cutoffTarget).toBeCloseTo(4 * 284.59, 1);
		expect(expectDesign(designFlute(tube, [], 280)).cutoffTarget).toBe(1120);
	});

	it('rejects a measured note sharper than the tube allows, before checking holes', () => {
		// Une octave mesurée au lieu de la fondamentale
		expect(designFlute(tube, [280], 300)).toEqual({
			kind: 'invalid',
			issue: {
				kind: 'measuredNoteNotFundamental',
				measuredFrequency: 300,
				limit: deriveLowestNoteFrequency(tube)
			}
		});
	});

	it('rejects holes at or below the lowest note', () => {
		expect(designFlute(tube, [280])).toEqual({
			kind: 'invalid',
			issue: {
				kind: 'holeBelowLowestNote',
				frequency: 280,
				lowestNoteFrequency: deriveLowestNoteFrequency(tube)
			}
		});
	});

	it('suggests drillable diameters with homogeneous cutoff frequencies', () => {
		// Diatonic holes spaced a whole tone apart: no clamping expected.
		const design = expectDesign(
			designFlute(
				{ length: 40, boreDiameter: 1.6, wallThickness: 0.25 },
				[470, 528, 592]
			)
		);

		expect(design.placements).toHaveLength(3);
		for (const placement of design.placements) {
			expect(placement.holeDiameter).toBeLessThanOrEqual(1.6);
			// On the half-millimeter drill grid
			const gridSteps = placement.holeDiameter * 20;
			expect(Math.abs(gridSteps - Math.round(gridSteps))).toBeLessThan(1e-9);
			expect(placement.cutoffFrequency).toBeGreaterThan(design.cutoffTarget * 0.9);
			expect(placement.cutoffFrequency).toBeLessThan(design.cutoffTarget * 1.1);
		}
	});

	it('drills larger holes toward the bell, where spacings grow', () => {
		const design = expectDesign(
			designFlute(
				{ length: 40, boreDiameter: 1.6, wallThickness: 0.25 },
				[470, 528, 592]
			)
		);

		const embouchureMost = design.placements[0];
		const bellMost = design.placements[design.placements.length - 1];
		expect(bellMost?.holeDiameter).toBeGreaterThan(embouchureMost?.holeDiameter ?? 0);
	});

	it('keeps every hole inside the tube, above the embouchure', () => {
		const design = expectDesign(designFlute(tube, [500, 600, 700]));

		for (const placement of design.placements) {
			expect(placement.position).toBeGreaterThan(0);
			expect(placement.position).toBeLessThan(60);
		}
	});

	it('designs a flute without holes', () => {
		const design = expectDesign(designFlute(tube, []));

		expect(design.placements).toEqual([]);
	});

	it('deduces the embouchure correction from the measured lowest note', () => {
		// 34500 / (2 * 280) = 61.61 ; Δ = 61.61 - 60 - 0.6133 = 0.99
		const design = expectDesign(designFlute(tube, [], 280));

		expect(design.embouchureCorrection).toBeCloseTo(0.99, 1);
	});

	it('reports no embouchure correction when the lowest note is derived', () => {
		expect(expectDesign(designFlute(tube, [])).embouchureCorrection).toBeCloseTo(0, 6);
	});

	it('shifts every hole position by the deduced embouchure correction', () => {
		const design = expectDesign(designFlute(tube, [500, 600], 280));
		// A tube lengthened by Δ with the same measured note has Δ = 0:
		// its positions are the acoustic positions of the real flute.
		const neutral = expectDesign(
			designFlute(
				{ ...tube, length: tube.length + design.embouchureCorrection },
				[500, 600],
				280
			)
		);

		expect(neutral.embouchureCorrection).toBeCloseTo(0, 6);
		design.placements.forEach((placement, index) => {
			expect(placement.position).toBeCloseTo(
				(neutral.placements[index]?.position ?? Number.NaN) - design.embouchureCorrection,
				2
			);
		});
	});

	it('rejects a measured lowest note that would push a hole above the embouchure', () => {
		// Δ = 25.64 cm : le trou à 700 Hz atterrit à -2.65 cm de l'embouchure
		expect(designFlute(tube, [700], 200)).toEqual({
			kind: 'invalid',
			issue: { kind: 'holeAboveEmbouchure', frequency: 700 }
		});
	});

	it('keeps a dense diatonic scale drillable despite model limits', () => {
		// Eight holes with semitone spacings stress the article's model: the feasibility
		// constraint and ordering safeguard must still yield finite, ordered, drillable holes.
		const design = expectDesign(
			designFlute(
				{ length: 50, boreDiameter: 1.6, wallThickness: 0.2 },
				[392, 440, 494, 523, 587, 659, 740, 784]
			)
		);

		expect(design.placements).toHaveLength(8);
		for (const placement of design.placements) {
			expect(Number.isFinite(placement.position)).toBe(true);
			expect(Number.isFinite(placement.cutoffFrequency)).toBe(true);
			expect(placement.holeDiameter).toBeGreaterThan(0);
			expect(placement.holeDiameter).toBeLessThanOrEqual(1.6);
		}
		for (let index = 1; index < design.placements.length; index++) {
			expect(design.placements[index]?.position).toBeGreaterThan(
				design.placements[index - 1]?.position ?? 0
			);
		}
	});
});

describe('embouchureCorrection', () => {
	it('deduces the chromojara embouchure length from the book flute in G', () => {
		// Livre p.135 : tube 808 mm, perce 25 mm, Sol grave : Δ = 88.01 - 80.8 - 0.77
		const tube: TubeSpec = { length: 80.8, boreDiameter: 2.5, wallThickness: 0.15 };
		expect(embouchureCorrection(tube, noteNameToFrequency('Sol3'))).toBeCloseTo(6.45, 1);
	});

	it('deduces the diatonic embouchure length from the book flute in D', () => {
		// Livre p.134 : tube 530 mm, perce 20 mm, Ré grave : Δ = 58.74 - 53.0 - 0.61
		const tube: TubeSpec = { length: 53, boreDiameter: 2, wallThickness: 0.15 };
		expect(embouchureCorrection(tube, noteNameToFrequency('Ré4'))).toBeCloseTo(5.12, 1);
	});

	it('returns zero when the measurement matches the bare tube', () => {
		// 34500 / (2 * 284.59) = 60.61 = 60 + endCorrection(2)
		expect(embouchureCorrection(tube, deriveLowestNoteFrequency(tube))).toBeCloseTo(0, 6);
	});

	it('returns the raw negative correction within the measurement noise', () => {
		// 34500 / (2 * 285) - 60 - 0.6133 = -0.087 cm : dans la tolérance
		expect(embouchureCorrection(tube, 285)).toBeCloseTo(-0.087, 2);
	});

	it('returns a strongly negative correction for a measurement sharper than the tube allows', () => {
		// Une octave mesurée au lieu de la fondamentale : Δ = -3.11 cm, hors tolérance
		expect(embouchureCorrection(tube, 300)).toBeLessThan(-0.2);
	});
});
