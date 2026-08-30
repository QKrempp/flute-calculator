<script lang="ts">
	import { SCALE_TYPES, type ScaleType } from '$lib/calculation/scales';

	let {
		notes = $bindable(),
		scale = $bindable('free'),
		errors = {}
	}: {
		notes: string[];
		scale: ScaleType;
		errors: Record<string, string>;
	} = $props();

	const inputClass =
		'w-full rounded border border-slate-300 px-2 py-1.5 text-slate-800 focus:border-sky-500 focus:outline-none';
	const errorClass = 'mt-1 text-xs text-red-600';

	const SCALE_LABELS: Record<ScaleType, string> = {
		pentatonic: 'Pentatonique — 4 trous',
		diatonic: 'Diatonique — 6 trous',
		chromatic: 'Chromatique — 6 trous',
		free: 'Libre — notes au choix'
	};

	const drivenByScale = $derived(scale !== 'free');

	function addHole(): void {
		notes.push('');
	}

	function removeHole(index: number): void {
		notes.splice(index, 1);
	}
</script>

<fieldset class="rounded-lg border border-slate-200 bg-white p-4">
	<legend class="px-2 text-sm font-semibold text-slate-700">Les trous</legend>

	<label class="mt-2 block text-sm font-medium text-slate-700">
		Gamme
		<select
			class="{inputClass} mt-1 bg-white"
			bind:value={scale}
		>
			{#each SCALE_TYPES as scaleType (scaleType)}
				<option value={scaleType}>{SCALE_LABELS[scaleType]}</option>
			{/each}
		</select>
	</label>

	<p class="mt-2 text-xs text-slate-500">
		{#if drivenByScale}
			Les trous sont proposés depuis la note grave du tuyau.
		{:else}
			Une note par trou (ex. Sol4, Sib4, Do#5). Les diamètres sont calculés automatiquement.
		{/if}
	</p>

	<ul class="mt-3 flex flex-col gap-2">
		{#each notes as _, index (index)}
			<li class="flex items-start gap-2">
				<div class="flex-1">
					<input
						class="{inputClass} {errors[`hole-${index}`] ? 'border-red-400 focus:border-red-500' : ''}"
						type="text"
						placeholder="Note, ex. Sol4"
						bind:value={notes[index]}
						disabled={drivenByScale}
					/>
					{#if errors[`hole-${index}`]}
						<span class={errorClass}>{errors[`hole-${index}`]}</span>
					{/if}
				</div>
				{#if !drivenByScale}
					<button
						type="button"
						class="mt-1 rounded px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
						aria-label="Supprimer ce trou"
						onclick={() => removeHole(index)}
					>
						✕
					</button>
				{/if}
			</li>
		{/each}
	</ul>

	{#if !drivenByScale}
		<button
			type="button"
			class="mt-3 rounded border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-sky-400 hover:text-sky-600"
			onclick={addHole}
		>
			+ Ajouter un trou
		</button>
	{/if}
</fieldset>
