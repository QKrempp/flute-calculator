export {
	computeHolePlacements,
	CORRECTION_ITERATIONS,
	type InstrumentDesign,
	type PipeSpec,
	type ToneHolePlacement,
	type ToneHoleSpec
} from './instrument';
export {
	endCorrection,
	theoreticalPipeLength,
	SPEED_OF_SOUND_CM_PER_SECOND,
	type ResonatorKind
} from './pipe';
export {
	acousticThickness,
	closedHoleCorrection,
	cutoffFrequency,
	openHoleCorrection,
	openHoleInteractionCorrection,
	type ToneHoleGeometry
} from './tone-hole';
