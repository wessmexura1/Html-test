"use strict";
import data from "./questionData.mjs";
const bank = data.flatMap((t) =>
    ["easy", "medium", "hard"].flatMap((level) =>
        t[level].map((x, i) => ({
            id: `${t.slug}-${level}-${i}`,
            topic: t.name,
            slug: t.slug,
            difficulty: level,
            prompt: x[0],
            options: x[1],
            correct: x[2],
            code: x[3] || "",
        })),
    ),
);
const topics = data.map((t) => [t.name, t.description]);
let state = { questionIndex: 0, queue: [], answers: [], current: null, used: new Set() };
const app = document.querySelector("#app");
const esc = (v) => String(v).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const attributes = [
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
const tags = [
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
function displayText(value) {
    let text = esc(value);
    const protectedTags = [];
    text = text.replace(/&lt;[^&]*?&gt;/g, (token) => `\u0000${protectedTags.push(token) - 1}\u0000`);
    text = text.replace(new RegExp(`\\b(${attributes.join("|")})=([\"'])?([^\\s\"']+)(?:\\2)?`, "g"), "'$1'='$3'");
    text = text.replace(new RegExp(`\\b(${attributes.join("|")})\\b`, "g"), "'$1'");
    text = text.replace(new RegExp(`\\b(${tags.join("|")})\\b`, "g"), "&lt;$1&gt;");
    return text.replace(/\u0000(\d+)\u0000/g, (_, index) => protectedTags[Number(index)]);
}
const pick = (slug, level) => bank.find((q) => q.slug === slug && q.difficulty === level && !state.used.has(q.id));
function prepared(q) {
    const pairs = q.options.map((text, index) => ({ text, index }));
    for (let i = pairs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    return {
        ...q,
        options: pairs.map((x) => x.text),
        correct: q.correct.map((i) => pairs.findIndex((x) => x.index === i)),
    };
}
function layout(c) {
    app.innerHTML = `<div class="shell">${c}</div>`;
}
function home() {
    layout(
        `<div class="hero"><div class="eyebrow">СОУП / HTML</div><h1>Перевір свої знання з <em>HTML.</em></h1><p>Діагностика проходить по 9 темах. Система починає з питань Medium, потім підбирає Easy або Hard за твоєю відповіддю.</p><div class="actions"><button class="btn" data-action="start">Пройти перевірку ↗</button><button class="btn secondary" data-action="later">Почати з нуля</button></div></div><div class="meta-grid"><div class="meta"><strong>135</strong><span>питань у базі</span></div><div class="meta"><strong>09</strong><span>тем HTML</span></div><div class="meta"><strong>3</strong><span>рівні складності</span></div></div>`,
    );
}
function topicsScreen() {
    layout(
        `<div class="eyebrow">Модуль / HTML</div><div class="section-head"><h2>Діагностика HTML</h2><span class="muted">9 тем · адаптивний маршрут</span></div><div class="tech-card" data-action="html"><div><small>FRONTEND / 01</small><h3>HTML</h3><p>Структура документа, семантика, форми, медіа, доступність і SEO.</p></div></div><div class="section-head topic-title"><h2>Теми перевірки</h2></div><div class="topic-grid">${topics.map((t, i) => `<div class="topic"><small>0${i + 1}</small><h3>${t[0]}</h3><p>${t[1]}</p></div>`).join("")}</div>`,
    );
}
function startTest() {
    state = { questionIndex: 0, queue: [], answers: [], current: null, used: new Set() };
    topics.forEach(([name]) => {
        const q = prepared(bank.find((x) => x.topic === name && x.difficulty === "medium"));
        state.queue.push(q);
        state.used.add(q.id);
    });
    renderQuestion();
}
function renderQuestion() {
    const q = state.queue[state.questionIndex];
    state.current = q;
    const n = state.questionIndex + 1,
        total = state.queue.length,
        multiple = q.correct.length > 1,
        saved = state.answers.find((a) => a.id === q.id);
    layout(
        `<div class="test-wrap"><div class="progress-row"><span>${q.topic}</span></div><div class="progress"><span style="width:${Math.min(100, (n / total) * 100)}%"></span></div><div class="question-card"><div class="q-tag"><b>${q.difficulty.toUpperCase()}</b></div><h2>${displayText(q.prompt)}</h2>${q.code ? `<pre class="code"><code>${esc(q.code)}</code></pre>` : ""}<div class="options">${q.options.map((o, i) => `<label class="option"><input type="${multiple ? "checkbox" : "radio"}" name="answer" value="${i}" ${multiple ? 'data-max="2"' : ""} ${saved?.selected?.includes(i) ? "checked" : ""}><span>${displayText(o)}</span></label>`).join("")}</div><div class="test-actions"><button class="btn secondary" data-action="back" ${n === 1 ? "disabled" : ""}>← Назад</button><button class="btn secondary" data-action="skip">Пропустити</button><button class="btn" data-action="answer">Відповісти ↗</button></div></div></div>`,
    );
    const submit = app.querySelector('[data-action="answer"]');
    if (submit) submit.disabled = !saved?.selected?.length;
}
function score(q, s) {
    if (!s.length) return 0;
    if (q.correct.length === 1) return s.length === 1 && s[0] === q.correct[0] ? 1 : 0;
    if (s.some((i) => !q.correct.includes(i))) return 0;
    return s.length === q.correct.length ? 1 : s.length === 1 ? 0.5 : 0;
}
function follow(q, sc, skipped) {
    const history = state.answers.filter((a) => a.topic === q.topic);
    const count = history.length;
    if (count >= 3 && !(count === 3 && q.slug === "basics")) return;
    let level = null;
    if (skipped) level = "medium";
    else if (q.difficulty === "medium") level = sc > 0 ? "hard" : "easy";
    else if (q.difficulty === "easy" && sc === 1) level = "medium";
    else if (q.difficulty === "hard") level = "hard";
    const next = pick(q.slug, level);
    if (next) {
        state.queue.push(prepared(next));
        state.used.add(next.id);
    }
}
function answer(skipped = false) {
    const q = state.current;
    const s = [...document.querySelectorAll("input[name=answer]:checked")].map((x) => +x.value);
    const sc = skipped ? 0 : score(q, s);
    const hadAnswer = state.answers.some((a) => a.id === q.id);
    state.answers = state.answers.filter((a) => a.id !== q.id);
    state.answers.push({
        id: q.id,
        topic: q.topic,
        slug: q.slug,
        difficulty: q.difficulty,
        score: sc,
        skipped,
        selected: skipped ? [] : s,
    });
    if (!hadAnswer) follow(q, sc, skipped);
    if (state.questionIndex < state.queue.length - 1) {
        state.questionIndex++;
        renderQuestion();
    } else result();
}
function back() {
    if (state.questionIndex === 0) return;
    state.questionIndex--;
    renderQuestion();
}
function topicResult(name) {
    const all = state.answers.filter((a) => a.topic === name),
        a = all.filter((x) => !x.skipped);
    const rate = (l) => {
        const x = a.filter((y) => y.difficulty === l);
        return x.length ? (x.reduce((s, y) => s + y.score, 0) / x.length) * 100 : null;
    };
    const easy = rate("easy"),
        medium = rate("medium"),
        hard = rate("hard");
    let score = null,
        route = "потрібна додаткова перевірка";
    const confirmedEasy = easy ?? (medium !== null ? 100 : null);
    if (a.length >= 2 && confirmedEasy !== null && confirmedEasy < 70) score = (confirmedEasy / 70) * 64;
    else if (a.length >= 2 && medium !== null && medium < 70) score = 65 + (medium / 70) * 19;
    else if (a.length >= 2 && hard !== null && hard < 70) score = 65 + (hard / 70) * 19;
    else if (a.length >= 2 && hard !== null) score = 85 + ((hard - 70) / 30) * 15;
    else if (a.length >= 2 && medium !== null) score = 65 + (medium / 100) * 20;
    if (score !== null)
        route =
            score < 65
                ? "теорія + практика + фінальне завдання"
                : score < 85
                  ? "практика + фінальне завдання"
                  : "лише фінальне завдання";
    return { name, easy, medium, hard, score, route, answered: a.length, skipped: all.length - a.length };
}
function result() {
    const rows = topics.map((t) => topicResult(t[0])),
        ok = rows.filter((r) => r.score !== null),
        overall = ok.length ? ok.reduce((s, r) => s + r.score, 0) / ok.length : null;
    layout(
        `<div class="test-wrap"><div class="eyebrow">Результат / СОУП</div><div class="result-card"><div class="result-score">${overall === null ? "—" : Math.round(overall) + "%"}</div><p>${ok.length} із ${rows.length} тем оцінено. Пропущені питання не зменшують відсоток, але знижують достатність даних.</p><div class="result-list">${rows.map((r) => `<div class="result-topic"><div><strong>${r.name}</strong><small>Easy ${r.easy === null ? "—" : Math.round(r.easy) + "%"} · Medium ${r.medium === null ? "—" : Math.round(r.medium) + "%"} · Hard ${r.hard === null ? "—" : Math.round(r.hard) + "%"}</small><small>${r.answered} відповідей · ${r.skipped} пропусків</small></div><div class="result-value">${r.score === null ? "—" : Math.round(r.score) + "%"}<span class="route">${r.route}</span></div></div>`).join("")}</div></div><div class="actions"><button class="btn" data-action="home">На головну</button><button class="btn secondary" data-action="restart">Пройти ще раз</button></div></div>`,
    );
}
document.addEventListener("change", (e) => {
    if (e.target.matches('input[type="checkbox"][data-max]')) {
        const selected = document.querySelectorAll('input[type="checkbox"][data-max]:checked').length;
        if (selected > Number(e.target.dataset.max)) e.target.checked = false;
    }
    if (e.target.matches('input[name="answer"]')) {
        const submit = document.querySelector('[data-action="answer"]');
        if (submit) submit.disabled = document.querySelectorAll('input[name="answer"]:checked').length === 0;
    }
});
document.addEventListener("copy", (e) => {
    if (e.target.closest(".code")) e.preventDefault();
});
document.addEventListener("cut", (e) => {
    if (e.target.closest(".code")) e.preventDefault();
});
document.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".code")) e.preventDefault();
});
document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-action]")?.dataset.action;
    if (!a) return;
    if (a === "start") topicsScreen();
    if (a === "html") startTest();
    if (a === "answer") answer();
    if (a === "skip") answer(true);
    if (a === "back") back();
    if (a === "home") home();
    if (a === "restart") startTest();
    if (a === "later")
        layout(
            `<div class="hero"><div class="eyebrow">Розділ у розробці</div><h1>Навчальний маршрут з'явиться тут.</h1><p>Ти можеш пройти діагностику HTML і отримати персональний маршрут уже зараз.</p><div class="actions"><button class="btn" data-action="home">На головну</button></div></div>`,
        );
});
home();
