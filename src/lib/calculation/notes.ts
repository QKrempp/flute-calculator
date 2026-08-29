/** Map of French note names to their semitone index within an octave. */
const NOTE_SEMITONES: Record<string, number> = {
	do: 0,
	re: 2,
	ré: 2,
	mi: 4,
	fa: 5,
	sol: 7,
	la: 9,
	si: 11
};

/** Semitone names used when naming a frequency, sharps for enharmonics. */
const SEMITONE_NAMES = [
	'Do',
	'Do#',
	'Ré',
	'Ré#',
	'Mi',
	'Fa',
	'Fa#',
	'Sol',
	'Sol#',
	'La',
	'La#',
	'Si'
];

/** Semitone index of La4 in the reference octave numbering (Do0 = 0). */
const LA4_SEMITONE_INDEX = 57;

/** Converts a French note name such as "Sol#4" to its frequency (Hz) for the given tuning. */
export function noteNameToFrequency(noteName: string, tuning: number = 440): number {
	const match = noteName
		.trim()
		.toLowerCase()
		.match(/^(do|re|ré|mi|fa|sol|la|si)([#♯]|[b♭])?(-?\d+)$/);

	if (!match) {
		throw new Error(
			`Nom de note invalide : « ${noteName} » — nom français avec octave requis (ex. La4, Sol#3, Sib5)`
		);
	}

	const accidentalOffset =
		match[2] === undefined ? 0 : match[2] === '#' || match[2] === '♯' ? 1 : -1;
	const semitone = NOTE_SEMITONES[match[1]] + accidentalOffset;
	const octave = Number(match[3]);
	const semitonesFromLa4 = 12 * octave + semitone - LA4_SEMITONE_INDEX;
	return tuning * 2 ** (semitonesFromLa4 / 12);
}

/** Converts a frequency (Hz) to the nearest French note name for the given tuning. */
export function frequencyToNearestNoteName(frequency: number, tuning: number = 440): string {
	const semitonesFromLa4 = Math.round(12 * Math.log2(frequency / tuning));
	const semitoneIndex = LA4_SEMITONE_INDEX + semitonesFromLa4;
	const octave = Math.floor(semitoneIndex / 12);
	const semitone = ((semitoneIndex % 12) + 12) % 12;
	return `${SEMITONE_NAMES[semitone]}${octave}`;
}
