import type { ItemMoveEvent } from "@snap-engine/snapsort";

type EntryId<T> = (entry: T) => string;

function movedIds(event: ItemMoveEvent): string[] {
  const ids = event.itemIds.length > 0 ? event.itemIds : [event.itemId];
  return ids.map(String);
}

export function moveEntries<T>(
  entries: T[],
  event: ItemMoveEvent,
  getId: EntryId<T>,
): T[] {
  const ids = movedIds(event);
  const idsToMove = new Set(ids);
  const entriesById = new Map(entries.map((entry) => [getId(entry), entry]));
  const moved = ids.flatMap((id) => {
    const entry = entriesById.get(id);
    return entry === undefined ? [] : [entry];
  });

  if (moved.length === 0) return entries;

  const next = entries.filter((entry) => !idsToMove.has(getId(entry)));
  const index = Math.max(0, Math.min(event.to.index, next.length));
  next.splice(index, 0, ...moved);
  return next;
}

export function moveEntriesAcrossLists<
  T,
  Lists extends Record<string, T[]>,
>(
  lists: Lists,
  event: ItemMoveEvent,
  targetListId: keyof Lists,
  getId: EntryId<T>,
): Lists {
  const ids = movedIds(event);
  const idsToMove = new Set(ids);
  const entriesById = new Map<string, T>();

  for (const entries of Object.values(lists) as T[][]) {
    for (const entry of entries) entriesById.set(getId(entry), entry);
  }

  const moved = ids.flatMap((id) => {
    const entry = entriesById.get(id);
    return entry === undefined ? [] : [entry];
  });
  if (moved.length === 0) return lists;

  const next = Object.fromEntries(
    Object.entries(lists).map(([listId, entries]) => [
      listId,
      (entries as T[]).filter((entry) => !idsToMove.has(getId(entry))),
    ]),
  ) as Lists;
  const target = next[targetListId].slice();
  const index = Math.max(0, Math.min(event.to.index, target.length));
  target.splice(index, 0, ...moved);
  next[targetListId] = target as Lists[keyof Lists];
  return next;
}
