import { ALGORITHM_VERSION, limitsFor, chooseQuestion, nextStep, evaluateTopic, scoreAnswer, technologyResult } from './soupEngine.mjs';
import { makeBank, instantiate } from './questionBank.mjs';

export class DiagnosticSession {
    constructor(technology, { history = [], random = Math.random, saved = null } = {}) {
        this.technology = technology;
        this.bank = makeBank(technology);
        this.random = random;
        this.history = history;
        this.limits = limitsFor(technology.data.length);
        this.state = saved || {
            version: ALGORITHM_VERSION, technologyKey: technology.key,
            attemptId: globalThis.crypto.randomUUID(), attemptNumber: history.length + 1,
            startedAt: new Date().toISOString(), questionIndex: 0, queue: [], answers: [],
            drafts: {}, extraTopics: [], stopped: {}, revisions: [], completedAt: null,
        };
        if (!saved) technology.data.forEach((topic) => this.schedule(topic));
    }

    get current() { return this.state.queue[this.state.questionIndex] || null; }

    schedule(topic) {
        const state = this.state;
        const step = nextStep(topic, state.answers);
        delete state.stopped[topic.slug];
        if (!step) return;
        if (state.queue.some((q) => q.slug === topic.slug && !state.answers.some((a) => a.id === q.id))) return;
        const count = state.queue.filter((q) => q.slug === topic.slug).length;
        const needsExtra = count === this.limits.perTopic;
        const atLimit = count >= this.limits.perTopic + 1 || state.queue.length >= this.limits.total || (needsExtra && !state.extraTopics.includes(topic.slug) && state.extraTopics.length >= this.limits.extraTopics);
        const used = new Set(state.queue.map((q) => q.templateId));
        const question = atLimit ? null : chooseQuestion(this.bank, topic.slug, step, used, state.answers, this.history, this.random);
        if (!question) {
            state.stopped[topic.slug] = { reason: atLimit ? 'limit' : 'bank-exhausted', requested: step };
            return;
        }
        if (needsExtra && !state.extraTopics.includes(topic.slug)) state.extraTopics.push(topic.slug);
        const instance = instantiate(question, this.random, this.history.flatMap((a) => a.answers || []));
        instance.id = `${state.attemptId}:${question.templateId}`;
        instance.reason = step.reason;
        state.queue.push(instance);
    }

    submit(selected, skipped = false) {
        const question = this.current;
        if (!question || (!skipped && (!selected.length || selected.length > question.correctIds.length || new Set(selected).size !== selected.length || selected.some((id) => !question.options.some((o) => o.id === id))))) return false;
        const state = this.state;
        const old = state.answers.find((a) => a.id === question.id);
        const same = old && old.skipped === skipped && (skipped || [...old.selected].sort().join('|') === [...selected].sort().join('|'));
        let invalidated = 0;
        if (!same) {
            if (old) {
                const obsolete = new Set(state.queue.slice(state.questionIndex + 1).filter((q) => q.slug === question.slug).map((q) => q.id));
                const removedAnswers = state.answers.filter((a) => a.id === question.id || obsolete.has(a.id));
                state.revisions.push({ timestamp: new Date().toISOString(), answers: removedAnswers });
                invalidated = obsolete.size;
                state.queue = state.queue.filter((q) => !obsolete.has(q.id));
                state.answers = state.answers.filter((a) => a.id !== question.id && !obsolete.has(a.id));
                for (const id of obsolete) delete state.drafts[id];
                state.extraTopics = state.extraTopics.filter((slug) => state.queue.filter((q) => q.slug === slug).length > this.limits.perTopic);
            }
            const answer = {
                id: question.id, questionId: question.id, templateId: question.templateId,
                slug: question.slug, difficulty: question.difficulty, microSkill: question.microSkill,
                context: question.context, transfer: question.transfer,
                selected: skipped ? [] : [...selected], score: skipped ? null : scoreAnswer(question, selected), skipped,
                attemptNumber: state.attemptNumber, parameters: question.parameters,
                consistencyGroupId: question.consistencyGroupId, consistencyClaims: question.consistencyClaims,
                timestamp: new Date().toISOString(),
            };
            state.answers.push(answer);
            // Keep evidence in presentation order after edits, not in time-of-last-edit order.
            state.answers.sort((a, b) => state.queue.findIndex((q) => q.id === a.id) - state.queue.findIndex((q) => q.id === b.id));
            state.drafts[question.id] = answer.selected;
            this.schedule(this.technology.data.find((t) => t.slug === question.slug));
        }
        state.questionIndex++;
        if (!this.current) state.completedAt = new Date().toISOString();
        return { invalidated };
    }

    result() {
        const rows = this.technology.data.map((topic) => {
            const all = this.state.answers.filter((a) => a.slug === topic.slug);
            const summary = evaluateTopic(topic, all);
            const stop = this.state.stopped[topic.slug];
            const missingMandatory = summary.mediumConfirmed < 2 || summary.mediumMicroSkillCount < 2 || summary.hardConfirmed < 2 || summary.hardMicroSkillCount < 2;
            const blockedBySkip = Boolean(stop && all.some((a) => a.skipped) && (all.at(-1)?.skipped || (missingMandatory && !['third-hard', 'consistency'].includes(stop.requested.reason))));
            const pending = this.state.queue.some((q) => q.slug === topic.slug && !this.state.answers.some((a) => a.id === q.id));
            return { ...evaluateTopic(topic, all, { pending, blockedBySkip }), stopReason: stop?.reason || null };
        });
        return { version: ALGORITHM_VERSION, technology: this.technology.key, attemptId: this.state.attemptId, completedAt: this.state.completedAt, ...technologyResult(rows), topics: rows };
    }
}
