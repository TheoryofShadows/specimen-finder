// Specimen Finder — analysis math
// Pure functions, no DOM access. Shared between index.html (the app)
// and tests.html (the browser-runnable assertions).
//
// References:
// - Iglewicz, B. and Hoaglin, D.C. (1993). "Volume 16: How to Detect and
//   Handle Outliers", The ASQC Basic References in Quality Control:
//   Statistical Techniques, ASQC Quality Press. Defines the modified
//   Z-score with threshold 3.5.
// - Mardia, K.V. (1972). "Statistics of Directional Data." Used for the
//   circular mean of longitudes.

(function (global) {
  'use strict';

  function median(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const m = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
  }

  function mad(arr, med) {
    if (arr.length === 0) return 0;
    const dev = arr.map(x => Math.abs(x - med));
    return median(dev);
  }

  function modifiedZScore(value, med, madValue) {
    if (madValue === 0) return 0;
    return 0.6745 * (value - med) / madValue;
  }

  // Great-circle distance in kilometres (haversine).
  function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Circular longitude median: handles species that straddle the antimeridian
  // (e.g., Pacific or circumboreal). Uses unit-vector mean which is well-defined
  // on the circle. Falls back to ordinary median when the span is < 180 degrees,
  // because ordinary median is the more robust statistic in that case.
  function circularLongitudeMedian(longitudes) {
    if (longitudes.length === 0) return 0;
    const sorted = [...longitudes].sort((a, b) => a - b);
    if (sorted[sorted.length - 1] - sorted[0] < 180) return median(longitudes);
    let sumX = 0, sumY = 0;
    longitudes.forEach(lon => {
      const r = lon * Math.PI / 180;
      sumX += Math.cos(r);
      sumY += Math.sin(r);
    });
    const angle = Math.atan2(sumY / longitudes.length, sumX / longitudes.length);
    return angle * 180 / Math.PI;
  }

  const api = { median, mad, modifiedZScore, distanceKm, circularLongitudeMedian };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.SpecimenFinderAnalysis = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
