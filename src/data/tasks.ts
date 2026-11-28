// The daily board keeps its stored order. The practice menu pairs listening and speaking first.
export const TASK_KINDS = ['listen', 'wordpic', 'repeat', 'trace'] as const;
export type TaskKind = typeof TASK_KINDS[number];

export const TASK_INFO = {
  listen: { zh: '听一听', icon: 'ear', en: 'Listen & find', detail: '颜色、名字、数量和大小', scene: 'meadow', instruction: '听伙伴说，点出对的那个' },
  repeat: { zh: '说一说', icon: 'speak', en: 'Say it with me', detail: '问候、表达需要、日常短句', scene: 'playground', instruction: '听一句，跟着伙伴说一说' },
  wordpic: { zh: '认一认', icon: 'picture', en: 'Look & choose', detail: '再遇见今天的词和熟悉的词', scene: 'orchard', instruction: '看看图，找出伙伴说的那个' },
  trace: { zh: '写一写', icon: 'pencil', en: 'Trace & learn', detail: '跟着笔顺，描写三个不同的字母', scene: 'garden-path', instruction: '从小圆点出发，跟着写一写' },
} satisfies Record<TaskKind, { zh: string; icon: string; en: string; detail: string; scene: string; instruction: string }>;
