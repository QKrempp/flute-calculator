import { describe, expect, it } from 'vitest';
import { formatHertz, formatMillimeters, parseDecimal } from './units';

describe('parseDecimal', () => {
	it('parses point decimals', () => {
		expect(parseDecimal('12.5')).toBe(12.5);
	});

	it('parses French comma decimals', () => {
		expect(parseDecimal('12,5')).toBe(12.5);
	});

	it('parses integers with surrounding whitespace', () => {
		expect(parseDecimal(' 12 ')).toBe(12);
	});

	it('parses negative numbers', () => {
		expect(parseDecimal('-3.2')).toBe(-3.2);
	});

	it('returns null for empty or invalid text', () => {
		expect(parseDecimal('')).toBeNull();
		expect(parseDecimal('   ')).toBeNull();
		expect(parseDecimal('abc')).toBeNull();
		expect(parseDecimal('1,2,3')).toBeNull();
		expect(parseDecimal('12.')).toBeNull();
	});
});

describe('formatMillimeters', () => {
	it('formats with French decimals and millimeter precision', () => {
		expect(formatMillimeters(125.25)).toBe('125,3');
	});

	it('drops the decimal part when whole', () => {
		expect(formatMillimeters(100)).toBe('100');
	});
});

describe('formatHertz', () => {
	it('formats rounded to whole hertz', () => {
		expect(formatHertz(284.59)).toBe('285');
	});
});
