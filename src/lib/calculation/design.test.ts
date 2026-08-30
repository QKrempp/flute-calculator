import { describe, expect, it } from 'vitest';
import { cutoffFrequency } from './tone-hole';
import { designFlute, deriveLowestNoteFrequency, embouchureCorrection, solveHoleDiameter, type TubeSpec } from './design';
import { noteNameToFrequency } from './notes';

const tube: TubeSpec = { length: 60, boreDiameter: 2, wallThickness: 0.2 };

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
		const design = designFlute(tube, []);

		expect(design.lowestNoteFrequency).toBeCloseTo(284.59, 1);
	});

	it('uses the measured lowest note when provided', () => {
		const design = designFlute(tube, [], 280);

		expect(design.lowestNoteFrequency).toBe(280);
	});

	it('targets twice the register-change frequency, an octave above the lowest note', () => {
		expect(designFlute(tube, []).cutoffTarget).toBeCloseTo(4 * 284.59, 1);
		expect(designFlute(tube, [], 280).cutoffTarget).toBe(1120);
	});

	it('rejects holes at or below the lowest note', () => {
		expect(() => designFlute(tube, [280], 300)).toThrow(/grave/);
		expect(() => designFlute(tube, [280])).toThrow(/grave/);
	});

	it('suggests drillable diameters with homogeneous cutoff frequencies', () => {
		// Diatonic holes spaced a whole tone apart: no clamping expected.
		const design = designFlute(
			{ length: 40, boreDiameter: 1.6, wallThickness: 0.25 },
			[470, 528, 592]
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
		const design = designFlute(
			{ length: 40, boreDiameter: 1.6, wallThickness: 0.25 },
			[470, 528, 592]
		);

		const embouchureMost = design.placements[0];
		const bellMost = design.placements[design.placements.length - 1];
		expect(bellMost?.holeDiameter).toBeGreaterThan(embouchureMost?.holeDiameter ?? 0);
	});

	it('keeps every hole inside the tube, above the embouchure', () => {
		const design = designFlute(tube, [500, 600, 700]);

		for (const placement of design.placements) {
			expect(placement.position).toBeGreaterThan(0);
			expect(placement.position).toBeLessThan(60);
		}
	});

	it('designs a flute without holes', () => {
		const design = designFlute(tube, []);

		expect(design.placements).toEqual([]);
	});

	it('keeps a dense diatonic scale drillable despite model limits', () => {
		// Eight holes with semitone spacings stress the article's model: the feasibility
		// constraint and ordering safeguard must still yield finite, ordered, drillable holes.
		const design = designFlute(
			{ length: 50, boreDiameter: 1.6, wallThickness: 0.2 },
			[392, 440, 494, 523, 587, 659, 740, 784]
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

	it('clamps measurement noise below zero', () => {
		// 34500 / (2 * 285) - 60 - 0.6133 = -0.087 cm : dans la tolérance
		expect(embouchureCorrection(tube, 285)).toBe(0);
	});

	it('rejects a measurement sharper than the tube allows', () => {
		// Une octave mesurée au lieu de la fondamentale : Δ fortement négatif
		expect(() => embouchureCorrection(tube, 300)).toThrow(/harmonique/);
	});
});
