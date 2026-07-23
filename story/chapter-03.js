// CHAPTER 3 — NO EASY POINTS · "stamina war"
// Rivals: Pato, Tamara, Luna, Zakhar
// NOTE: Zakhar is Strigidae's mentor AND a rival here — Strigidae players get a special beat.
export default {
  id: 'chapter-3-intro',
  chapter: 3,
  kicker: 'CHAPTER 3 · NO EASY POINTS',
  scenes: {
    start: [
      { bg: 'court', speaker: 'narrator', text: 'Some chapters test your arms. This one tests your lungs. The Court Crushers do not beat you in a rally — they beat you in the rally after the rally after the rally.' },
      { speaker: 'mentor', text: {
        strigidae: 'You have read the roster. Yes. I am in it. I told you on your first day: watching is the first skill. I have been watching you all season.',
        otters: 'The Court Crushers never hit the hardest shot. They hit the NEXT shot. Forever! Bring water. And snacks. Mostly snacks.',
        shizuka: 'Tamara and Zakhar. Two players who never hurry. This chapter is a long walk. Pace yourself or be carried off it.' } },
      { speaker: 'narrator', text: {
        strigidae: 'Your own mentor, across the net. The chapter was named by people who knew exactly what that would do to you.',
        otters: 'Tamara plays angry and plays honest about it. Luna waits for the moment you relax, and punishes the relax itself.',
        shizuka: 'Tamara calls Big-B a bitter rival. You wear these colors — she will not forget that. Luna will not need to.' } },
      { speaker: 'captain', text: {
        strigidae: 'He asked to be placed in this chapter. Said he refuses to teach anyone he has not measured. So. Measure well.',
        otters: 'Tamara doesn\'t like me. Long story, don\'t ask. Use it — she\'ll chase. Make her chase wrong.',
        shizuka: 'Zakhar. If you beat him, tell him the court said hello. He will understand. He might even smile. Once.' } },
      { speaker: 'narrator', text: '"No easy points" is not a warning. It is a schedule.' },
    ],
  },
};
