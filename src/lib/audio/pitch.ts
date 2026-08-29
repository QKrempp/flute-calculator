/** Minimum frequency (Hz) the detector searches for; below it a buffer holds too few periods. */
export const MIN_DETECTABLE_FREQUENCY = 50;

/** Maximum frequency (Hz) the detector searches for, well above any flute's lowest note. */
export const MAX_DETECTABLE_FREQUENCY = 2000;

/** Minimum RMS amplitude for a buffer to count as sound rather than silence. */
const MIN_RMS_AMPLITUDE = 0.01;

/** Minimum normalized correlation for a buffer to count as a periodic tone. */
const MIN_TONE_CLARITY = 0.8;

/** A candidate period must score at least this fraction of the best correlation. */
const PERIOD_TOLERANCE = 0.9;

/** Detects the fundamental frequency (Hz) of a time-domain buffer, null for silence or noise. */
export function detectPitch(samples: Float32Array, sampleRate: number): number | null {
	if (samples.length < 4 || sampleRate <= 0) {
		return null;
	}
	if (rootMeanSquare(samples) < MIN_RMS_AMPLITUDE) {
		return null;
	}

	const minLag = Math.max(1, Math.floor(sampleRate / MAX_DETECTABLE_FREQUENCY));
	const maxLag = Math.min(
		Math.floor(sampleRate / MIN_DETECTABLE_FREQUENCY),
		Math.floor(samples.length / 2)
	);
	if (maxLag - minLag < 2) {
		return null;
	}

	const correlations = normalizedCorrelations(samples, minLag, maxLag);
	const periodLag = findPeriodLag(correlations, minLag, maxLag);
	if (periodLag === null) {
		return null;
	}

	const frequency = sampleRate / refineLag(correlations, periodLag, minLag);
	if (frequency < MIN_DETECTABLE_FREQUENCY || frequency > MAX_DETECTABLE_FREQUENCY) {
		return null;
	}
	return frequency;
}

/** Computes the RMS amplitude of the buffer. */
function rootMeanSquare(samples: Float32Array): number {
	let sumOfSquares = 0;
	for (let index = 0; index < samples.length; index++) {
		sumOfSquares += samples[index] * samples[index];
	}
	return Math.sqrt(sumOfSquares / samples.length);
}

/** Computes the normalized autocorrelation for every lag in the range (McLeod's NSDF). */
function normalizedCorrelations(
	samples: Float32Array,
	minLag: number,
	maxLag: number
): Float32Array {
	const correlations = new Float32Array(maxLag - minLag + 1);
	for (let lag = minLag; lag <= maxLag; lag++) {
		let correlation = 0;
		let energy = 0;
		for (let index = 0; index + lag < samples.length; index++) {
			correlation += samples[index] * samples[index + lag];
			energy += samples[index] * samples[index] + samples[index + lag] * samples[index + lag];
		}
		correlations[lag - minLag] = energy === 0 ? 0 : (2 * correlation) / energy;
	}
	return correlations;
}

/** Finds the tone's period lag: the earliest interior peak close to the best correlation. */
function findPeriodLag(
	correlations: Float32Array,
	minLag: number,
	maxLag: number
): number | null {
	const scoreAt = (lag: number) => correlations[lag - minLag];

	let bestScore = 0;
	for (let lag = minLag + 1; lag < maxLag; lag++) {
		bestScore = Math.max(bestScore, scoreAt(lag));
	}
	if (bestScore < MIN_TONE_CLARITY) {
		return null;
	}

	// The earliest strong peak wins: preferring the shortest period avoids hearing
	// an octave below the played note when multiples of the period correlate highly too.
	for (let lag = minLag + 1; lag < maxLag; lag++) {
		if (
			scoreAt(lag) >= bestScore * PERIOD_TOLERANCE &&
			scoreAt(lag) >= scoreAt(lag - 1) &&
			scoreAt(lag) >= scoreAt(lag + 1)
		) {
			return lag;
		}
	}
	return null;
}

/** Refines a peak lag to sub-sample precision with a parabola through its neighbors. */
function refineLag(correlations: Float32Array, lag: number, minLag: number): number {
	const before = correlations[lag - 1 - minLag];
	const at = correlations[lag - minLag];
	const after = correlations[lag + 1 - minLag];
	const curvature = before - 2 * at + after;
	if (curvature === 0) {
		return lag;
	}
	return lag + (0.5 * (before - after)) / curvature;
}
