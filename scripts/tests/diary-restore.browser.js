// Run in an empty, synthetic database.
(async () => {
  const { saveDiary, listDiaries, restoreDiaries, readDiary } = await import('/src/lib/db.ts');
  const first = { id: 'a', createdAt: 1, transcript: 'original' };
  const second = { id: 'b', createdAt: 2, transcript: 'second' };
  await saveDiary(first);
  const counts = await Promise.all([
    restoreDiaries([{ ...first, transcript: 'changed' }, second]),
    restoreDiaries([second]),
  ]);
  if (counts[0] + counts[1] !== 1) throw Error('Each new diary may be restored only once');
  if ((await readDiary('a')).transcript !== 'original') throw Error('An existing diary was overwritten');
  if ((await listDiaries('newest')).map(d => d.id).join() !== 'b,a') throw Error('Incorrect display order');
  if ((await listDiaries('backup')).map(d => d.id).join() !== 'a,b') throw Error('Incorrect backup order');
  return { passed: true };
})()
