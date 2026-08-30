import { describe, expect, it } from 'vitest';
import { SCALE_TYPES, suggestHoleNotes } from './scales';

describe('suggestHoleNotes', () => {
	it('builds a 4-hole pentatonic flute above the lowest note', () => {
		expect(suggestHoleNotes('Do3', 'pentatonic')).toEqual(['Ré3', 'Mi3', 'Sol3', 'La3']);
	});

	it('builds a 6-hole diatonic flute above the lowest note', () => {
		expect(suggestHoleNotes('Do3', 'diatonic')).toEqual([
			'Ré3',
			'Mi3',
			'Fa3',
			'Sol3',
			'La3',
			'Si3'
		]);
	});

	it('builds a 6-hole chromatic flute above the lowest note', () => {
		expect(suggestHoleNotes('Sol3', 'chromatic')).toEqual([
			'Sol#3',
			'La3',
			'La#3',
			'Si3',
			'Do4',
			'Do#4'
		]);
	});

	it('crosses octaves with sharps for enharmonics', () => {
		expect(suggestHoleNotes('Si3', 'pentatonic')).toEqual(['Do#4', 'Ré#4', 'Fa#4', 'Sol#4']);
	});

	it('applies a custom tuning', () => {
		expect(suggestHoleNotes('La3', 'diatonic', 442)).toEqual([
			'Si3',
			'Do#4',
			'Ré4',
			'Mi4',
			'Fa#4',
			'Sol#4'
		]);
	});

	it('rejects an unknown scale', () => {
		expect(() => suggestHoleNotes('Do3', 'libre' as never)).toThrow(/Gamme/);
	});
});

describe('SCALE_TYPES', () => {
	it('lists the selectable scales', () => {
		expect(SCALE_TYPES).toContain('pentatonic');
		expect(SCALE_TYPES).toContain('diatonic');
		expect(SCALE_TYPES).toContain('chromatic');
		expect(SCALE_TYPES).toContain('free');
	});
});
