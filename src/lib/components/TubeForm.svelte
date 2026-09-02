<script lang="ts">
	import type { TubeFormFields } from '$lib/planning';
	import FrequencyMeter from './FrequencyMeter.svelte';

	let {
		fields = $bindable(),
		errors = {},
		lowestNoteHint = ''
	}: { fields: TubeFormFields; errors: Record<string, string>; lowestNoteHint?: string } = $props();

	const inputClass = 'w-full rounded border border-slate-300 px-2 py-1.5 text-slate-800 focus:border-sky-500 focus:outline-none';
	const invalidClass = 'border-red-400 focus:border-red-500';
	const labelClass = 'block text-sm font-medium text-slate-700';
	const errorClass = 'mt-1 text-xs text-red-600';
</script>

<fieldset class="rounded-lg border border-slate-200 bg-white p-4">
	<legend class="px-2 text-sm font-semibold text-slate-700">Le tuyau</legend>

	<div class="mt-2 grid grid-cols-2 gap-3">
		<label class={labelClass}>
			Longueur (mm)
			<input
				class="{inputClass} {errors['length'] ? invalidClass : ''}"
				type="text"
				inputmode="decimal"
				bind:value={fields.length}
			/>
			{#if errors['length']}<span class={errorClass}>{errors['length']}</span>{/if}
		</label>

		<label class={labelClass}>
			Diamètre de perce (mm)
			<input
				class="{inputClass} {errors['boreDiameter'] ? invalidClass : ''}"
				type="text"
				inputmode="decimal"
				bind:value={fields.boreDiameter}
			/>
			{#if errors['boreDiameter']}<span class={errorClass}>{errors['boreDiameter']}</span>{/if}
		</label>

		<label class={labelClass}>
			Épaisseur de paroi (mm)
			<input
				class="{inputClass} {errors['wallThickness'] ? invalidClass : ''}"
				type="text"
				inputmode="decimal"
				bind:value={fields.wallThickness}
			/>
			{#if errors['wallThickness']}<span class={errorClass}>{errors['wallThickness']}</span>{/if}
		</label>

		<label class={labelClass}>
			Diapason (Hz)
			<input
				class="{inputClass} {errors['tuning'] ? invalidClass : ''}"
				type="text"
				inputmode="decimal"
				bind:value={fields.tuning}
			/>
			{#if errors['tuning']}<span class={errorClass}>{errors['tuning']}</span>{/if}
		</label>

		<label class={labelClass}>
			Note grave mesurée (Hz)
			<span class="font-normal text-slate-500">— optionnel</span>
			<input
				class="{inputClass} {errors['lowestNote'] ? invalidClass : ''}"
				type="text"
				inputmode="decimal"
				bind:value={fields.lowestNote}
			/>
			{#if errors['lowestNote']}
				<span class={errorClass}>{errors['lowestNote']}</span>
			{:else if lowestNoteHint}
				<span class="mt-1 block text-xs text-slate-500">{lowestNoteHint}</span>
			{/if}
			<FrequencyMeter
				tuning={Number(fields.tuning) > 0 ? Number(fields.tuning) : 440}
				onValidate={(frequency) => (fields.lowestNote = frequency.toFixed(1))}
			/>
		</label>
	</div>
</fieldset>
