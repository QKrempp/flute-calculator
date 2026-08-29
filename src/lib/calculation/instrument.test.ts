import { describe, expect, it } from 'vitest';
import { endCorrection, theoreticalPipeLength } from './pipe';
import type { ToneHoleGeometry } from './tone-hole';
import { computeHolePlacements, type PipeSpec, type ToneHoleSpec } from './instrument';

const pipe: PipeSpec = { boreDiameter: 2, resonator: 'open', lowestNoteFrequency: 220 };

const holeGeometry: ToneHoleGeometry = { boreDiameter: 2, holeDiameter: 1, wallThickness: 0.2 };

// Two holes of a flute in C: the higher note (330 Hz) sits above the lower one (275 Hz).
const higherHole: ToneHoleSpec = { ...holeGeometry, frequency: 330 };
const lowerHole: ToneHoleSpec = { ...holeGeometry, frequency: 275 };

describe('computeHolePlacements', () => {
	it('applies one round of open and closed hole corrections to the theoretical positions', () => {
		// Hand-computed from the article formulas with a single correction iteration:
		//   l_pipe = 34500 / (2 * 220) = 78.4091
		//   theoretical: A = 52.2727, B = 62.7273
		//   Cs(B) = 0.95 / (0.25 + 0.95 / 15.6818) = 3.0587
		//   Co(A) = 1.5 * (sqrt(1 + 4 * (0.95 / 7.3959) * 4) - 1) = 2.7657
		//   Cc(A) = 0.0125 applies to B, which sounds below closed A
		const { placements } = computeHolePlacements(pipe, [lowerHole, higherHole], 1);

		expect(placements).toHaveLength(2);
		// Ordered from the embouchure (highest frequency) to the bell.
		expect(placements[0]?.frequency).toBe(330);
		expect(placements[0]?.position).toBeCloseTo(49.507, 2);
		expect(placements[1]?.frequency).toBe(275);
		expect(placements[1]?.position).toBeCloseTo(59.6561, 2);
	});

	it('moves every hole toward the embouchure compared to its theoretical position', () => {
		const { placements } = computeHolePlacements(pipe, [lowerHole, higherHole]);

		for (const placement of placements) {
			expect(placement.position).toBeLessThan(theoreticalPipeLength(placement.frequency, 'open'));
		}
	});

	it('iterates the five recommended correction rounds by default', () => {
		const { placements } = computeHolePlacements(pipe, [lowerHole, higherHole]);

		for (const placement of placements) {
			expect(placement.position).toBeLessThan(
				computeHolePlacements(pipe, [lowerHole, higherHole], 1)
					.placements.find((candidate) => candidate.frequency === placement.frequency)?.position ?? 0
			);
		}
	});

	it('keeps the holes in ascending position order', () => {
		const { placements } = computeHolePlacements(pipe, [lowerHole, higherHole]);

		expect(placements[0]?.position).toBeLessThan(placements[1]?.position ?? 0);
	});

	it('converges on closely spaced holes instead of crossing positions', () => {
		const tightHoles: ToneHoleSpec[] = [470, 500, 530].map((frequency) => ({
			frequency,
			boreDiameter: 1.6,
			holeDiameter: 0.8,
			wallThickness: 0.25
		}));

		const { placements } = computeHolePlacements(
			{ boreDiameter: 1.6, resonator: 'open', lowestNoteFrequency: 426 },
			tightHoles
		);

		for (const placement of placements) {
			expect(Number.isFinite(placement.position)).toBe(true);
		}
		expect(placements[0]?.position).toBeLessThan(placements[1]?.position ?? 0);
		expect(placements[1]?.position).toBeLessThan(placements[2]?.position ?? 0);
	});

	it('shortens the pipe by the end correction to get the physical cut length', () => {
		// 34500 / (2 * 220) - endCorrection(2) = 78.4091 - 0.6133
		const { pipeLength } = computeHolePlacements(pipe, [lowerHole, higherHole], 0);

		expect(pipeLength).toBeCloseTo(
			theoreticalPipeLength(220, 'open') - endCorrection(pipe.boreDiameter),
			4
		);
	});

	it('reports the cutoff frequency of every hole for homogeneity checking', () => {
		const { placements } = computeHolePlacements(pipe, [lowerHole, higherHole], 1);

		// Hand-computed: fc(B) uses the tail beyond B, fc(A) the spacing down to B.
		expect(placements[0]?.cutoffFrequency).toBeGreaterThan(880);
		expect(placements[0]?.cutoffFrequency).toBeLessThan(890);
		expect(placements[1]?.cutoffFrequency).toBeGreaterThan(645);
		expect(placements[1]?.cutoffFrequency).toBeLessThan(655);
	});

	it('designs an instrument without holes', () => {
		const design = computeHolePlacements(pipe, [], 1);

		expect(design.placements).toEqual([]);
		expect(design.pipeLength).toBeCloseTo(77.7958, 3);
	});
});
