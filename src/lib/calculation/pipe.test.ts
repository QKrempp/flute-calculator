import { describe, expect, it } from 'vitest';
import { endCorrection, theoreticalPipeLength, SPEED_OF_SOUND_CM_PER_SECOND } from './pipe';

describe('SPEED_OF_SOUND_CM_PER_SECOND', () => {
	it('is the speed of sound in warm air as recommended by the article (345 m/s)', () => {
		expect(SPEED_OF_SOUND_CM_PER_SECOND).toBe(34_500);
	});
});

describe('theoreticalPipeLength', () => {
	it('computes half the wavelength for an open-open resonator (flute)', () => {
		// 34500 / (2 * 440) = 39.204545...
		expect(theoreticalPipeLength(440, 'open')).toBeCloseTo(39.2045, 3);
	});

	it('computes a quarter of the wavelength for a closed cylindrical resonator (clarinet)', () => {
		// 34500 / (4 * 440) = 19.602272...
		expect(theoreticalPipeLength(440, 'closed-cylindrical')).toBeCloseTo(19.6023, 3);
	});

	it('computes half the wavelength for a closed conical resonator (sax-like)', () => {
		expect(theoreticalPipeLength(440, 'closed-conical')).toBeCloseTo(39.2045, 3);
	});

	it('returns a longer pipe for a lower frequency', () => {
		expect(theoreticalPipeLength(220, 'open')).toBeGreaterThan(theoreticalPipeLength(440, 'open'));
	});
});

describe('endCorrection', () => {
	it('extends the acoustic length by 0.6133 times the bore radius', () => {
		// 0.6133 * (2 / 2)
		expect(endCorrection(2)).toBeCloseTo(0.6133, 6);
	});

	it('scales linearly with the bore diameter', () => {
		expect(endCorrection(10)).toBeCloseTo(3.0665, 6);
	});
});
