export const ALGORITHM_VERSION = 2;
export const TEST_TIMES = { html: '20–30', css: '30–45', javascript: '45–60', react: '45–60', git: '20–30' };
export const limitsFor = (topicCount) => ({ perTopic: 5, extraTopics: Math.ceil(topicCount * 0.2), total: topicCount * 5 + Math.ceil(topicCount * 0.2) });
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const unique = (items) => [...new Set(items.filter(Boolean))];

export function scoreAnswer(question, selected) {
    if (!Array.isArray(selected) || !selected.length || new Set(selected).size !== selected.length) return 0;
    if (selected.length > question.correctIds.length || selected.some((id) => !question.correctIds.includes(id))) return 0;
    return selected.length === question.correctIds.length ? 1 : 0.5;
}

export function consistencyOf(answers) {
    const groups = new Map();
    for (const answer of answers.filter((a) => !a.skipped && a.consistencyGroupId)) {
        const values = unique(answer.selected.map((id) => {
            const value = answer.consistencyClaims?.[id];
            return value === undefined ? null : String(value);
        }));
        if (!values.length) continue;
        const group = groups.get(answer.consistencyGroupId) || [];
        group.push({ id: answer.templateId, values, score: answer.score });
        groups.set(answer.consistencyGroupId, group);
    }
    const unresolved = [];
    let hadConflict = false;
    for (const [id, records] of groups) {
        let conflictAt = -1;
        const seen = new Set();
        records.forEach((r, index) => {
            r.values.forEach((v) => seen.add(v));
            if (seen.size > 1 && conflictAt < 0) conflictAt = index;
        });
        if (conflictAt < 0) continue;
        hadConflict = true;
        const last = records.at(-1);
        const verified = new Set(records.filter((r) => r.score === 1 && r.values.length === 1 && r.values[0] === 'true').map((r) => r.id));
        if (!(records.length - 1 > conflictAt && last.score === 1 && last.values.length === 1 && last.values[0] === 'true' && verified.size >= 2)) unresolved.push(id);
    }
    return { consistency: !hadConflict, consistencyResolved: unresolved.length === 0, unresolvedGroups: unresolved };
}

export function evaluateTopic(topic, history, { pending = false, blockedBySkip = false } = {}) {
    const all = history.filter((a) => a.slug === topic.slug);
    const answered = all.filter((a) => !a.skipped);
    const level = (difficulty) => answered.filter((a) => a.difficulty === difficulty);
    const rate = (items) => items.length ? items.reduce((sum, a) => sum + a.score, 0) / items.length * 100 : null;
    const easy = level('easy'), medium = level('medium'), hard = level('hard');
    const mediumFull = medium.filter((a) => a.score === 1), hardFull = hard.filter((a) => a.score === 1);
    const mediumSkills = unique(mediumFull.map((a) => a.microSkill));
    const hardSkills = unique(hardFull.map((a) => a.microSkill));
    const hardContexts = unique(hardFull.map((a) => a.context));
    const easyRate = rate(easy), mediumRate = rate(medium), hardRate = rate(hard);
    const highEvidenceRate = rate([...medium, ...hard]);
    const baseKnowledgeConfirmed = (easyRate !== null && easyRate >= 70) || (mediumFull.length >= 2 && mediumSkills.length >= 2);
    const consistency = consistencyOf(answered);
    const firstHardErrors = hard.slice(0, 2).filter((a) => a.score === 0).length;
    let scoreCap = firstHardErrors >= 2 ? 84.99 : firstHardErrors === 1 ? 89 : 100;
    if (!consistency.consistencyResolved) scoreCap = Math.min(scoreCap, 84.99);
    const diverseMedium = mediumFull.length >= 2 && mediumSkills.length >= 2;
    const diverseHard = hardFull.length >= 2 && hardSkills.length >= 2;
    const threeHard = hardFull.length >= 3 && (hardSkills.length >= 3 || hardContexts.length >= 3);
    const strict = diverseMedium && threeHard && hardFull.some((a) => a.transfer) && ![...medium, ...hard].some((a) => a.score === 0) && consistency.consistencyResolved;
    const evidenceCap = !diverseMedium || !diverseHard ? 84.99 : !threeHard ? 89 : strict ? 100 : 94;
    const highEligible = baseKnowledgeConfirmed && diverseMedium && diverseHard && consistency.consistencyResolved && highEvidenceRate >= 70;
    let topicScore = null;
    let dataStatus = answered.length ? 'InsufficientData' : 'NotEvaluated';
    if (answered.length && !pending && !blockedBySkip) {
        if (highEligible) topicScore = Math.min(clamp(85 + (highEvidenceRate - 70) / 30 * 15, 85, 100), evidenceCap, scoreCap);
        else if (!baseKnowledgeConfirmed && easyRate !== null) topicScore = clamp(easyRate / 70 * 64, 0, 64.99);
        else if (baseKnowledgeConfirmed && mediumRate !== null && mediumRate < 70) topicScore = 65 + mediumRate / 70 * 19;
        else if (baseKnowledgeConfirmed && mediumRate !== null && hardRate !== null) topicScore = 65 + Math.min(hardRate, 70) / 70 * 19;
        if (topicScore !== null) dataStatus = 'Evaluated';
    }
    const learningRoute = dataStatus !== 'Evaluated' ? 'потрібна додаткова діагностика' : topicScore < 65 ? 'теорія + практика + фінальне завдання' : topicScore < 85 ? 'практика + фінальне завдання' : 'лише фінальне практичне завдання';
    const levelLabel = topicScore === null ? (dataStatus === 'NotEvaluated' ? 'тема не оцінена' : 'недостатньо даних') : topicScore < 65 ? 'базові знання не підтверджено' : topicScore < 85 ? 'базові знання підтверджено' : topicScore < 90 ? 'впевнене розуміння' : topicScore < 95 ? 'стійке застосування знань' : 'застосування в різних контекстах';
    return {
        slug: topic.slug, name: topic.name, easyRate, mediumRate, hardRate, highEvidenceRate,
        baseKnowledgeConfirmed, mediumConfirmed: mediumFull.length, hardConfirmed: hardFull.length,
        mediumMicroSkillCount: mediumSkills.length, hardMicroSkillCount: hardSkills.length,
        hardContextCount: hardContexts.length, confirmedMicroSkills: unique([...mediumSkills, ...hardSkills]),
        ...consistency, scoreCap, evidenceCap, topicScore, dataStatus, learningRoute, levelLabel,
        answeredCount: answered.length, fullCorrectCount: answered.filter((a) => a.score === 1).length,
        partialCount: answered.filter((a) => a.score === 0.5).length, incorrectCount: answered.filter((a) => a.score === 0).length,
        skippedCount: all.length - answered.length,
    };
}

// Decisions are derived from the complete chronological history, so revisiting an answer
// cannot retain eligibility earned on an obsolete route.
export function nextStep(topic, history) {
    const all = history.filter((a) => a.slug === topic.slug);
    const answered = all.filter((a) => !a.skipped);
    const ask = (difficulty, reason, extra = {}) => ({ difficulty, reason, ...extra });
    if (!all.length) return ask('medium', 'initial');
    if (all.at(-1).skipped) return ask(all.at(-1).difficulty, 'skip-replacement');
    const medium = answered.filter((a) => a.difficulty === 'medium');
    const easy = answered.filter((a) => a.difficulty === 'easy');
    const hard = answered.filter((a) => a.difficulty === 'hard');
    const summary = evaluateTopic(topic, history);
    if (!medium.length) return ask('medium', 'initial');
    const firstMedium = medium[0];
    if (firstMedium.score < 1) {
        if (!easy.length) return ask('easy', 'foundation');
        if (!summary.baseKnowledgeConfirmed) return null;
        if (medium.length < 2) return ask('medium', 'medium-check');
        if (medium.at(-1).score < 1 && summary.mediumConfirmed < 2) return null;
    } else if (!hard.length) return ask('hard', 'high-check');
    if (medium.length < 2) return ask('medium', 'independent-medium');
    if (summary.mediumConfirmed < 2 || summary.mediumMicroSkillCount < 2) {
        if (medium.length < 3) return ask('medium', 'medium-confirmation');
        if (!easy.length) return ask('easy', 'foundation');
        if (summary.mediumRate >= 70 && !hard.length) return ask('hard', 'middle-range');
        return null;
    }
    if (hard.length < 2) return ask('hard', 'independent-hard');
    if (!summary.consistencyResolved) return ask('hard', 'consistency', { consistencyGroupId: summary.unresolvedGroups[0] });
    if (summary.scoreCap < 85) return null;
    if (summary.hardConfirmed < 2 || summary.hardMicroSkillCount < 2) return ask('hard', 'hard-confirmation');
    if (summary.scoreCap < 90) return null;
    if (summary.hardConfirmed < 3 || (summary.hardMicroSkillCount < 3 && summary.hardContextCount < 3)) return ask('hard', 'third-hard');
    return null;
}

export function chooseQuestion(bank, slug, step, used, history = [], previousAttempts = [], random = Math.random) {
    let candidates = bank.filter((q) => q.slug === slug && !used.has(q.templateId));
    if (step.consistencyGroupId) {
        candidates = candidates.filter((q) => q.consistencyGroupId === step.consistencyGroupId);
    } else candidates = candidates.filter((q) => q.difficulty === step.difficulty);
    const current = history.filter((a) => a.slug === slug && !a.skipped && a.difficulty === step.difficulty);
    const skills = new Set(current.filter((a) => a.score === 1).map((a) => a.microSkill));
    const contexts = new Set(current.filter((a) => a.score === 1).map((a) => a.context));
    const previous = previousAttempts.flatMap((attempt) => attempt.answers || []);
    const rank = (q) => (skills.has(q.microSkill) ? 0 : 100) + (contexts.has(q.context) ? 0 : 20) + (step.reason === 'third-hard' && q.transfer ? 10 : 0) - previous.filter((a) => a.templateId === q.templateId).length;
    if (!candidates.length) return null;
    const best = Math.max(...candidates.map(rank));
    candidates = candidates.filter((q) => rank(q) === best);
    return candidates[Math.floor(random() * candidates.length)];
}

export function technologyResult(rows) {
    const evaluated = rows.filter((row) => row.dataStatus === 'Evaluated');
    return {
        technologyScore: evaluated.length ? evaluated.reduce((sum, row) => sum + row.topicScore, 0) / evaluated.length : null,
        technologyCoverage: rows.length ? evaluated.length / rows.length * 100 : 0,
        evaluatedTopics: evaluated.length, totalTopics: rows.length,
        status: evaluated.length === rows.length ? 'Complete' : 'Incomplete',
    };
}

// Avoid displaying 85% for a score that still requires the <85 learning route.
export function formatScore(value) {
    if (value === null) return '—';
    return `${Math.floor((value + Number.EPSILON) * 100) / 100}%`;
}
