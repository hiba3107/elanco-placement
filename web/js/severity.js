// How severity bands are described in words wherever they appear, so the
// meaning never depends on colour alone.

export const SEVERITY_LABELS = Object.freeze({ high: "High", medium: "Medium", low: "Low" });

export function describeComparedToMedian(severity) {
  const { comparedToMedian, score } = severity;
  if (score === 0) {
    return "No sightings in this period";
  }
  if (comparedToMedian === null) {
    return "One of the few cities with any sightings in this period";
  }
  const difference = Math.round((comparedToMedian - 1) * 100);
  if (difference === 0) {
    return "About the same as the median city";
  }
  return `${Math.abs(difference)}% ${difference > 0 ? "above" : "below"} the median city`;
}
