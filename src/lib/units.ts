/** Parses a decimal number accepting French commas, null when the text is not a plain number. */
export function parseDecimal(text: string): number | null {
	const normalized = text.trim().replace(',', '.');
	if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
		return null;
	}
	return Number(normalized);
}

/** Formats a length in millimeters with French decimals, at tenth-of-millimeter precision. */
export function formatMillimeters(millimeters: number): string {
	return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(millimeters);
}

/** Formats a frequency in hertz, rounded to whole units. */
export function formatHertz(hertz: number): string {
	return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(hertz);
}
