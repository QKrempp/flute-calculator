import { designFlute, type DesignIssue, type TubeSpec } from './calculation/design';
import { noteNameToFrequency } from './calculation/notes';
import { parseDecimal } from './units';

/** Raw text values of the tube form fields, as typed by the maker. */
export interface TubeFormFields {
	length: string;
	boreDiameter: string;
	wallThickness: string;
	tuning: string;
	lowestNote: string;
}

/** A validated design input, ready for designFlute, all lengths in cm. */
export interface DesignInput {
	tube: TubeSpec;
	holeFrequencies: number[];
	measuredLowestNoteFrequency?: number;
}

/** The outcome of parsing the design form: an input when valid, field errors otherwise. */
export interface DesignFormResult {
	input: DesignInput | null;
	errors: Record<string, string>;
}

/** Parses and validates the design form, reporting errors keyed by field name. */
export function parseDesignInput(fields: TubeFormFields, holeNames: string[]): DesignFormResult {
	const errors: Record<string, string> = {};

	const length = parsePositiveNumber(fields.length);
	const boreDiameter = parsePositiveNumber(fields.boreDiameter);
	const wallThickness = parsePositiveNumber(fields.wallThickness);
	const tuning = parsePositiveNumber(fields.tuning);
	if (length === null) errors['length'] = 'Longueur invalide';
	if (boreDiameter === null) errors['boreDiameter'] = 'Diamètre de perce invalide';
	if (wallThickness === null) errors['wallThickness'] = 'Épaisseur de paroi invalide';
	if (tuning === null) errors['tuning'] = 'Diapason invalide';

	let measuredLowestNoteFrequency: number | undefined;
	if (fields.lowestNote.trim() !== '') {
		const parsed = parsePositiveNumber(fields.lowestNote);
		if (parsed === null) {
			errors['lowestNote'] = 'Fréquence invalide';
		} else {
			measuredLowestNoteFrequency = parsed;
		}
	}

	const tube =
		length !== null && boreDiameter !== null && wallThickness !== null
			? {
				length: length / 10,
				boreDiameter: boreDiameter / 10,
				wallThickness: wallThickness / 10
			}
			: null;

	const holeFrequencies: number[] = [];
	const parsedHoles: { frequency: number; fieldIndex: number }[] = [];
	holeNames.forEach((name, index) => {
		if (name.trim() === '') {
			return;
		}
		try {
			const frequency = noteNameToFrequency(name, tuning ?? 440);
			parsedHoles.push({ frequency, fieldIndex: index });
			holeFrequencies.push(frequency);
		} catch (error) {
			errors[`hole-${index}`] = error instanceof Error ? error.message : 'Note invalide';
		}
	});

	if (Object.keys(errors).length === 0) {
		// Field-level checks passed: run the full design once so domain issues
		// surface on the field that can fix them, never in the page.
		const result = designFlute(tube!, holeFrequencies, measuredLowestNoteFrequency);
		if (result.kind === 'invalid') {
			errors[designIssueField(result.issue, parsedHoles)] = designIssueMessage(result.issue);
		}
	}

	if (Object.keys(errors).length > 0) {
		return { input: null, errors };
	}
	return {
		input: { tube: tube!, holeFrequencies, measuredLowestNoteFrequency },
		errors
	};
}

/** Parses a strictly positive decimal, null when missing, invalid or not positive. */
function parsePositiveNumber(text: string): number | null {
	const value = parseDecimal(text);
	return value !== null && value > 0 ? value : null;
}

/** Translates a design issue into the French message shown on its field. */
function designIssueMessage(issue: DesignIssue): string {
	switch (issue.kind) {
		case 'holeBelowLowestNote':
			return `Note trop grave : au-dessus de ${issue.lowestNoteFrequency.toFixed(0)} Hz requis`;
		case 'measuredNoteNotFundamental':
			return 'Note grave mesurée plus aiguë que la longueur du tuyau ne permet — vérifiez que vous mesurez la fondamentale et non un harmonique';
		case 'holeAboveEmbouchure':
			return `Trou à ${issue.frequency.toFixed(0)} Hz au-dessus de l'embouchure — la note grave mesurée semble trop grave`;
	}
}

/** Routes a design issue to the form field that can fix it. */
function designIssueField(
	issue: DesignIssue,
	parsedHoles: { frequency: number; fieldIndex: number }[]
): string {
	switch (issue.kind) {
		case 'holeBelowLowestNote': {
			const offending = parsedHoles.find((hole) => hole.frequency === issue.frequency);
			return offending ? `hole-${offending.fieldIndex}` : 'lowestNote';
		}
		case 'measuredNoteNotFundamental':
		case 'holeAboveEmbouchure':
			return 'lowestNote';
	}
}
