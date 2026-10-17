// Export parsing settings (core\csv.js, core\export-parse.js). Header names are compared after normalising:
// trim, lower-case, remove a byte order mark, spaces and hyphens become underscores.
export const parser = {
  // The first alias present in the header is used for date, time, mood and activities.
  // The note role collects every alias that is present (note text is counted, never stored).
  columnAliases: {
    date: ['full_date', 'date'],
    time: ['time'],
    mood: ['mood'],
    activities: ['activities', 'activity', 'tags'],
    note: ['note', 'note_title'],
  },
  // Candidates for the field separator. The one giving the most header fields wins; ties go to the earlier entry.
  delimiters: [',', ';', '\t'],
  // Tried after ISO YYYY-MM-DD, in this order. Both are day-first.
  extraDateFormats: ['DMY-dot', 'DMY-slash'],
  activitySeparator: '|',
  // Time cells: H:MM and HH:MM (and HH:MM:SS) as before. The dot form H.MM / HH.MM is read as minutes only when the two
  // digits after the dot are at most maxMinute; otherwise it stays a rejected shape. A decimal-hours export is shown in
  // parse stats (timeFractionMax) for the user to decide; nothing is converted silently.
  timeSeparators: [':', '.'],
  maxMinute: 59,
  maxFileBytes: 52428800, // 50 MB; checked before a file is read
  maxBadShapes: 3,        // distinct failure shapes reported in the parse stats
  maxShapeChars: 24,      // longer shapes are cut so that a shape never carries much text
  maxParseMsNode: 5000,   // time budget for a 1.1 MB export in Node tests
};
