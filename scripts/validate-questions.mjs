import data from "../questionData.mjs";

const issues = [];
const rows = data.flatMap((topic) =>
    ["easy", "medium", "hard"].flatMap((difficulty) =>
        topic[difficulty].map((question, index) => ({ topic: topic.slug, difficulty, index: index + 1, question })),
    ),
);

const fail = (row, message) => issues.push(`${row.topic}/${row.difficulty}/${row.index}: ${message}`);

for (const row of rows) {
    const [prompt, options, correct, code = ""] = row.question;
    const expected = row.difficulty === "easy" ? [4, 1] : row.difficulty === "medium" ? [5, 2] : code ? [4, 1] : [6, 2];

    if (!prompt.endsWith("?")) fail(row, "питання має завершуватися знаком питання");
    if (options.length !== expected[0]) fail(row, `очікується ${expected[0]} варіанти, отримано ${options.length}`);
    if (correct.length !== expected[1])
        fail(row, `очікується ${expected[1]} правильні відповіді, отримано ${correct.length}`);
    if (correct.some((index) => index < 0 || index >= options.length))
        fail(row, "індекс правильної відповіді виходить за межі варіантів");
    if (new Set(options.map((option) => option.trim().toLowerCase())).size !== options.length)
        fail(row, "варіанти містять точний дублікат");
    if (options.some((option) => /(завжди|ніколи|автоматично)/iu.test(option)))
        fail(row, "варіант містить абсолютне слово-підказку");
    if (code && !code.includes("\n")) fail(row, "Hard-код потрібно форматувати у кілька рядків");
    if (code && /<form[\s>]/i.test(code) && options.some((option) => /таблиц|список|заголовок сторінки/iu.test(option)))
        fail(row, "у питанні про форму є варіант з іншої смислової області");
}

for (const topic of data) {
    for (const difficulty of ["easy", "medium", "hard"]) {
        if (topic[difficulty].length !== 5) issues.push(`${topic.slug}/${difficulty}: очікується 5 питань`);
    }
}

if (rows.length !== 135) issues.push(`очікується 135 питань, отримано ${rows.length}`);

if (issues.length) {
    console.error(issues.join("\n"));
    process.exitCode = 1;
} else {
    console.log("Перевірено 135 питань: структурних порушень не знайдено.");
}
