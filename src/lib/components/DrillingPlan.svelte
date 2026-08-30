<script lang="ts">
	import type { FluteDesign } from '$lib/calculation/design';
	import { frequencyToNearestNoteName } from '$lib/calculation/notes';
	import { formatHertz, formatMillimeters } from '$lib/units';

	let {
		design,
		tubeLengthCm
	}: { design: FluteDesign; tubeLengthCm: number } = $props();

	const rows = $derived(
		[...design.placements]
			.reverse()
			.map((placement, index, all) => ({
				note: frequencyToNearestNoteName(placement.frequency),
				drillMm: placement.holeDiameter * 10,
				positionMm: (tubeLengthCm - placement.position) * 10,
				spacingMm:
					index === 0
						? (tubeLengthCm - placement.position) * 10
						: (all[index - 1].position - placement.position) * 10,
				cutoff: placement.cutoffFrequency
			}))
	);

	const lowestNoteName = $derived(frequencyToNearestNoteName(design.lowestNoteFrequency));
</script>

<section class="mt-6 rounded-lg border border-slate-200 bg-white p-4">
	<h2 class="text-lg font-semibold text-slate-800">Plan de perçage</h2>

	<div class="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
		<span>
			Note grave :
			<strong class="text-slate-800">{formatHertz(design.lowestNoteFrequency)} Hz</strong>
			({lowestNoteName})
		</span>
		<span>
			Cible de coupure :
			<strong class="text-slate-800">{formatHertz(design.cutoffTarget)} Hz</strong>
		</span>
	</div>

	{#if rows.length > 0}
		<div class="mt-4 overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-slate-300 text-left font-medium text-slate-600">
						<th class="px-2 py-1.5">Note</th>
						<th class="px-2 py-1.5">Foret Ø (mm)</th>
						<th class="px-2 py-1.5">Position depuis le pavillon (mm)</th>
						<th class="px-2 py-1.5">Distance (mm)</th>
						<th class="px-2 py-1.5">Coupure (Hz)</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.note + row.positionMm)}
						<tr class="border-b border-slate-100">
							<td class="px-2 py-1.5 font-medium text-slate-800">{row.note}</td>
							<td class="px-2 py-1.5">{formatMillimeters(row.drillMm)}</td>
							<td class="px-2 py-1.5">{formatMillimeters(row.positionMm)}</td>
							<td class="px-2 py-1.5">{formatMillimeters(row.spacingMm)}</td>
							<td class="px-2 py-1.5">{formatHertz(row.cutoff)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="mt-3 text-xs text-slate-500">
			Positions mesurées depuis le bout du tuyau (côté pavillon, opposé à l'embouchure) ; distance
			jusqu'au trou suivant côté pavillon (bout du tuyau pour le trou le plus grave). Percez plus petit
			que prévu et accordez en remontant.
		</p>
	{:else}
		<p class="mt-3 text-sm text-slate-500">
			Ajoutez des trous pour obtenir le plan de perçage.
		</p>
	{/if}
</section>
