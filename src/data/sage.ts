// M10 SAGE: scripted turns (TRD §4, SAMPLE_DATA §10). No AI, no network. Free text matches keywords.
export interface SageTurn { id: string; chip: string; keywords: string[]; reply: string; citation?: string; flag?: 'urgent' | 'review' }

export const SAGE_SCRIPT: SageTurn[] = [
  {
    id: 'vmri', chip: 'What is my VMRI?', keywords: ['vmri', 'score'],
    reply: 'Your VMRI is 54 out of 100, in the Moderate burden band. It sums up how menopause is affecting your resilience across sleep, mood, energy and body. Higher is better.',
    citation: 'From your report › Your VMRI',
  },
  {
    id: 'ferritin', chip: 'Why is my ferritin low?', keywords: ['ferritin', 'iron stores', 'low iron'],
    reply: 'Ferritin shows your iron stores. Yours is 8, below the 12–150 range, which can go with low energy. Your NP added iron to your plan; ask her about anything that changes how you take it.',
    citation: 'From your report › Bloodwork › Nutrients',
  },
  {
    id: 'coffee', chip: 'Can I take my iron with coffee?', keywords: ['coffee', 'with food', 'take my iron'],
    reply: "That's a question for your care team, since it's about how to take your medication. I've passed it to Maya, your Guide. You'll hear back by 2:00 pm today.",
    flag: 'review',
  },
  {
    id: 'chest', chip: "I've had chest tightness since I started the new dose. Should I stop it?", keywords: ['chest', 'tightness', 'breath', 'faint', 'heart racing'],
    reply: "I'm an AI and can't advise on this. If you have chest pain or trouble breathing now, call 911. I've alerted your care team and they'll contact you shortly.",
    flag: 'urgent',
  },
];

const FALLBACK: SageTurn = { id: 'fallback', chip: '', keywords: [], reply: "I can explain your report. For anything else, I'll pass it to your care team." };

export function matchSage(text: string): SageTurn {
  const t = text.toLowerCase();
  const exact = SAGE_SCRIPT.find((x) => x.chip.toLowerCase() === t);
  return exact ?? SAGE_SCRIPT.slice().reverse().find((x) => x.keywords.some((k) => t.includes(k))) ?? FALLBACK;
}
