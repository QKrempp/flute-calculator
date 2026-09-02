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
		'w-full rounded border border-line-strong bg-surface px-2 py-1.5 text-ink placeholder:text-faint focus:border-accent-line focus:outline-none';
	const errorClass = 'mt-1 text-xs text-danger';

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

<fieldset class="rounded-lg border border-line bg-surface p-4">
	<legend class="px-2 text-sm font-semibold text-ink-soft">Les trous</legend>

	<label class="mt-2 block text-sm font-medium text-ink-soft">
		Gamme
		<select class="{inputClass} mt-1" bind:value={scale}>
			{#each SCALE_TYPES as scaleType (scaleType)}
				<option value={scaleType}>{SCALE_LABELS[scaleType]}</option>
			{/each}
		</select>
	</label>

	<p class="mt-2 text-xs text-faint">
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
						class="{inputClass} {errors[`hole-${index}`] ? 'border-danger-line focus:border-danger' : ''}"
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
						class="mt-1 rounded px-2 py-1 text-ghost hover:bg-surface-hover hover:text-muted"
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
			class="mt-3 rounded border border-dashed border-line-strong px-3 py-1.5 text-sm text-muted hover:border-accent-line-hover hover:text-accent-bright"
			onclick={addHole}
		>
			+ Ajouter un trou
		</button>
	{/if}
</fieldset>
