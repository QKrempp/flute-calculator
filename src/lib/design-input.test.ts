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

	it('rejects a measured lowest note above the bare tube before checking holes', () => {
		// 400 Hz dépasse la fondamentale du tuyau (341,6 Hz) : la mesure est suspecte
		const result = parseDesignInput({ ...validFields, lowestNote: '400' }, ['Sol4']);

		expect(result.input).toBeNull();
		expect(result.errors['lowestNote']).toMatch(/harmonique/);
	});

	it('reports a below-lowest-note hole on its own field with the domain message', () => {
		// 500 mm tube, 16 mm bore: fundamental around 341.6 Hz, between Mi4 and Fa4
		const result = parseDesignInput(validFields, ['La4', 'Do4', 'Sol4']);

		expect(result.input).toBeNull();
		expect(result.errors['hole-1']).toBe('Note trop grave : au-dessus de 342 Hz requis');
		expect(result.errors['hole-0']).toBeUndefined();
		expect(result.errors['hole-2']).toBeUndefined();
	});

	it('accepts an empty hole list', () => {
		const result = parseDesignInput(validFields, []);

		expect(result.errors).toEqual({});
		expect(result.input?.holeFrequencies).toEqual([]);
	});

	it('rejects a measured lowest note sharper than the tube allows', () => {
		// 800 Hz sur un tube de 500 mm : la mesure est probablement un harmonique
		const result = parseDesignInput({ ...validFields, lowestNote: '800' }, ['La5']);

		expect(result.input).toBeNull();
		expect(result.errors['lowestNote']).toMatch(/harmonique/);
	});

	it('rejects a measured lowest note so low that a hole leaves the tube', () => {
		// 150 Hz sur un tube de 500 mm : correction d'embouchure de 64 cm, trou Sol5 négatif
		const result = parseDesignInput({ ...validFields, lowestNote: '150' }, ['Sol5']);

		expect(result.input).toBeNull();
		expect(result.errors['lowestNote']).toMatch(/au-dessus de l'embouchure/);
	});
});
