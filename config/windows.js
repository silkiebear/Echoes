// Echo windows (SPEC 13). `days` is the span after an exposure day that is checked for the outcome.
export const windows = [
  { id: '1d', label: '1d', days: 1 },
  { id: '3d', label: '3d', days: 3 },
  { id: '1w', label: '1w', days: 7 },
  { id: '2w', label: '2w', days: 14 },
  { id: '1m', label: '1m', days: 30 },
  { id: '3m', label: '3m', days: 90 },
  { id: '6m', label: '6m', days: 180 },
  { id: '1y', label: '1y', days: 365 },
  { id: '2y', label: '2y', days: 730 },
  { id: '5y', label: '5y', days: 1825 },
  { id: '10y', label: '10y', days: 3650 },
];
