// Reviewed semantic labels: repeated skills deliberately share a label.
// Indexes correspond to the five authored questions of each difficulty.
export const skillCatalog = {
    html: {
        basics: ['doctype structure language nesting void', 'doctype root body id class'],
        text: ['structure importance emphasis fragments quotation', 'paragraph headings importance emphasis preformatted'],
        'lists-tables': ['unordered ordered cells span headers', 'unordered ordered cells span headers'],
        forms: ['submission labels types validation choices', 'submission password labels validation select'],
        semantic: ['landmarks sections meaning header-footer headings', 'main nav article section aside'],
        media: ['image video iframe captions picture', 'image video iframe sources captions'],
        head: ['document-metadata viewport favicon opengraph title', 'title charset favicon viewport description'],
        accessibility: ['alt keyboard native-controls headers accessible-name', 'labels keyboard alt headers accessible-name'],
        seo: ['metadata structure canonical alt opengraph', 'title headings description landmarks links'],
    },
    css: {
        'css-basics': ['rule-components inclusion-methods declaration-syntax error-recovery external-stylesheet-link', 'external-stylesheet declaration-block error-recovery cascade-order comments'],
        selectors: ['compound descendants lists structural attributes', 'compound children descendants structural attributes'],
        cascade: ['specificity inherited-properties important-priority inheritance-resolution functional-specificity', 'specificity inheritance important source-order functional-specificity'],
        'box-model': ['content-box border-box collapse outline centering', 'content-box-total border-box-content auto-margin-centering overflow-clipping border-box-margins'],
        units: ['font-relative viewport percentage relative-layout calculation', 'font-relative percentage viewport font-clamp calculation'],
        'colors-backgrounds-borders': ['background border current-color background-size alpha', 'current-color border background-size rounding gradient'],
        typography: ['font-family line-height spacing decoration text-processing', 'line-height text-transform overflow shorthand font-family'],
        display: ['none inline-block visibility contents flow-root', 'none inline-block visibility flex inline-flex'],
        positioning: ['relative absolute sticky stacking fixed', 'absolute relative stacking fixed sticky'],
        flexbox: ['direction wrap gap growth item-controls', 'growth direction distribution wrap order'],
        grid: ['fractions implicit minmax alignment areas', 'repeat lines fractions areas auto-fit'],
        responsive: ['mobile-first ranges fluid-layout media responsive-images', 'background-breakpoint grid-breakpoint fluid-type display-breakpoint compound-media'],
        'transitions-animations': ['transition fill-mode repetition timing reduced-motion', 'duration repetition fill-mode delay direction'],
        'functions-variables': ['variables fallback calculation math-functions scope', 'variables fallback calculation clamp scope'],
    },
    git: {
        'git-basics': ['worktree-index commit-snapshot distributed file-states head', 'distributed index references object-identity head'],
        'git-commands': ['staging status diff commit inspection', 'staging diff commit log unstage'],
        'git-branches': ['references switch fast-forward merge delete', 'branch-pointers merge-result fast-forward safe-delete merge-commit'],
        'git-remotes': ['fetch pull remote tracking push', 'remote fetch pull push clone'],
        'github-workflow': ['flow review protection revisions integration', 'flow drafts protection revisions review'],
        'merge-conflicts': ['conflict-causes resolution-workflow markers complete-or-abort unmerged-state', 'same-line-conflict resolved-status abort independent-files markers-cleanup'],
        'git-undo-history': ['unstage revert soft-reset amend reflog', 'restore unstage soft-reset hard-reset revert'],
        gitignore: ['extension-pattern pattern-syntax untrack-existing path-matches nested-scope', 'tracking precedence local-excludes globstar anchored-patterns'],
        'git-rebase': ['replay interactive resolution published-history control', 'replay resolution abort interactive published-history'],
    },
};

// Only reviewed tasks requiring application/transfer qualify; plain recall does not.
const transferTasks = new Set([
    'html/forms/hard/0', 'html/forms/hard/3',
    'css/box-model/hard/1', 'css/box-model/hard/4', 'css/units/hard/3',
    'css/typography/hard/0', 'css/positioning/hard/0', 'css/flexbox/hard/0',
    'css/grid/hard/4', 'css/functions-variables/hard/4',
    'git/git-commands/hard/2', 'git/git-branches/hard/0',
    'git/git-undo-history/hard/2', 'git/git-rebase/hard/4',
]);

// Explicit semantic claims, not an assumption that any wrong answer contradicts a right one.
const claims = {
    'git/git-commands/medium/0': { group: 'staging-is-not-commit', options: { 0: true, 1: true, 2: false } },
    'git/git-commands/hard/0': { group: 'staging-is-not-commit', options: { 0: true, 1: false } },
    'git/git-commands/hard/2': { group: 'staging-is-not-commit', options: { 0: true, 1: false, 2: false } },
    'git/git-undo-history/medium/0': { group: 'unstage-keeps-worktree', options: { 0: true, 1: true, 2: false } },
    'git/git-undo-history/hard/0': { group: 'unstage-keeps-worktree', options: { 0: true, 1: false, 2: false, 3: false } },
    'git/git-undo-history/hard/1': { group: 'unstage-keeps-worktree', options: { 0: true, 3: false } },
};

export function metadataFor(technology, topic, difficulty, index) {
    const key = `${technology}/${topic}/${difficulty}/${index}`;
    const list = skillCatalog[technology]?.[topic];
    const skill = difficulty === 'easy' ? 'foundation' : list?.[difficulty === 'medium' ? 0 : 1]?.split(' ')[index];
    if (!skill) throw new Error(`Missing reviewed MicroSkill: ${key}`);
    const claim = claims[key];
    return {
        microSkill: `${topic}/${skill}`,
        context: `${topic}/${skill}`,
        transfer: transferTasks.has(key),
        consistencyGroupId: claim ? `${topic}/${claim.group}` : null,
        consistencyClaims: claim?.options || {},
    };
}
