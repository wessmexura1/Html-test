import htmlData from "../questionData.mjs";
import cssData from "../cssQuestionData.mjs";
import gitData from "../gitQuestionData.mjs";
import { makeBank } from "../questionBank.mjs";

const technologies = [
    { slug: "html", name: "HTML", data: htmlData },
    { slug: "css", name: "CSS", data: cssData },
    { slug: "git", name: "Git", data: gitData },
];

const sql = (value) => String(value).replaceAll("'", "''");
const json = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;

function explanation(item, technologyName) {
    const [prompt, options, correct, code = ""] = item;
    const correctAnswers = correct.map((index) => options[index]);
    const rule = correctAnswers.join("; ");
    const details = options.map((option, index) => {
        if (correct.includes(index)) {
            return `Варіант «${option}» правильний: це один із результатів або правил, які безпосередньо виконує умову питання.`;
        }
        return code
            ? `Варіант «${option}» неправильний: він не відповідає фактичному результату наведеного коду. Правильний результат: «${rule}».`
            : `Варіант «${option}» неправильний: він суперечить перевірюваному правилу ${technologyName}. Для цієї умови правильні положення: «${rule}».`;
    });

    return `Питання перевіряє: ${prompt} Правило, яке потрібно запам’ятати: ${rule} ${details.join(" ")}`;
}

console.log("BEGIN;");

for (const technology of technologies) {
    console.log(
        `INSERT INTO technologies(slug,name) VALUES ('${technology.slug}','${technology.name}') ON CONFLICT (slug) DO NOTHING;`,
    );

    for (const topic of technology.data) {
        console.log(
            `INSERT INTO topics(technology_id,slug,name,description) SELECT id,'${topic.slug}','${sql(topic.name)}','${sql(topic.description)}' FROM technologies WHERE slug='${technology.slug}' ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description;`,
        );
    }

    console.log(
        `UPDATE questions SET is_active=FALSE WHERE topic_id IN (SELECT topics.id FROM topics JOIN technologies ON technologies.id=topics.technology_id WHERE technologies.slug='${technology.slug}');`,
    );

    for (const topic of technology.data) {
        for (const difficulty of ["easy", "medium", "hard"]) {
            for (const item of topic[difficulty]) {
                console.log(
                    `INSERT INTO questions(topic_id,difficulty,prompt,code,options,correct_options,explanation) SELECT id,'${difficulty}','${sql(item[0])}',${item[3] ? `'${sql(item[3])}'` : "NULL"},${json(item[1])},${json(item[2])},'${sql(explanation(item, technology.name))}' FROM topics WHERE slug='${topic.slug}' ON CONFLICT (topic_id,difficulty,prompt) DO UPDATE SET code=EXCLUDED.code, options=EXCLUDED.options, correct_options=EXCLUDED.correct_options, explanation=EXCLUDED.explanation, is_active=TRUE;`,
                );
            }
        }
    }
    for (const question of makeBank({ key: technology.slug, data: technology.data })) {
        console.log(
            `UPDATE questions SET template_id='${sql(question.templateId)}', micro_skill='${sql(question.microSkill)}', context_key='${sql(question.context)}', is_transfer=${question.transfer ? 'TRUE' : 'FALSE'}, consistency_group_id=${question.consistencyGroupId ? `'${sql(question.consistencyGroupId)}'` : 'NULL'}, consistency_claims=${json(question.consistencyClaims)}, options=${json(question.options.map((o) => o.text))}, correct_options=${json(question.correctIds.map((id) => question.options.findIndex((o) => o.id === id)))}, option_ids=${json(question.options.map((o) => o.id))}, correct_option_ids=${json(question.correctIds)} WHERE topic_id=(SELECT id FROM topics WHERE slug='${sql(question.slug)}') AND difficulty='${question.difficulty}' AND prompt='${sql(question.prompt)}';`,
        );
    }
}

console.log("COMMIT;");
