import htmlData from "../questionData.mjs";
import cssData from "../cssQuestionData.mjs";
import gitData from "../gitQuestionData.mjs";
import { makeBank } from "../questionBank.mjs";

const technologies = [
    { name: "HTML", data: htmlData, expectedTopics: 9, expectedQuestions: 135 },
    { name: "CSS", data: cssData, expectedTopics: 14, expectedQuestions: 210 },
    { name: "Git", data: gitData, expectedTopics: 9, expectedQuestions: 135 },
];

const issues = [];
const normalizedPrompts = new Map();
const theoreticalHardTopics = {
    HTML: new Set(["basics", "text"]),
    CSS: new Set(["css-basics"]),
    Git: new Set(["git-basics", "github-workflow", "gitignore"]),
};

const fail = (row, message) =>
    issues.push(`${row.technology}/${row.topic}/${row.difficulty}/${row.index}: ${message}`);

for (const technology of technologies) {
    const rows = technology.data.flatMap((topic) =>
        ["easy", "medium", "hard"].flatMap((difficulty) =>
            topic[difficulty].map((question, index) => ({
                technology: technology.name,
                topic: topic.slug,
                difficulty,
                index: index + 1,
                question,
            })),
        ),
    );

    if (technology.data.length !== technology.expectedTopics) {
        issues.push(
            `${technology.name}: очікується ${technology.expectedTopics} тем, отримано ${technology.data.length}`,
        );
    }
    if (rows.length !== technology.expectedQuestions) {
        issues.push(
            `${technology.name}: очікується ${technology.expectedQuestions} питань, отримано ${rows.length}`,
        );
    }

    for (const topic of technology.data) {
        for (const difficulty of ["easy", "medium", "hard"]) {
            if (topic[difficulty].length !== 5) {
                issues.push(`${technology.name}/${topic.slug}/${difficulty}: очікується 5 питань`);
            }
        }
    }

    for (const row of rows) {
        const [prompt, options, correct, code = ""] = row.question;
        const expected =
            row.difficulty === "easy"
                ? [4, 1]
                : row.difficulty === "medium"
                  ? [5, 2]
                  : code
                    ? [4, 1]
                    : [6, 2];

        if (typeof prompt !== "string" || !prompt.endsWith("?")) {
            fail(row, "питання має завершуватися знаком питання");
        }
        if (!Array.isArray(options) || options.length !== expected[0]) {
            fail(row, `очікується ${expected[0]} варіанти, отримано ${options?.length ?? 0}`);
        }
        if (!Array.isArray(correct) || correct.length !== expected[1]) {
            fail(row, `очікується ${expected[1]} правильні відповіді, отримано ${correct?.length ?? 0}`);
        }
        if (new Set(correct).size !== correct.length) {
            fail(row, "індекси правильних відповідей дублюються");
        }
        if (correct.some((index) => index < 0 || index >= options.length)) {
            fail(row, "індекс правильної відповіді виходить за межі варіантів");
        }
        if (new Set(options.map((option) => option.trim())).size !== options.length) {
            fail(row, "варіанти містять точний дублікат");
        }
        if (options.some((option) => /(завжди|ніколи|автоматично)/iu.test(option))) {
            fail(row, "варіант містить абсолютне слово-підказку");
        }
        if (options.some((option) => !String(option).trim())) {
            fail(row, "варіант відповіді порожній");
        }
        if (code && !code.includes("\n")) {
            fail(row, "Hard-код потрібно форматувати у кілька рядків");
        }
        if (row.difficulty !== "hard" && code) {
            fail(row, `${row.difficulty} не повинен містити Hard-сценарій коду`);
        }
        if (row.difficulty === "medium" && !/(два|дві|обидва|обидві)/iu.test(prompt)) {
            fail(row, "Medium має однозначно вимагати вибір двох відповідей у самому питанні");
        }
        if (row.difficulty === "hard") {
            const shouldBeTheoretical = theoreticalHardTopics[row.technology].has(row.topic);
            if (shouldBeTheoretical && code) {
                fail(row, "Hard для цієї базової теми має бути теоретичним");
            }
            if (!shouldBeTheoretical && !code) {
                fail(row, "Hard для цієї теми має містити необхідний для відповіді код або сценарій");
            }
            if (shouldBeTheoretical && !/(два|дві|обидва|обидві)/iu.test(prompt)) {
                fail(row, "Теоретичний Hard має однозначно вимагати вибір двох відповідей");
            }
        }

        if (row.technology === "CSS" || row.technology === "Git") {
            const promptKey = `${row.technology}:${prompt.trim().toLowerCase()}:${code.trim()}`;
            if (normalizedPrompts.has(promptKey)) {
                fail(row, `питання дублює ${normalizedPrompts.get(promptKey)}`);
            } else {
                normalizedPrompts.set(promptKey, `${row.topic}/${row.difficulty}/${row.index}`);
            }
        }
    }

    const bank = makeBank({ key: technology.name.toLowerCase(), data: technology.data });
    for (const topic of technology.data) {
        for (const difficulty of ["medium", "hard"]) {
            const questions = bank.filter((question) => question.slug === topic.slug && question.difficulty === difficulty);
            if (new Set(questions.map((question) => question.microSkill)).size !== questions.length) {
                issues.push(`${technology.name}/${topic.slug}/${difficulty}: MicroSkill мають бути незалежними`);
            }
        }
    }
}

const consistencyGroups = new Map();
for (const technology of technologies) {
    const key = technology.name.toLowerCase();
    for (const question of makeBank({ key, data: technology.data }).filter((item) => item.consistencyGroupId)) {
        const groupKey = `${key}/${question.slug}/${question.consistencyGroupId}`;
        consistencyGroups.set(groupKey, (consistencyGroups.get(groupKey) || 0) + 1);
    }
}
for (const [group, count] of consistencyGroups) {
    if (count < 3) issues.push(`${group}: для розв’язання суперечності потрібно щонайменше 3 питання в одній темі`);
}

if (issues.length) {
    console.error(issues.join("\n"));
    process.exitCode = 1;
} else {
    console.log("Перевірено 480 питань: 135 HTML, 210 CSS і 135 Git. Структурних порушень не знайдено.");
}
