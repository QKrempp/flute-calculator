import { describe, expect, it } from 'vitest';
import { parseDesignInput, type TubeFormFields } from './design-input';

const validFields: TubeFormFields = {
	length: '500',
	boreDiameter: '16',
	wallThickness: '2',
	tuning: '440',
	lowestNote: ''
};

describe('parseDesignInput', () => {
	it('parses a complete valid form into a design input in centimeters', () => {
		const result = parseDesignInput(
			{ ...validFields, length: '500,5' },
			['Sol4', 'La4']
		);

		expect(result.errors).toEqual({});
		expect(result.input?.tube).toEqual({
			length: 50.05,
			boreDiameter: 1.6,
			wallThickness: 0.2
		});
		expect(result.input?.holeFrequencies[0]).toBeCloseTo(392, 1);
		expect(result.input?.holeFrequencies[1]).toBe(440);
		expect(result.input?.measuredLowestNoteFrequency).toBeUndefined();
	});

	it('applies the tuning to the note names', () => {
		const result = parseDesignInput({ ...validFields, tuning: '442' }, ['La4']);

		expect(result.input?.holeFrequencies).toEqual([442]);
	});

	it('reads an optional measured lowest note', () => {
		const result = parseDesignInput({ ...validFields, lowestNote: '340' }, ['Sol4']);

		expect(result.input?.measuredLowestNoteFrequency).toBe(340);
	});

	it('rejects non-positive tube dimensions', () => {
		const result = parseDesignInput({ ...validFields, length: '-5' }, []);

		expect(result.input).toBeNull();
		expect(result.errors['length']).toBeTruthy();
	});

	it('reports an invalid note name on its hole', () => {
		const result = parseDesignInput(validFields, ['Sol4', 'XYZ', 'La4']);

		expect(result.input).toBeNull();
		expect(result.errors['hole-1']).toBeTruthy();
	});

	it('ignores empty hole rows', () => {
		const result = parseDesignInput(validFields, ['Sol4', '', '  ']);

		expect(result.errors).toEqual({});
		expect(result.input?.holeFrequencies[0]).toBeCloseTo(392, 1);
	});

	it('rejects holes at or below the derived lowest note', () => {
		// 500 mm tube, 16 mm bore: fundamental around 341.6 Hz, between Mi4 and Fa4
		const result = parseDesignInput(validFields, ['Sol4', 'Mi4']);

		expect(result.input).toBeNull();
		expect(result.errors['hole-1']).toBeTruthy();
	});

	it('rejects holes at or below a measured lowest note', () => {
		const result = parseDesignInput({ ...validFields, lowestNote: '400' }, ['Sol4']);

		expect(result.input).toBeNull();
		expect(result.errors['hole-0']).toBeTruthy();
	});

	it('accepts an empty hole list', () => {
		const result = parseDesignInput(validFields, []);

		expect(result.errors).toEqual({});
		expect(result.input?.holeFrequencies).toEqual([]);
	});
});
