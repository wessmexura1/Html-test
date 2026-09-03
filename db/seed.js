import data from "../questionData.mjs";
const sql = (s) => String(s).replaceAll("'", "''");
const json = (v) => `'${JSON.stringify(v).replaceAll("'", "''")}'::jsonb`;
const explanation = (item) => {
    const answers = item[2].map((index) => item[1][index]);
    const details = item[1].map((option, index) => {
        const correct = item[2].includes(index);
        if (correct) return `Варіант «${option}» правильний: він відповідає умові та стандартній поведінці HTML.`;
        return item[3]
            ? `Варіант «${option}» неправильний: такий результат не випливає зі структури й атрибутів наведеного коду.`
            : `Варіант «${option}» неправильний: він приписує елементу або атрибуту інше призначення.`;
    });
    return `Правильн${answers.length === 1 ? "а відповідь" : "і відповіді"}: ${answers.join("; ")}. ${details.join(" ")} Правило: вибір потрібно робити за призначенням HTML-елементів і атрибутів або за точним результатом наведеного коду.`;
};
console.log("BEGIN;");
for (const [i, t] of data.entries())
    console.log(
        `INSERT INTO topics(technology_id,slug,name,description) SELECT id,'${t.slug}','${sql(t.name)}','${sql(t.description)}' FROM technologies WHERE slug='html' ON CONFLICT (slug) DO NOTHING;`,
    );
for (const t of data)
    for (const level of ["easy", "medium", "hard"])
        for (const [i, item] of t[level].entries())
            console.log(
                `INSERT INTO questions(topic_id,difficulty,prompt,code,options,correct_options,explanation) SELECT id,'${level}','${sql(item[0])}',${item[3] ? `'${sql(item[3])}'` : "NULL"},${json(item[1])},${json(item[2])},'${sql(explanation(item))}' FROM topics WHERE slug='${t.slug}';`,
            );
console.log("COMMIT;");
