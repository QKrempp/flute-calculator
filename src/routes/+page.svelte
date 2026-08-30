<script lang="ts">
	import DrillingPlan from '$lib/components/DrillingPlan.svelte';
	import HolesEditor from '$lib/components/HolesEditor.svelte';
	import TubeForm from '$lib/components/TubeForm.svelte';
	import { designFlute, deriveLowestNoteFrequency } from '$lib/calculation/design';
	import { frequencyToNearestNoteName } from '$lib/calculation/notes';
	import { suggestHoleNotes, type ScaleType } from '$lib/calculation/scales';
	import { formatHertz } from '$lib/units';
	import { parseDesignInput, type TubeFormFields } from '$lib/design-input';

	const tubeFields = $state<TubeFormFields>({
		length: '500',
		boreDiameter: '16',
		wallThickness: '2',
		tuning: '440',
		lowestNote: ''
	});

	let holeNames = $state<string[]>([]);
	let scale = $state<ScaleType>('pentatonic');

	const parsed = $derived(parseDesignInput(tubeFields, holeNames));
	const tubeErrors = $derived(
		Object.fromEntries(Object.entries(parsed.errors).filter(([key]) => !key.startsWith('hole-')))
	);
	const holeErrors = $derived(
		Object.fromEntries(Object.entries(parsed.errors).filter(([key]) => key.startsWith('hole-')))
	);

	const lowestNoteHint = $derived(
		parsed.input && tubeFields.lowestNote.trim() === ''
			? `Estimation depuis la longueur : ${formatHertz(deriveLowestNoteFrequency(parsed.input.tube))} Hz`
			: ''
	);

	const tuningHertz = $derived(Number(tubeFields.tuning) > 0 ? Number(tubeFields.tuning) : 440);
	const lowestNoteName = $derived(
		parsed.input
			? frequencyToNearestNoteName(
					parsed.input.measuredLowestNoteFrequency ?? deriveLowestNoteFrequency(parsed.input.tube),
					tuningHertz
			)
			: null
	);

	// Suggest the hole notes of the selected scale, tracking the lowest note and the tuning.
	$effect(() => {
		if (scale === 'free' || lowestNoteName === null) return;
		holeNames = suggestHoleNotes(lowestNoteName, scale, tuningHertz);
	});

	const design = $derived(
		parsed.input
			? designFlute(
					parsed.input.tube,
					parsed.input.holeFrequencies,
					parsed.input.measuredLowestNoteFrequency
				)
			: null
	);
</script>

<svelte:head>
	<title>Calculateur de flûte</title>
	<meta
		name="description"
		content="Calculez le placement et le diamètre des trous d'une flûte à partir de votre tuyau."
	/>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-8">
	<h1 class="text-3xl font-bold text-sky-700">Calculateur de flûte</h1>
	<p class="mt-2 text-slate-600">
		Décrivez votre tuyau et les notes voulues : le calculateur en déduit la note grave, le diamètre
		de chaque trou et leur position sur le tube.
	</p>

	<div class="mt-6 grid items-start gap-4 md:grid-cols-2">
		<TubeForm fields={tubeFields} errors={tubeErrors} {lowestNoteHint} />
		<HolesEditor bind:notes={holeNames} bind:scale={scale} errors={holeErrors} />
	</div>

	{#if design}
		<DrillingPlan
				{design}
				tubeLengthCm={parsed.input?.tube.length ?? 0}
				tubeBoreCm={parsed.input?.tube.boreDiameter ?? 0}
			/>
	{:else}
		<p class="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
			Corrigez les champs signalés pour obtenir le plan de perçage.
		</p>
	{/if}
</main>

<footer class="mx-auto max-w-3xl px-4 pb-8 text-xs text-slate-400">
	Inspiré de l'article « Placement des trous » de vents-sauvages.fr. Les calculs donnent un point de
	départ : l'oreille reste l'outil final.
</footer>
