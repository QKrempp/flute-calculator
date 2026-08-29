import { describe, expect, it } from 'vitest';
import {
	acousticThickness,
	closedHoleCorrection,
	cutoffFrequency,
	openHoleCorrection,
	openHoleInteractionCorrection,
	type ToneHoleGeometry
} from './tone-hole';

// Bore of 2 cm, hole of 1 cm, wall of 0.2 cm: a realistic small flute hole.
const hole: ToneHoleGeometry = { boreDiameter: 2, holeDiameter: 1, wallThickness: 0.2 };

describe('acousticThickness', () => {
	it('adds three quarters of the hole diameter to the wall thickness', () => {
		// 0.2 + 0.75 * 1 = 0.95
		expect(acousticThickness(hole)).toBeCloseTo(0.95, 10);
	});
});

describe('openHoleCorrection', () => {
	it('computes the position correction of the lowest open hole from the tail length beyond it', () => {
		// ea = 0.95, r = (1 / 2)^2 = 0.25, s = 1 / 5
		// Cs = 0.95 / (0.25 + 0.95 * 0.2) = 0.95 / 0.44 = 2.15909...
		expect(openHoleCorrection(hole, 5)).toBeCloseTo(2.1591, 4);
	});

	it('shrinks as the hole gets closer to the bore diameter', () => {
		const wideHole: ToneHoleGeometry = { ...hole, holeDiameter: 2 };
		expect(openHoleCorrection(wideHole, 5)).toBeLessThan(openHoleCorrection(hole, 5));
	});

	it('grows toward ea/r as the tail beyond the hole gets longer', () => {
		// The hole then vents alone: the correction approaches its ceiling 0.95 / 0.25 = 3.8
		expect(openHoleCorrection(hole, 10)).toBeGreaterThan(openHoleCorrection(hole, 5));
		expect(openHoleCorrection(hole, 1000)).toBeCloseTo(3.8, 1);
		expect(openHoleCorrection(hole, 1000)).toBeLessThan(3.8);
	});
});

describe('openHoleInteractionCorrection', () => {
	it('computes the correction of a hole from the spacing to the open hole below', () => {
		// ea = 0.95, r = (2 / 1)^2 = 4, esp = 3
		// Co = 1.5 * (sqrt(1 + 4 * (0.95 / 3) * 4) - 1) = 1.5 * (sqrt(6.0667) - 1) = 2.19459...
		expect(openHoleInteractionCorrection(hole, 3)).toBeCloseTo(2.1946, 3);
	});

	it('grows toward ea*r as the spacing to the hole below gets longer', () => {
		// Widely spaced holes let the wave leak further past: correction approaches its ceiling 0.95 * 4 = 3.8
		expect(openHoleInteractionCorrection(hole, 10)).toBeGreaterThan(openHoleInteractionCorrection(hole, 3));
		expect(openHoleInteractionCorrection(hole, 1000)).toBeCloseTo(3.8, 1);
	});
});

describe('closedHoleCorrection', () => {
	it('computes a quarter of the wall thickness scaled by the hole-to-bore area ratio', () => {
		// 0.25 * 0.2 * (1 / 2)^2 = 0.0125
		expect(closedHoleCorrection(hole)).toBeCloseTo(0.0125, 10);
	});

	it('grows with the hole diameter', () => {
		const wideHole: ToneHoleGeometry = { ...hole, holeDiameter: 1.5 };
		expect(closedHoleCorrection(wideHole)).toBeGreaterThan(closedHoleCorrection(hole));
	});
});

describe('cutoffFrequency', () => {
	it('computes the cutoff frequency of a hole from the spacing to the hole below', () => {
		// fc = 34500 * 1 / (2 * 2π * sqrt(0.95 * 3)) = 1626.25... Hz
		expect(cutoffFrequency(hole, 3)).toBeCloseTo(1626.25, 1);
	});

	it('rises with a larger hole diameter', () => {
		const wideHole: ToneHoleGeometry = { ...hole, holeDiameter: 1.5 };
		expect(cutoffFrequency(wideHole, 3)).toBeGreaterThan(cutoffFrequency(hole, 3));
	});
});
