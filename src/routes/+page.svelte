<script lang="ts">
	import DrillingPlan from '$lib/components/DrillingPlan.svelte';
	import HolesEditor from '$lib/components/HolesEditor.svelte';
	import TubeForm from '$lib/components/TubeForm.svelte';
	import type { ScaleType, TubeFormFields } from '$lib/planning';
	import { planFlute } from '$lib/planning';

	const tubeFields = $state<TubeFormFields>({
		length: '500',
		boreDiameter: '16',
		wallThickness: '2',
		tuning: '440',
		lowestNote: ''
	});

	let holeNames = $state<string[]>([]);
	let scale = $state<ScaleType>('pentatonic');

	const plan = $derived(planFlute(tubeFields, holeNames, scale));
	const tubeErrors = $derived(
		Object.fromEntries(Object.entries(plan.errors).filter(([key]) => !key.startsWith('hole-')))
	);
	const holeErrors = $derived(
		Object.fromEntries(Object.entries(plan.errors).filter(([key]) => key.startsWith('hole-')))
	);

	// Adopt the suggested hole notes of the selected scale, tracking the lowest
	// note; the content key breaks the plan → suggestion → plan feedback loop.
	let lastSuggestedKey = '';
	$effect(() => {
		const suggested = plan.suggestedHoleNotes;
		if (suggested.length === 0) return;
		const key = suggested.join('|');
		if (key === lastSuggestedKey) return;
		lastSuggestedKey = key;
		holeNames = suggested;
	});
</script>

<svelte:head>
	<title>Calculateur de flûte</title>
	<meta
		name="description"
		content="Calculez le placement et le diamètre des trous d'une flûte à partir de votre tuyau."
	/>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-8">
	<h1 class="text-3xl font-bold text-accent">Calculateur de flûte</h1>
	<p class="mt-2 text-muted">
		Décrivez votre tuyau et les notes voulues : le calculateur en déduit la note grave, le diamètre
		de chaque trou et leur position sur le tube.
	</p>

	<div class="mt-6 grid items-start gap-4 md:grid-cols-2">
		<TubeForm fields={tubeFields} errors={tubeErrors} lowestNoteHint={plan.lowestNoteHint} />
		<HolesEditor bind:notes={holeNames} bind:scale={scale} errors={holeErrors} />
	</div>

	{#if plan.design}
		<DrillingPlan
			design={plan.design}
			tubeLengthCm={plan.tube?.length ?? 0}
			tubeBoreCm={plan.tube?.boreDiameter ?? 0}
		/>
	{:else}
		<p class="mt-6 rounded-lg border border-dashed border-line-strong bg-surface p-4 text-sm text-faint">
			Corrigez les champs signalés pour obtenir le plan de perçage.
		</p>
	{/if}
</main>

<footer class="mx-auto max-w-3xl px-4 pb-8 text-xs text-ghost">
	Inspiré de l'article « Placement des trous » de vents-sauvages.fr. Les calculs donnent un point de
	départ : l'oreille reste l'outil final.
</footer>
