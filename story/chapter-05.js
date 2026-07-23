// CHAPTER 5 — THE SECOND HAND · "storekeeper test"
// Story: your club's second-in-command steps out from behind the counter.
// PHASE 1 REFERENCE SCENE: contains a 3-way choice that branches dialogue and
// converges. Flavor only — flags/affinity consequences land in Phase 2.
export default {
  id: 'chapter-5-intro',
  chapter: 5,
  kicker: 'CHAPTER 5 · THE SECOND HAND',
  scenes: {
    start: [
      { bg: 'store', speaker: 'narrator', text: 'Chapter five. You notice it before anyone says anything: {store} is closed.' },
      { speaker: 'narrator', text: 'The box shelf is dark. For the first time since you arrived, {keeper} is not behind the counter.\n\n{keeper} is on the court.' },
      { speaker: 'keeper', text: {
        strigidae: 'Four chapters. You bought from me, opened what I handed you, built something from it. Now I find out what I was selling.',
        otters: 'SURPRISE! It\'s me! The Otter Box is closed, the Otter Box is sorry, and the Otter Box is going to play you in volleyball now. I have waited WEEKS to say that.',
        shizuka: 'The Cafe is quiet. You already know why. I do not sell chances — I am the chance you will have to take.' } },
      { choice: [
        { text: '"I\'m ready. Test me."', goto: 'bold' },
        { text: '"Why you? Why not the captain?"', goto: 'why' },
        { text: '"Then you know my game better than anyone."', goto: 'seen' },
      ]},
    ],
    bold: [
      { speaker: 'keeper', text: {
        strigidae: 'Good. Then you know the price of losing: you go back to being potential. And potential, {you}, is what I sell to people who haven\'t earned it yet.',
        otters: 'OHHH, confident! I love it! It is almost a shame I have to ruin your whole evening.',
        shizuka: '"Ready" is a word. The court only speaks in verbs. Show me those.' } },
      { goto: 'end' },
    ],
    why: [
      { speaker: 'keeper', text: {
        strigidae: 'Because the captain asked. And because I wanted to. Second-in-command isn\'t a rank in this club. It\'s a responsibility — and tonight, you\'re it.',
        otters: 'Nathan said somebody has to keep your head the correct size. I volunteered. Violently fast.',
        shizuka: 'Zai asks little of me. She asked this. That should tell you what this chapter is worth.' } },
      { goto: 'end' },
    ],
    seen: [
      { speaker: 'keeper', text: {
        strigidae: 'I do. Every box. Every card you kept and every one you sold. Your habits are a map, {you}. I drew it.',
        otters: 'Yep! Every pack you opened, I watched. Your face when you pulled that rare? Priceless. Your habits? ALSO priceless. For me, anyway.',
        shizuka: 'I watched you choose, every time. Calm hands. Loud hopes. I know which one wins rallies. The question is whether you do.' } },
      { goto: 'end' },
    ],
    end: [
      { speaker: 'captain', text: {
        strigidae: '{keeper} speaks for this club tonight. Beat them, and the club answers to you a little more tomorrow.',
        otters: 'Try not to break my storekeeper. We get asked about the boxes constantly. …Okay, break them a LITTLE.',
        shizuka: 'The Cafe, the court, the Cup — one road. {keeper} is standing on yours. Politely. Move them.' } },
      { bg: 'court', speaker: 'narrator', text: 'The Second Hand is not a chapter about volleyball. It is the club asking one question: did we invest in you — or just in what you pull from boxes?\n\nAnswer on the court.' },
    ],
  },
};
