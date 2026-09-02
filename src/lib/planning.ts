import {
	designFlute,
	deriveLowestNoteFrequency,
	type DesignIssue,
	type FluteDesign,
	type TubeSpec
} from './calculation/design';
import { frequencyToNearestNoteName, noteNameToFrequency } from './calculation/notes';
import { suggestHoleNotes, type ScaleType } from './calculation/scales';
import { formatHertz, parseDecimal } from './units';

export type { ScaleType } from './calculation/scales';

/** Raw text values of the tube form fields, as typed by the maker. */
export interface TubeFormFields {
	length: string;
	boreDiameter: string;
	wallThickness: string;
	tuning: string;
	lowestNote: string;
}

/** Everything the page renders for the current form state. */
export interface FlutePlan {
	/** Parsed tube in cm, null while a tube field is invalid. */
	tube: TubeSpec | null;
	/** Drilling plan when the whole form is valid, null otherwise. */
	design: FluteDesign | null;
	/** Hint about the lowest note derived from the tube, empty when measured. */
	lowestNoteHint: string;
	/** Name of the lowest note, driving scale suggestions. */
	lowestNoteName: string | null;
	/** Notes suggested for the selected scale, empty in free mode. */
	suggestedHoleNotes: string[];
	/** Message per invalid field, keyed by field name ('length', 'hole-0'…). */
	errors: Record<string, string>;
}

/** Computes everything the page renders from the raw form fields. */
export function planFlute(
	fields: TubeFormFields,
	holeNames: string[],
	scale: ScaleType
): FlutePlan {
	const parsed = parseForm(fields, holeNames);
	const errors = { ...parsed.errors };
	const lowestNoteFrequency = parsed.tube
		? parsed.measuredLowestNoteFrequency ?? deriveLowestNoteFrequency(parsed.tube)
		: null;
	const tuning = Number(fields.tuning) > 0 ? Number(fields.tuning) : 440;
	const lowestNoteName =
		lowestNoteFrequency === null ? null : frequencyToNearestNoteName(lowestNoteFrequency, tuning);

	const invalidPlan: FlutePlan = {
		tube: parsed.tube,
		design: null,
		lowestNoteHint: '',
		lowestNoteName: null,
		suggestedHoleNotes: [],
		errors
	};
	if (!parsed.tube || hasErrors(errors)) {
		return invalidPlan;
	}

	const result = designFlute(
		parsed.tube,
		parsed.holeFrequencies,
		parsed.measuredLowestNoteFrequency
	);
	if (result.kind === 'invalid') {
		errors[designIssueField(result.issue, parsed.parsedHoles)] = designIssueMessage(result.issue);
		return invalidPlan;
	}

	return {
		tube: parsed.tube,
		design: result.design,
		lowestNoteHint:
			parsed.measuredLowestNoteFrequency === undefined && lowestNoteFrequency !== null
				? `Estimation depuis la longueur : ${formatHertz(lowestNoteFrequency)} Hz`
				: '',
		lowestNoteName,
		suggestedHoleNotes:
			scale === 'free' || lowestNoteName === null
				? []
				: suggestHoleNotes(lowestNoteName, scale, tuning),
		errors
	};
}

/** A hole note parsed from the form, with the form row it came from. */
interface ParsedHole {
	frequency: number;
	fieldIndex: number;
}

/** A form fully parsed, before the domain invariants are checked. */
interface ParsedForm {
	tube: TubeSpec | null;
	holeFrequencies: number[];
	parsedHoles: ParsedHole[];
	measuredLowestNoteFrequency?: number;
	errors: Record<string, string>;
}

/** Parses the raw form fields, reporting field-level errors. */
function parseForm(fields: TubeFormFields, holeNames: string[]): ParsedForm {
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

	return { tube, holeFrequencies, parsedHoles, measuredLowestNoteFrequency, errors };
}

/** Tells whether any field-level error was reported. */
function hasErrors(errors: Record<string, string>): boolean {
	return Object.keys(errors).length > 0;
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
			return `Note grave mesurée plus aiguë que la longueur du tuyau ne permet (limite ${formatHertz(issue.limit)} Hz) — vérifiez que vous mesurez la fondamentale et non un harmonique`;
		case 'holeAboveEmbouchure':
			return `Trou à ${issue.frequency.toFixed(0)} Hz au-dessus de l'embouchure — la note grave mesurée semble trop grave`;
	}
}

/** Routes a design issue to the form field that can fix it. */
function designIssueField(issue: DesignIssue, parsedHoles: ParsedHole[]): string {
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
