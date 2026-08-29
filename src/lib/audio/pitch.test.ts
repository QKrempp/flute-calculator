import { describe, expect, it } from 'vitest';
import { detectPitch } from './pitch';

const SAMPLE_RATE = 44100;

/** Synthesizes a pure sine wave of the given amplitude and duration. */
function sineWave(
	frequency: number,
	seconds: number = 0.1,
	amplitude: number = 1,
	sampleRate: number = SAMPLE_RATE
): Float32Array {
	const samples = new Float32Array(Math.round(seconds * sampleRate));
	for (let index = 0; index < samples.length; index++) {
		samples[index] = amplitude * Math.sin((2 * Math.PI * frequency * index) / sampleRate);
	}
	return samples;
}

/** Synthesizes a tone with several harmonics, flute-like. */
function harmonicTone(fundamental: number, amplitudes: number[], seconds = 0.15): Float32Array {
	const samples = new Float32Array(Math.round(seconds * SAMPLE_RATE));
	for (let index = 0; index < samples.length; index++) {
		samples[index] = amplitudes.reduce(
			(sum, amplitude, harmonic) =>
				sum + amplitude * Math.sin((2 * Math.PI * fundamental * (harmonic + 1) * index) / SAMPLE_RATE),
			0
		);
	}
	return samples;
}

/** Asserts the detected frequency matches the expected one within 0.5% relative error. */
function expectPitch(samples: Float32Array, expected: number, sampleRate = SAMPLE_RATE): void {
	const detected = detectPitch(samples, sampleRate);
	expect(detected).not.toBeNull();
	expect(Math.abs(detected! - expected)).toBeLessThan(expected * 0.005);
}

describe('detectPitch', () => {
	it('detects pure tones across the flute range', () => {
		expectPitch(sineWave(150), 150);
		expectPitch(sineWave(261.6256), 261.6256);
		expectPitch(sineWave(440), 440);
		expectPitch(sineWave(880), 880);
	});

	it('detects tones at another sample rate', () => {
		expectPitch(sineWave(330, 0.1, 1, 48000), 330, 48000);
	});

	it('detects a flute-like tone with harmonics', () => {
		expectPitch(harmonicTone(220, [0.6, 0.4, 0.3]), 220);
	});

	it('detects the fundamental even when weaker than the second harmonic', () => {
		expectPitch(harmonicTone(196, [0.25, 0.5, 0.35, 0.2]), 196);
	});

	it('ignores overall loudness thanks to normalization', () => {
		expectPitch(sineWave(440, 0.1, 0.05), 440);
	});

	it('returns null for silence', () => {
		expect(detectPitch(new Float32Array(4096), SAMPLE_RATE)).toBeNull();
	});

	it('returns null for an empty buffer', () => {
		expect(detectPitch(new Float32Array(0), SAMPLE_RATE)).toBeNull();
	});

	it('returns null for random noise', () => {
		const noise = new Float32Array(4410);
		for (let index = 0; index < noise.length; index++) {
			noise[index] = Math.random() * 2 - 1;
		}
		expect(detectPitch(noise, SAMPLE_RATE)).toBeNull();
	});

	it('returns null below the detectable range', () => {
		expect(detectPitch(sineWave(20), SAMPLE_RATE)).toBeNull();
	});

	it('returns null for a non-positive sample rate', () => {
		expect(detectPitch(sineWave(440), 0)).toBeNull();
	});

	it('returns null for a buffer shorter than the search range', () => {
		expect(detectPitch(sineWave(440).subarray(0, 8), SAMPLE_RATE)).toBeNull();
	});
});
