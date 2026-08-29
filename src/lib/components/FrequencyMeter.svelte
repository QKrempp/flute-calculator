<script lang="ts">
	import { detectPitch } from '$lib/audio/pitch';
	import { frequencyToNearestNoteName } from '$lib/calculation/notes';
	import { formatHertz } from '$lib/units';

	let {
		tuning = 440,
		onValidate
	}: { tuning?: number; onValidate: (frequency: number) => void } = $props();

	let listening = $state(false);
	let starting = $state(false);
	let liveFrequency = $state<number | null>(null);
	let failure = $state('');

	let stream: MediaStream | null = null;
	let audioContext: AudioContext | null = null;
	let analyser: AnalyserNode | null = null;
	let samples = new Float32Array(0);
	let readLoopId = 0;

	const measureButtonClass =
		'rounded border border-sky-500 px-2 py-1 text-xs font-medium text-sky-600 hover:bg-sky-50';
	const validateButtonClass =
		'rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 enabled:hover:bg-slate-50 disabled:opacity-50';
	const cancelButtonClass = 'rounded px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700';

	/** Starts listening to the microphone and refreshing the live frequency reading. */
	async function startListening(): Promise<void> {
		if (starting || listening) return;
		starting = true;
		failure = '';
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
			});
			audioContext = new AudioContext();
			analyser = audioContext.createAnalyser();
			analyser.fftSize = 4096;
			samples = new Float32Array(analyser.fftSize);
			audioContext.createMediaStreamSource(stream).connect(analyser);
			listening = true;
			readNextBuffer();
		} catch {
			stopListening();
			failure = 'Accès au micro refusé ou indisponible';
		} finally {
			starting = false;
		}
	}

	const READ_INTERVAL_MS = 80;
	let lastReadAt = 0;

	/** Reads the latest buffer and schedules the next read while listening. */
	function readNextBuffer(now = 0): void {
		if (!listening || !analyser || !audioContext) return;
		if (now - lastReadAt >= READ_INTERVAL_MS) {
			lastReadAt = now;
			analyser.getFloatTimeDomainData(samples);
			liveFrequency = detectPitch(samples, audioContext.sampleRate);
		}
		readLoopId = requestAnimationFrame(readNextBuffer);
	}

	/** Stops the microphone and the reading loop. */
	function stopListening(): void {
		listening = false;
		cancelAnimationFrame(readLoopId);
		stream?.getTracks().forEach((track) => track.stop());
		stream = null;
		audioContext?.close();
		audioContext = null;
		analyser = null;
		liveFrequency = null;
	}

	/** Validates the current reading and feeds it to the form. */
	function validate(): void {
		if (liveFrequency === null) {
			return;
		}
		const frequency = liveFrequency;
		stopListening();
		onValidate(frequency);
	}

	// Releases the microphone when the component disappears.
	$effect(() => () => stopListening());
</script>

<span class="mt-1 flex items-center gap-2">
	{#if !listening}
		<button type="button" class={measureButtonClass} disabled={starting} onclick={startListening}>
			🎤 Mesurer au micro
		</button>
	{:else}
		<span class="text-xs font-medium text-sky-700">
			{#if liveFrequency === null}
				Écoute…
			{:else}
				{formatHertz(liveFrequency)} Hz · {frequencyToNearestNoteName(liveFrequency, tuning)}
			{/if}
		</span>
		<button
			type="button"
			class={validateButtonClass}
			disabled={liveFrequency === null}
			onclick={validate}
		>
			Valider
		</button>
		<button type="button" class={cancelButtonClass} onclick={stopListening}>
			Annuler
		</button>
	{/if}
	{#if failure}
		<span class="text-xs text-red-600">{failure}</span>
	{/if}
</span>
