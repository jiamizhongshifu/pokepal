// Run in an isolated development browser with a newly created synthetic trainer.
(async () => {
  const game = window.__game;
  const { LEARNING_UNITS, LEARNING_CHAPTERS } = await import('/src/data/curriculum.ts');
  const { guidedPath, currentNode } = await import('/src/lib/learningPath.ts');
  const { FIRST_FRIEND } = await import('/src/data/creatures.ts');
  const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const check = (ok, message) => { if (!ok) throw new Error(message); };

  check(await game.getState().inviteFriend(FIRST_FRIEND), 'fixture needs one welcome invitation');
  game.getState().go({ name: 'home' });
  await frame();
  const before = JSON.stringify(game.getState().save.learning);
  const chapters = guidedPath(game.getState().save);
  for (const chapter of chapters) {
    const deadline=performance.now()+5000;
    while(document.querySelector('.path-plaque strong')?.textContent!==chapter.title){
      if(performance.now()>deadline)throw Error('chapter did not open: '+chapter.title);
      await frame();
    }
    check(document.querySelectorAll('.path-stop').length === chapter.nodes.length, 'missing stops');
    if (chapter.index < chapters.length - 1) {
      document.querySelector('[aria-label="下一章"]').click();
      await frame();
    }
  }
  check(document.querySelector('[aria-label="下一章"]').disabled, 'last chapter boundary');
  document.querySelector('.path-now').click();
  await frame();
  check(document.querySelector('[aria-label="上一章"]').disabled, 'first chapter boundary');
  document.querySelector('.path-stop.is-locked').click();
  await frame();
  check(game.getState().screen.name === 'home', 'locked stop cannot start');
  check(JSON.stringify(game.getState().save.learning) === before, 'browsing must preserve progress');
  const next = currentNode(chapters);
  document.querySelector('.stop-go').click();
  await frame();
  check(game.getState().screen.id === next.unit.id && next.unit.id === LEARNING_UNITS[0].id, 'start current lesson');
  return { passed: true, chapters: LEARNING_CHAPTERS.length };
})()
