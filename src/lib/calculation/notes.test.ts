import { describe, expect, it } from 'vitest';
import { frequencyToNearestNoteName, noteNameToFrequency } from './notes';

describe('noteNameToFrequency', () => {
	it('converts a plain note name with the default tuning', () => {
		expect(noteNameToFrequency('La4')).toBeCloseTo(440, 6);
	});

	it('converts notes across octaves', () => {
		expect(noteNameToFrequency('La3')).toBeCloseTo(220, 6);
		expect(noteNameToFrequency('Do4')).toBeCloseTo(261.6256, 3);
		expect(noteNameToFrequency('Fa5')).toBeCloseTo(698.4565, 3);
	});

	it('converts sharps', () => {
		expect(noteNameToFrequency('Sol#4')).toBeCloseTo(415.3047, 3);
	});

	it('converts flats, accented or not', () => {
		expect(noteNameToFrequency('Sib3')).toBeCloseTo(233.0819, 3);
		expect(noteNameToFrequency('Réb4')).toBeCloseTo(277.1827, 3);
		expect(noteNameToFrequency('Reb4')).toBeCloseTo(277.1827, 3);
	});

	it('accepts unicode accidentals and any letter case', () => {
		expect(noteNameToFrequency('sol♯4')).toBeCloseTo(415.3047, 3);
		expect(noteNameToFrequency('SI♭3')).toBeCloseTo(233.0819, 3);
	});

	it('ignores surrounding whitespace', () => {
		expect(noteNameToFrequency('  La4 ')).toBeCloseTo(440, 6);
	});

	it('applies a custom tuning', () => {
		expect(noteNameToFrequency('La4', 442)).toBeCloseTo(442, 6);
		expect(noteNameToFrequency('Do4', 442)).toBeCloseTo(262.8148, 3);
	});

	it('rejects unknown note names', () => {
		expect(() => noteNameToFrequency('H4')).toThrow(/note/);
		expect(() => noteNameToFrequency('Ut4')).toThrow(/note/);
	});

	it('rejects names without an octave', () => {
		expect(() => noteNameToFrequency('La')).toThrow(/octave/);
		expect(() => noteNameToFrequency('La#')).toThrow(/octave/);
	});

	it('rejects malformed octaves', () => {
		expect(() => noteNameToFrequency('La4.5')).toThrow();
		expect(() => noteNameToFrequency('La#')).toThrow();
	});
});

describe('frequencyToNearestNoteName', () => {
	it('names an exact note', () => {
		expect(frequencyToNearestNoteName(440)).toBe('La4');
		expect(frequencyToNearestNoteName(261.6256)).toBe('Do4');
	});

	it('rounds to the nearest note', () => {
		expect(frequencyToNearestNoteName(262)).toBe('Do4');
		expect(frequencyToNearestNoteName(415)).toBe('Sol#4');
	});

	it('uses sharps for enharmonic notes', () => {
		expect(frequencyToNearestNoteName(233.0819)).toBe('La#3');
	});

	it('applies a custom tuning', () => {
		expect(frequencyToNearestNoteName(442, 442)).toBe('La4');
	});
});

describe('noteNameToFrequency and frequencyToNearestNoteName', () => {
	it('round-trip within half a semitone', () => {
		for (const frequency of [247, 311, 415, 466, 587, 932]) {
			const roundTrip = noteNameToFrequency(frequencyToNearestNoteName(frequency));
			expect(Math.abs(roundTrip - frequency)).toBeLessThan(frequency * 0.03);
		}
	});
});
