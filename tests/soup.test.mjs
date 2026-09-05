import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTopic, nextStep, scoreAnswer, consistencyOf, limitsFor, technologyResult, formatScore, chooseQuestion } from '../soupEngine.mjs';
import { makeBank, instantiate } from '../questionBank.mjs';
import { DiagnosticSession } from '../diagnosticSession.mjs';
import html from '../questionData.mjs';
import css from '../cssQuestionData.mjs';
import git from '../gitQuestionData.mjs';

const topic = { slug: 'sample', name: 'Sample' };
const evidence = (sequence) => sequence.map(([difficulty, score, skill, extra = {}], index) => ({
    id: `q${index}`, templateId: `template${index}`, slug: topic.slug,
    difficulty, score, skipped: score === null,
    microSkill: skill || `${difficulty}-${index}`, context: skill || `${difficulty}-${index}`,
    transfer: false, selected: ['a'], ...extra,
}));
const core = [['medium', 1], ['hard', 1], ['medium', 1], ['hard', 1]];
const score = (sequence) => evaluateTopic(topic, evidence(sequence));

test('complete and partial answers use stable option IDs, reject bad and duplicate selections', () => {
    const q = { correctIds: ['a', 'b'] };
    assert.equal(scoreAnswer(q, ['b', 'a']), 1);
    assert.equal(scoreAnswer(q, ['b']), 0.5);
    for (const invalid of [[], ['a', 'x'], ['x'], ['a', 'a'], ['a', 'b', 'x']]) assert.equal(scoreAnswer(q, invalid), 0);
    assert.equal(scoreAnswer({ correctIds: ['a'] }, ['a']), 1);
});

test('four perfect independent answers yield 89 and do not synthesize EasyRate', () => {
    const result = score(core);
    assert.equal(result.topicScore, 89);
    assert.equal(result.evidenceCap, 89);
    assert.equal(result.easyRate, null);
    assert.equal(result.baseKnowledgeConfirmed, true);
    assert.equal(result.mediumConfirmed, 2);
});

test('three diverse Hard confirmations yield 94, or 100 with reviewed transfer', () => {
    assert.equal(score([...core, ['hard', 1]]).topicScore, 94);
    assert.equal(score([...core, ['hard', 1, null, { transfer: true }]]).topicScore, 100);
});

test('extra partial answer reduces rate without replacing confirmations', () => {
    const result = score([...core, ['hard', 1, null, { transfer: true }], ['medium', 0.5]]);
    assert.equal(result.mediumConfirmed, 2);
    assert.equal(result.hardConfirmed, 3);
    assert.ok(Math.abs(result.topicScore - 95.8333333333) < 0.0001);
    const partial = score([['medium', 1], ['hard', 1], ['medium', 0.5], ['hard', 1]]);
    assert.equal(partial.mediumRate, 75);
    assert.equal(partial.mediumConfirmed, 1);
    assert.ok(partial.topicScore === null || partial.topicScore < 85);
});

test('partial theoretical Hard is not a Hard confirmation', () => {
    const r = score([['medium', 1], ['hard', 1], ['medium', 1], ['hard', 0.5]]);
    assert.equal(r.hardRate, 75);
    assert.equal(r.hardConfirmed, 1);
    assert.ok(r.topicScore < 85);
});

test('first answered Hard errors retain caps after recovery; skips are excluded', () => {
    const one = score([['medium', 1], ['hard', 0], ['medium', 1], ['hard', 1], ['hard', 1], ['hard', 1, null, { transfer: true }]]);
    assert.equal(one.scoreCap, 89);
    assert.equal(one.topicScore, 89);
    const two = score([['medium', 1], ['hard', 0], ['medium', 1], ['hard', 0], ['hard', 1]]);
    assert.equal(two.scoreCap, 84.99);
    assert.ok(two.topicScore < 85);
    const skip = score([['medium', 1], ['hard', null], ['hard', 1], ['medium', 1], ['hard', 1]]);
    assert.equal(skip.hardRate, 100);
    assert.equal(skip.scoreCap, 100);
    assert.equal(skip.topicScore, 89);
});

test('same microSkill cannot unlock independent evidence', () => {
    const r = score([['medium', 1, 'same'], ['hard', 1], ['medium', 1, 'same'], ['hard', 1], ['hard', 1, null, { transfer: true }]]);
    assert.equal(r.mediumMicroSkillCount, 1);
    assert.ok(r.topicScore === null || r.topicScore < 85);
    const h = score([['medium', 1], ['hard', 1, 'same'], ['medium', 1], ['hard', 1, 'same']]);
    assert.ok(h.topicScore < 85);
});

test('Easy error is evidence for zero, while skips are not', () => {
    assert.equal(score([['medium', 0], ['easy', 0]]).topicScore, 0);
    assert.equal(score([['medium', null], ['medium', null]]).dataStatus, 'NotEvaluated');
    assert.equal(score([['medium', 0], ['easy', null]]).dataStatus, 'InsufficientData');
    assert.equal(score([['medium', 0], ['easy', 1], ['medium', 0]]).topicScore, 65);
    assert.ok(Math.abs(score([['medium', 0], ['easy', 1], ['medium', 1]]).topicScore - 78.57142857) < 0.0001);
});

test('two independent full Medium answers confirm the base even when Easy was asked', () => {
    const result = score([
        ['medium', 0.5, 'm1'],
        ['easy', 0, 'foundation'],
        ['medium', 1, 'm2'],
        ['medium', 1, 'm3'],
    ]);
    assert.equal(result.mediumConfirmed, 2);
    assert.equal(result.mediumMicroSkillCount, 2);
    assert.equal(result.baseKnowledgeConfirmed, true);
});

test('documented routing: M H M H H; weak and partial first answers go to Easy', () => {
    const sequence = [];
    for (const difficulty of ['medium', 'hard', 'medium', 'hard', 'hard']) {
        assert.equal(nextStep(topic, evidence(sequence)).difficulty, difficulty);
        sequence.push([difficulty, 1]);
    }
    assert.equal(nextStep(topic, evidence(sequence)), null);
    assert.equal(nextStep(topic, evidence([['medium', 0.5]])).difficulty, 'easy');
    assert.equal(nextStep(topic, evidence([['medium', 0], ['easy', 0]])), null);
    assert.equal(nextStep(topic, evidence([['medium', 0], ['easy', 1]])).difficulty, 'medium');
    assert.equal(nextStep(topic, evidence([['medium', 1], ['hard', null]])).difficulty, 'hard');
    assert.equal(nextStep(topic, evidence([['medium', 1], ['hard', 1], ['medium', 0.5]])).difficulty, 'medium');
});

test('consistency uses semantic claims; a third independent correct check resolves the conflict', () => {
    const a = (value, id, result) => ({ templateId: id, score: result, selected: ['a'], consistencyGroupId: 'g', consistencyClaims: { a: value } });
    assert.equal(consistencyOf([a(true, '1', 1), a(false, '2', 0)]).consistencyResolved, false);
    assert.equal(consistencyOf([a(true, '1', 1), a(false, '2', 0), a(true, '3', 1)]).consistencyResolved, true);
    assert.equal(consistencyOf([a(true, '1', 1), a(false, '2', 0), a(true, '1', 1)]).consistencyResolved, false);
    assert.equal(consistencyOf(evidence([['medium', 1], ['hard', 0]])).consistencyResolved, true);
    const answers = evidence(core);
    Object.assign(answers[0], a(true, '1', 1));
    Object.assign(answers[1], a(false, '2', 0));
    const r = evaluateTopic(topic, answers);
    assert.ok(r.topicScore < 85);
});

test('coverage and routing use real evaluated scores before display', () => {
    const r = technologyResult([{ dataStatus: 'Evaluated', topicScore: 95 }, { dataStatus: 'InsufficientData', topicScore: null }]);
    assert.equal(r.technologyScore, 95);
    assert.equal(r.technologyCoverage, 50);
    assert.equal(r.status, 'Incomplete');
    assert.equal(formatScore(84.99), '84.99%');
    assert.equal(formatScore(null), '—');
    assert.deepEqual([9, 14, 17].map((n) => limitsFor(n).total), [47, 73, 89]);
});

test('bank metadata is complete; shuffled options retain identity; generated values stay coherent', () => {
    for (const [key, data] of [['html', html], ['css', css], ['git', git]]) {
        const bank = makeBank({ key, data });
        for (const q of bank) {
            assert.ok(q.microSkill && q.context && q.templateId);
            const rendered = instantiate(q, () => 0.3);
            assert.equal(scoreAnswer(rendered, q.correctIds), 1);
            assert.equal(new Set(rendered.options.map((o) => o.id)).size, q.options.length);
        }
    }
    const q = makeBank({ key: 'css', data: css }).find((q) => q.templateId === 'css-units-hard-0');
    for (const random of [0, 0.25, 0.5, 0.99]) {
        const instance = instantiate(q, () => random);
        assert.equal(instance.options.find((o) => o.id === instance.correctIds[0]).text, `${instance.parameters.font * instance.parameters.factor}px`);
    }
});

test('each consistency group can be resolved inside the same topic', () => {
    const grouped = new Map();
    for (const [key, data] of [['html', html], ['css', css], ['git', git]]) {
        for (const question of makeBank({ key, data }).filter((q) => q.consistencyGroupId)) {
            const groupKey = `${key}/${question.slug}/${question.consistencyGroupId}`;
            grouped.set(groupKey, [...(grouped.get(groupKey) || []), question]);
        }
    }
    assert.ok(grouped.size > 0);
    for (const questions of grouped.values()) assert.ok(questions.length >= 3);
});

test('authored answer positions are balanced before per-session shuffling', () => {
    for (const [key, data] of [['html', html], ['css', css], ['git', git]]) {
        const groups = Map.groupBy(makeBank({ key, data }), (q) => `${q.difficulty}/${q.options.length}/${q.correctIds.length}`);
        for (const questions of groups.values()) {
            const optionCount = questions[0].options.length;
            const correctCount = questions[0].correctIds.length;
            const combinations = correctCount === 1
                ? Array.from({ length: optionCount }, (_, i) => `${i}`)
                : Array.from({ length: optionCount }, (_, i) =>
                    Array.from({ length: optionCount - i - 1 }, (_, j) => `${i},${i + j + 1}`),
                ).flat();
            const counts = Object.fromEntries(combinations.map((combination) => [combination, 0]));
            for (const question of questions) {
                const positions = question.options
                    .map((option, index) => question.correctIds.includes(option.id) ? index : null)
                    .filter((index) => index !== null)
                    .join(',');
                counts[positions]++;
            }
            const distribution = Object.values(counts);
            assert.ok(Math.max(...distribution) - Math.min(...distribution) <= 1);
        }
    }
});

test('new skills and unused questions are preferred on retest', () => {
    const bank = makeBank({ key: 'git', data: git });
    const candidates = bank.filter((q) => q.slug === 'git-commands' && q.difficulty === 'medium');
    const previous = [{ answers: candidates.slice(0, 4).map((q) => ({ templateId: q.templateId })) }];
    assert.equal(chooseQuestion(bank, 'git-commands', { difficulty: 'medium' }, new Set(), [], previous).templateId, candidates[4].templateId);
});

test('complete adaptive sessions terminate inside limits for every technology and answer strategy', () => {
    for (const [key, data] of [['html', html], ['css', css], ['git', git]]) {
        for (const strategy of ['correct', 'incorrect', 'partial', 'skip', 'mixed']) {
            const s = new DiagnosticSession({ key, data }, { random: () => 0.3 });
            let count = 0;
            while (s.current) {
                assert.ok(++count <= limitsFor(data.length).total);
                const q = s.current;
                const skipped = strategy === 'skip' || (strategy === 'mixed' && count % 4 === 0);
                const selected = strategy === 'incorrect' ? [q.options.find((o) => !q.correctIds.includes(o.id)).id] : strategy === 'partial' ? q.correctIds.slice(0, 1) : q.correctIds;
                assert.ok(s.submit(selected, skipped));
            }
            const result = s.result();
            assert.equal(result.totalTopics, data.length);
            assert.equal(s.state.queue.length, new Set(s.state.queue.map((q) => q.templateId)).size);
            assert.ok(s.state.extraTopics.length <= s.limits.extraTopics);
            assert.ok(data.every((topic) => s.state.queue.filter((q) => q.slug === topic.slug).length <= 6));
            if (strategy === 'skip') {
                assert.equal(result.technologyScore, null);
                assert.equal(result.technologyCoverage, 0);
            }
            if (strategy === 'incorrect') assert.equal(result.technologyScore, 0);
            if (strategy === 'correct') assert.equal(result.technologyCoverage, 100);
            for (const row of result.topics) if (row.topicScore >= 85) {
                assert.ok(row.mediumConfirmed >= 2 && row.hardConfirmed >= 2);
                assert.ok(row.mediumMicroSkillCount >= 2 && row.hardMicroSkillCount >= 2);
            }
        }
    }
});

test('session can resume exactly; edited answers invalidate only descendants of the same topic', () => {
    const technology = { key: 'git', data: git };
    const s = new DiagnosticSession(technology, { random: () => 0.1 });
    assert.equal(s.submit([]), false);
    const first = s.current;
    s.submit(first.correctIds);
    const second = s.current;
    s.submit(second.correctIds);
    const resumed = new DiagnosticSession(technology, { saved: JSON.parse(JSON.stringify(s.state)) });
    assert.deepEqual(resumed.state, s.state);
    resumed.state.questionIndex = 0;
    const bad = first.options.find((o) => !first.correctIds.includes(o.id)).id;
    resumed.submit([bad]);
    assert.ok(resumed.state.answers.some((a) => a.id === second.id));
    assert.ok(!resumed.state.queue.some((q) => q.slug === first.slug && q.difficulty === 'hard'));
    assert.ok(resumed.state.queue.some((q) => q.slug === first.slug && q.difficulty === 'easy'));
    assert.equal(resumed.state.revisions.length, 1);
});
