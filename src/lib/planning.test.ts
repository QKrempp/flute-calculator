import { describe, expect, it } from 'vitest';
import { planFlute, type TubeFormFields } from './planning';

const validFields: TubeFormFields = {
	length: '500',
	boreDiameter: '16',
	wallThickness: '2',
	tuning: '440',
	lowestNote: ''
};

describe('planFlute', () => {
	it('parses a complete valid form into a tube in centimeters and a drilling plan', () => {
		const plan = planFlute({ ...validFields, length: '500,5' }, ['Sol4', 'La4'], 'free');

		expect(plan.errors).toEqual({});
		expect(plan.tube).toEqual({
			length: 50.05,
			boreDiameter: 1.6,
			wallThickness: 0.2
		});
		expect(plan.design?.placements).toHaveLength(2);
		// Placements ordered from the embouchure (highest note) to the bell
		expect(plan.design?.placements[0]?.frequency).toBe(440);
		expect(plan.design?.placements[1]?.frequency).toBeCloseTo(392, 1);
	});

	it('applies the tuning to the hole notes', () => {
		const plan = planFlute({ ...validFields, tuning: '442' }, ['La4'], 'free');

		expect(plan.design?.placements[0]?.frequency).toBe(442);
	});

	it('hints at the derived lowest note when none is measured', () => {
		// 500 mm tube, 16 mm bore: fundamental around 341.6 Hz, rounded to 342
		const plan = planFlute(validFields, [], 'free');

		expect(plan.lowestNoteHint).toMatch(/Estimation depuis la longueur : 342 Hz/);
		expect(plan.lowestNoteName).toBe('Fa4');
	});

	it('stays silent about the hint and names the measured lowest note', () => {
		const plan = planFlute({ ...validFields, lowestNote: '280' }, ['Sol4'], 'free');

		expect(plan.lowestNoteHint).toBe('');
		expect(plan.lowestNoteName).toBe('Do#4');
	});

	it('suggests the hole notes of the selected scale above the lowest note', () => {
		const plan = planFlute(validFields, [], 'pentatonic');

		expect(plan.suggestedHoleNotes).toEqual(['Sol4', 'La4', 'Do5', 'Ré5']);
	});

	it('suggests nothing in free mode', () => {
		const plan = planFlute(validFields, ['Sol4'], 'free');

		expect(plan.suggestedHoleNotes).toEqual([]);
	});

	it('rejects non-positive tube dimensions', () => {
		const plan = planFlute({ ...validFields, length: '-5' }, [], 'free');

		expect(plan.design).toBeNull();
		expect(plan.errors['length']).toBeTruthy();
	});

	it('reports an invalid note name on its hole', () => {
		const plan = planFlute(validFields, ['Sol4', 'XYZ', 'La4'], 'free');

		expect(plan.design).toBeNull();
		expect(plan.errors['hole-1']).toBeTruthy();
	});

	it('ignores empty hole rows', () => {
		const plan = planFlute(validFields, ['Sol4', '', '  '], 'free');

		expect(plan.errors).toEqual({});
		expect(plan.design?.placements).toHaveLength(1);
	});

	it('rejects holes at or below the derived lowest note', () => {
		// 500 mm tube, 16 mm bore: fundamental around 341.6 Hz, between Mi4 and Fa4
		const plan = planFlute(validFields, ['Sol4', 'Mi4'], 'free');

		expect(plan.design).toBeNull();
		expect(plan.errors['hole-1']).toBeTruthy();
	});

	it('reports a below-lowest-note hole on its own field with the domain message', () => {
		// 500 mm tube, 16 mm bore: fundamental around 341.6 Hz, between Mi4 and Fa4
		const plan = planFlute(validFields, ['La4', 'Do4', 'Sol4'], 'free');

		expect(plan.design).toBeNull();
		expect(plan.errors['hole-1']).toBe('Note trop grave : au-dessus de 342 Hz requis');
		expect(plan.errors['hole-0']).toBeUndefined();
		expect(plan.errors['hole-2']).toBeUndefined();
	});

	it('rejects a measured lowest note above the bare tube before checking holes', () => {
		// 400 Hz dépasse la fondamentale du tuyau (341,6 Hz) : la mesure est suspecte
		const plan = planFlute({ ...validFields, lowestNote: '400' }, ['Sol4'], 'free');

		expect(plan.design).toBeNull();
		expect(plan.errors['lowestNote']).toMatch(/harmonique/);
	});

	it('accepts an empty hole list', () => {
		const plan = planFlute(validFields, [], 'free');

		expect(plan.errors).toEqual({});
		expect(plan.design?.placements).toEqual([]);
	});

	it('rejects a measured lowest note sharper than the tube allows', () => {
		// 800 Hz sur un tube de 500 mm : la mesure est probablement un harmonique
		const plan = planFlute({ ...validFields, lowestNote: '800' }, ['La5'], 'free');

		expect(plan.design).toBeNull();
		expect(plan.errors['lowestNote']).toMatch(/harmonique/);
	});

	it('rejects a measured lowest note so low that a hole leaves the tube', () => {
		// 150 Hz sur un tube de 500 mm : correction d'embouchure de 64 cm, trou Sol5 négatif
		const plan = planFlute({ ...validFields, lowestNote: '150' }, ['Sol5'], 'free');

		expect(plan.design).toBeNull();
		expect(plan.errors['lowestNote']).toMatch(/au-dessus de l'embouchure/);
	});
});
