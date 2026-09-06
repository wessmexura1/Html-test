import htmlData from "./questionData.mjs";
import cssData from "./cssQuestionData.mjs";
import gitData from "./gitQuestionData.mjs";
import { DiagnosticSession } from "./diagnosticSession.mjs";
import { ALGORITHM_VERSION, TEST_TIMES, formatScore } from "./soupEngine.mjs";

const technologies = {
    html: {
        key: "html",
        name: "HTML",
        description: "Структура документа, семантика, форми, медіа, доступність і SEO.",
        data: htmlData,
    },
    css: {
        key: "css",
        name: "CSS",
        description: "Селектори, каскад, моделі розкладки, адаптивність та анімації.",
        data: cssData,
    },
    javascript: { key: "javascript", name: "JavaScript", description: "Модуль діагностики готується.", data: null },
    react: { key: "react", name: "React", description: "Модуль діагностики готується.", data: null },
    git: {
        key: "git",
        name: "Git",
        description: "Коміти, гілки, віддалені репозиторії, GitHub workflow та зміна історії.",
        data: gitData,
    },
};
const cssTopicPhotos = [

    "/assets/css-topic-01.webp",
    "/assets/css-selectors.webp",
    "/assets/css-topic-03.webp",
    "/assets/css-topic-04.webp",
    "/assets/css-topic-05.webp",
    "/assets/css-topic-06.webp",
];
let selectedTechnology = null;
let session = null;
let notice = "";
let storageWarning = "";
const app = document.querySelector("#app");
const storageKey = (kind, tech) => `soup-v${ALGORITHM_VERSION}-${kind}-${tech}`;
function readSaved(kind, tech, fallback) {
    try {
        return JSON.parse(localStorage.getItem(storageKey(kind, tech))) ?? fallback;
    } catch {
        storageWarning = "Не вдалося прочитати збереження. Поточну діагностику можна пройти в цій вкладці.";
        return fallback;
    }
}
function writeSaved(kind, tech, value) {
    try {
        localStorage.setItem(storageKey(kind, tech), JSON.stringify(value));
    } catch {
        storageWarning = "Не вдалося зберегти прогрес на пристрої. Не закривай вкладку до завершення.";
    }
}
function persist() {
    if (session) writeSaved("session", session.technology.key, session.state);
}
const esc = (value) =>
    String(value).replace(/[&<>]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[character]);

const htmlAttributes = [
    "aria-labelledby",
    "aria-label",
    "autocomplete",
    "cellpadding",
    "charset",
    "colspan",
    "controls",
    "loading",
    "maxlength",
    "required",
    "rowspan",
    "srclang",
    "tabindex",
    "target",
    "action",
    "class",
    "content",
    "for",
    "href",
    "id",
    "lang",
    "media",
    "method",
    "name",
    "pattern",
    "property",
    "rel",
    "scope",
    "src",
    "type",
    "value",
    "width",
    "alt",
];

const htmlTags = [
    "blockquote",
    "textarea",
    "section",
    "article",
    "header",
    "footer",
    "source",
    "strong",
    "video",
    "audio",
    "aside",
    "button",
    "caption",
    "iframe",
    "label",
    "main",
    "meta",
    "nav",
    "style",
    "title",
    "track",
    "body",
    "code",
    "form",
    "head",
    "html",
    "link",
    "table",
    "tbody",
    "thead",
    "tfoot",
    "script",
    "input",
    "select",
    "option",
    "span",
    "div",
    "img",
    "ol",
    "ul",
    "li",
    "th",
    "td",
    "tr",
    "pre",
    "em",
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
];

function displayHtmlText(value) {
    let text = esc(value);
    const protectedFragments = [];
    const protect = (token) => `\u0000${protectedFragments.push(token) - 1}\u0000`;
    text = text.replace(/&lt;[^&]*?&gt;/g, protect);
    text = text.replace(
        new RegExp(`\\b(${htmlAttributes.join("|")})=([\"'])?([^\\s\"']+)(?:\\2)?`, "g"),
        (_, attribute, __, attributeValue) => protect(`'${attribute}'='${attributeValue}'`),
    );
    text = text.replace(new RegExp(`(?<!['\\w-])(${htmlAttributes.join("|")})(?!['\\w-])`, "g"), "'$1'");
    text = text.replace(new RegExp(`\\b(${htmlTags.join("|")})\\b`, "g"), "&lt;$1&gt;");
    return text.replace(/\u0000(\d+)\u0000/g, (_, index) => protectedFragments[Number(index)]);
}

function displayText(value) {
    return selectedTechnology?.key === "html" ? displayHtmlText(value) : esc(value);
}

function layout(content) {
    app.innerHTML = `<div class="shell">${storageWarning ? `<p class="session-notice" role="status">${esc(storageWarning)}</p>` : ""}${content}</div>`;
}
function home() {
    selectedTechnology = null;
    const available = Object.values(technologies).filter((t) => t.data);
    const topicCount = available.reduce((n, t) => n + t.data.length, 0);
    const count = available.reduce(
        (n, t) =>
            n + t.data.reduce((s, topic) => s + ["easy", "medium", "hard"].reduce((v, d) => v + topic[d].length, 0), 0),
        0,
    );
    layout(`<div class="hero">
        <div class="eyebrow">Тестік по алгоритму соуп</div>
        <h1>Тестік</em></h1>
        <p>Тестік тестік тестік тестік))))</p>
        <div class="actions"><button class="btn" data-action="technologies">Пройти перевірку ↗</button><button class="btn secondary" data-action="later">Почати з нуля</button></div>
    </div><div class="meta-grid">
        <div class="meta"><strong>${count}</strong><span>питань у базі</span></div>
        <div class="meta"><strong>${topicCount}</strong><span>теми доступних технологій</span></div>
        <div class="meta"><strong>3</strong><span>рівні складності</span></div>
    </div>`);
}
function technologiesScreen() {
    selectedTechnology = null;
    layout(`<div class="eyebrow">Діагностичні модулі</div>
        <div class="section-head"><h2>Обери технологію</h2></div>
        <div class="tech-grid">${Object.values(technologies)
            .map(
                (t) => `
            <button class="tech-card" data-action="select-technology" data-tech="${t.key}" ${t.data ? "" : "disabled"}>
                <h3>${t.name}</h3><p>${t.description}</p>
                <span class="test-duration">Орієнтовно ${TEST_TIMES[t.key]} хвилин</span>
            </button>`,
            )
            .join("")}</div>`);
}
function topicScreen(key) {
    const t = technologies[key];
    if (!t?.data) return;
    selectedTechnology = t;
    const saved = readSaved("session", key, null);
    const resumable = saved?.version === ALGORITHM_VERSION && !saved.completedAt && saved.queue?.length;
    const last = readSaved("result", key, null);
    layout(`<div class="eyebrow">Модуль / ${t.name}</div>
        <div class="section-head"><h2>Тестык ${t.name}</h2><span class="muted"></span></div>
        <p class="test-duration">Орієнтовний час проходження: ${TEST_TIMES[key]} хвилин.</p>
        <div class="module-summary"><div><strong>${t.data.length * 15}</strong><span>питань трьох рівнів у базі</span></div>
        <div class="actions"><button class="btn" data-action="${resumable ? "resume" : "begin-test"}">${resumable ? "Продовжити діагностику" : "Почати діагностику ↗"}</button>
        ${resumable ? '<button class="btn secondary" data-action="begin-test">Нова спроба</button>' : ""}
        ${last ? '<button class="btn secondary" data-action="last-result">Останній результат</button>' : ""}</div></div>
        <div class="section-head topic-title"><h2>Теми перевірки</h2></div>
        <div class="topic-grid">${t.data.map((topic, i) => t.key === "css" && cssTopicPhotos[i]
            ? `<div class="topic topic-image" style="--topic-photo: url('${cssTopicPhotos[i]}')"><img src="${cssTopicPhotos[i]}" alt="${topic.name}"></div>`
            : `<div class="topic"><small>${String(i + 1).padStart(2, "0")}</small><h3>${topic.name}</h3><p>${topic.description}</p></div>`).join("")}</div>`);
}
function archiveAttempt(state, key, result = null) {
    const history = readSaved("history", key, []);
    const entry = { ...state, result };
    const index = history.findIndex((a) => a.attemptId === state.attemptId);
    if (index < 0) history.push(entry);
    else history[index] = entry;
    writeSaved("history", key, history);
}
function startTest(resume = false) {
    if (!selectedTechnology?.data) return;
    const key = selectedTechnology.key;
    const saved = readSaved("session", key, null);
    if (!resume && saved?.version === ALGORITHM_VERSION && saved.queue?.length) archiveAttempt(saved, key);
    const history = readSaved("history", key, []);
    const validSaved = resume && saved?.version === ALGORITHM_VERSION && !saved.completedAt ? saved : null;
    session = new DiagnosticSession(selectedTechnology, { history, saved: validSaved });
    notice = "";
    persist();
    renderQuestion();
}
function renderQuestion() {
    const question = session?.current;
    if (!question) return result();
    const state = session.state;
    const saved = state.answers.find((a) => a.id === question.id);
    const selected = state.drafts[question.id] ?? saved?.selected ?? [];
    const completedTopics = selectedTechnology.data.filter(
        (t) =>
            state.answers.some((a) => a.slug === t.slug) &&
            !state.queue.some((q) => q.slug === t.slug && !state.answers.some((a) => a.id === q.id)),
    ).length;
    layout(`<div class="test-wrap">
        <div class="progress-row"><span>${question.topic}</span><span>Завершено тем: ${completedTopics} / ${selectedTechnology.data.length}</span></div>
        <div class="progress" role="progressbar" aria-label="Завершені теми" aria-valuemin="0" aria-valuemax="${selectedTechnology.data.length}" aria-valuenow="${completedTopics}"><span style="width:${(completedTopics / selectedTechnology.data.length) * 100}%"></span></div>
        ${notice ? `<p class="session-notice" role="status">${notice}</p>` : ""}
        <div class="question-card"><div class="q-tag"><b>${question.difficulty.toUpperCase()}</b></div>
            <h2>${displayText(question.prompt)}</h2>
            ${question.code ? `<pre class="code"><code>${esc(question.code)}</code></pre>` : ""}
            <div class="options">${question.options
                .map(
                    (o) => `<label class="option">
                <input type="${question.correctIds.length > 1 ? "checkbox" : "radio"}" name="answer" value="${o.id}" ${question.correctIds.length > 1 ? `data-max="${question.correctIds.length}"` : ""} ${selected.includes(o.id) ? "checked" : ""}>
                <span>${displayText(o.text)}</span></label>`,
                )
                .join("")}</div>
            <div class="test-actions"><button class="btn secondary" data-action="back" ${state.questionIndex === 0 ? "disabled" : ""}>← Назад</button>
                <button class="btn secondary" data-action="skip">Пропустити</button>
                <button class="btn" data-action="answer" ${selected.length ? "" : "disabled"}>Відповісти ↗</button></div>
        </div></div>`);
}
function answer(skipped = false) {
    if (!session?.current) return;
    const selected = [...app.querySelectorAll('input[name="answer"]:checked')].map((i) => i.value);
    const update = session.submit(selected, skipped);
    if (!update) return;
    notice = update.invalidated ? "Відповідь змінено. Подальші запитання цієї теми буде підібрано заново." : "";
    persist();
    renderQuestion();
}
function back() {
    if (!session || session.state.questionIndex === 0) return;
    session.state.questionIndex--;
    notice = "";
    persist();
    renderQuestion();
}
function result() {
    if (!session) return home();
    const report = session.result();
    writeSaved("result", selectedTechnology.key, report);
    archiveAttempt(session.state, selectedTechnology.key, report);
    showResult(report);
}
function showResult(report) {
    const complete = report.status === "Complete";
    layout(`<div class="test-wrap"><div class="eyebrow">Результат / ${technologies[report.technology].name}</div>
        <div class="result-card">
            <p class="result-status">${complete ? "Діагностику завершено" : "Неповна діагностика"}</p>
            <div class="result-score">${formatScore(report.technologyScore)}</div>
            <p>${complete ? "Загальний результат технології." : "Середній результат лише оцінених тем. Це не оцінка всієї технології."}</p>
            <p class="coverage">Повнота діагностики: ${formatScore(report.technologyCoverage)} · ${report.evaluatedTopics} із ${report.totalTopics} тем оцінено.</p>
            <p>Пропуски не знижують відсоток правильності, але не підтверджують знання.</p>
            <div class="result-list">${report.topics
                .map(
                    (row) => `<div class="result-topic"><div>
                <strong>${row.name}</strong>
                <small>Easy ${formatScore(row.easyRate)} · Medium ${formatScore(row.mediumRate)} · Hard ${formatScore(row.hardRate)}</small>
                <small>Повні підтвердження: Medium ${row.mediumConfirmed} · Hard ${row.hardConfirmed}</small>
                <small>${row.answeredCount} відповідей · ${row.skippedCount} пропусків</small>
                <small>${row.dataStatus === "Evaluated" ? "Оцінено" : row.dataStatus === "NotEvaluated" ? "Тема не оцінена" : "Недостатньо даних"}</small>
            </div><div class="result-value">${formatScore(row.topicScore)}<span class="route">${row.levelLabel}</span><span class="route">${row.learningRoute}</span></div></div>`,
                )
                .join("")}</div>
        </div><div class="actions"><button class="btn" data-action="technologies">Інша технологія</button><button class="btn secondary" data-action="restart">Пройти ще раз</button></div></div>`);
}
document.addEventListener("change", (event) => {
    if (!event.target.matches('input[name="answer"]') || !session?.current) return;
    const max = session.current.correctIds.length;
    let checked = [...app.querySelectorAll('input[name="answer"]:checked')];
    if (checked.length > max) event.target.checked = false;
    checked = [...app.querySelectorAll('input[name="answer"]:checked')];
    session.state.drafts[session.current.id] = checked.map((i) => i.value);
    const submit = app.querySelector('[data-action="answer"]');
    if (submit) submit.disabled = !checked.length;
    persist();
});
for (const eventName of ["copy", "cut", "contextmenu"]) {
    document.addEventListener(eventName, (event) => {
        if (event.target.closest?.(".code")) event.preventDefault();
    });
}
document.addEventListener("click", (event) => {
    const element = event.target.closest("[data-action]");
    if (!element || element.disabled) return;
    const action = element.dataset.action;
    if (action === "home") home();
    if (action === "technologies") technologiesScreen();
    if (action === "select-technology") topicScreen(element.dataset.tech);
    if (action === "begin-test" || action === "restart") startTest();
    if (action === "resume") startTest(true);
    if (action === "last-result") {
        const report = readSaved("result", selectedTechnology.key, null);
        if (report) showResult(report);
    }
    if (action === "answer") answer();
    if (action === "skip") answer(true);
    if (action === "back") back();
    if (action === "later")
        layout(
            `<div class="hero"><div class="eyebrow">Розділ у розробці</div><h1>Навчальний маршрут з'явиться тут.</h1><p>Діагностика вже доступна для HTML, CSS та Git.</p><button class="btn" data-action="home">На головну</button></div>`,
        );
});
document.querySelector(".brand")?.setAttribute("data-action", "home");
home();
