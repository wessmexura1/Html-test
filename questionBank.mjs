import { metadataFor } from './questionMetadata.mjs';

export function makeBank(technology) {
    const bank = technology.data.flatMap((topic) => ['easy', 'medium', 'hard'].flatMap((difficulty) =>
        topic[difficulty].map((question, index) => {
            const templateId = `${technology.key}-${topic.slug}-${difficulty}-${index}`;
            const meta = metadataFor(technology.key, topic.slug, difficulty, index);
            return {
                id: templateId, templateId, slug: topic.slug, topic: topic.name, difficulty,
                prompt: question[0], code: question[3] || '', ...meta,
                options: question[1].map((text, i) => ({ id: `${templateId}:option:${i}`, text })),
                correctIds: question[2].map((i) => `${templateId}:option:${i}`),
                consistencyClaims: Object.fromEntries(Object.entries(meta.consistencyClaims).map(([i, value]) => [`${templateId}:option:${i}`, value])),
                parameters: {},
            };
        }),
    ));
    const counters = new Map();
    for (const question of bank) {
        const size = question.options.length;
        const pairs = question.correctIds.length === 1 ? Array.from({ length: size }, (_, i) => [i]) :
            Array.from({ length: size }, (_, i) => Array.from({ length: size - i - 1 }, (_, j) => [i, i + j + 1])).flat();
        const key = `${question.difficulty}/${size}`;
        const counter = counters.get(key) || 0;
        counters.set(key, counter + 1);
        const positions = pairs[counter % pairs.length];
        const correct = question.options.filter((o) => question.correctIds.includes(o.id));
        const other = question.options.filter((o) => !question.correctIds.includes(o.id));
        question.options = Array.from({ length: size }, (_, i) => positions.includes(i) ? correct.shift() : other.shift());
    }
    return bank;
}

export function instantiate(question, random = Math.random, previous = []) {
    const instance = structuredClone(question);
    if (question.templateId === 'css-units-hard-0') {
        const variants = [18, 20, 22, 24].flatMap((font) => [2, 3].map((factor) => ({ font, factor, root: 16 })));
        const unused = variants.filter((params) => !previous.some((a) => a.templateId === question.templateId && JSON.stringify(a.parameters) === JSON.stringify(params)));
        const choices = unused.length ? unused : variants;
        const params = choices[Math.floor(random() * choices.length)];
        instance.parameters = params;
        instance.code = `html { font-size: ${params.root}px; }\n.card {\n  font-size: ${params.font}px;\n  padding: ${params.factor}em;\n}`;
        const values = [params.font * params.factor, params.root * params.factor, params.font, params.factor];
        instance.options.forEach((option) => { option.text = `${values[Number(option.id.split(':').at(-1))]}px`; });
    }
    for (let i = instance.options.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [instance.options[i], instance.options[j]] = [instance.options[j], instance.options[i]];
    }
    return instance;
}
