/** 宝宝期 8 个表情：生图提示词与素材文件名共用这一份顺序。 */
export const EXPRESSIONS = [
 ['hello', 'waving hello'],
 ['cheer', 'cheering with both arms up'],
 ['surprised', 'surprised with a round open mouth'],
 ['thinking', 'thinking with one hand on its chin, looking up'],
 ['giggle', 'giggling with eyes closed'],
 ['sleepy', 'sleepy and yawning'],
 ['proud', 'proud, chest puffed out'],
 ['sad', 'a little sad with one tear'],
];
export const EXPRESSION_KEYS = EXPRESSIONS.map(([key]) => key);
export const EXPRESSION_PROMPTS = EXPRESSIONS.map(([, prompt]) => prompt);
