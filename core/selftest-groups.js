// Checks a self-test group table against the list of test files. Pure, so it runs in Node and in the browser.
// Returns problem strings; an empty list means the table is complete and each file is in exactly one group.
export function checkGroups(groups, files) {
  const problems = [];
  const ids = new Set();
  const home = new Map();
  for (const group of groups) {
    if (ids.has(group.id)) problems.push(`duplicate group id: ${group.id}`);
    ids.add(group.id);
    if (group.files.length === 0) problems.push(`empty group: ${group.id}`);
    for (const file of group.files) {
      if (!files.includes(file)) problems.push(`unknown file in group ${group.id}: ${file}`);
      if (home.has(file)) problems.push(`file in two groups: ${file} (${home.get(file)} and ${group.id})`);
      else home.set(file, group.id);
    }
  }
  for (const file of files) if (!home.has(file)) problems.push(`file in no group: ${file}`);
  return problems;
}
