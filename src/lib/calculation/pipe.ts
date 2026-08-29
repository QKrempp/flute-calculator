/** The different families of wind instrument resonators, as described in the article. */
export type ResonatorKind = 'open' | 'closed-cylindrical' | 'closed-conical';

/** Speed of sound in warm instrument air, in cm/s (the article recommends 345 m/s). */
export const SPEED_OF_SOUND_CM_PER_SECOND = 34_500;

/** Factor k relating pipe length to wavelength: 2 for open and conical resonators, 4 for closed cylindrical ones. */
const WAVELENGTH_DIVIDER: Record<ResonatorKind, number> = {
	open: 2,
	'closed-cylindrical': 4,
	'closed-conical': 2
};

/** Computes the theoretical pipe length (cm) producing a note at the given frequency (Hz). */
export function theoreticalPipeLength(frequency: number, resonator: ResonatorKind): number {
	return SPEED_OF_SOUND_CM_PER_SECOND / (WAVELENGTH_DIVIDER[resonator] * frequency);
}

/** Computes the acoustic length (cm) a real pipe gains beyond its open end. */
export function endCorrection(boreDiameter: number): number {
	return 0.6133 * (boreDiameter / 2);
}
