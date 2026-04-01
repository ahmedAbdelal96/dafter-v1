export function findUnknownFeatureKeys(
  selectedFeatures: string[] | undefined,
  catalogFeatures: string[] | undefined,
): string[] {
  if (!selectedFeatures?.length) {
    return [];
  }

  if (!catalogFeatures?.length) {
    return [];
  }

  const knownFeatures = new Set(catalogFeatures);
  return selectedFeatures.filter((feature) => !knownFeatures.has(feature));
}
