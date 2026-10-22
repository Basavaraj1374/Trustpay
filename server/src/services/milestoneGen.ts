// ─────────────────────────────────────────────────────────────────────────────
// services/milestoneGen.ts — Rule-based milestone suggestion engine
//
// Given a project title, description, and total budget, this generates
// 3–5 milestone suggestions using category-based templates.
//
// WHY rule-based (not AI API)?
// - Works offline, costs nothing, easy to understand and explain
// - Deterministic output (not random) — good for testing
// - You can extend it with more categories easily
// ─────────────────────────────────────────────────────────────────────────────

interface MilestoneSuggestion {
  order:        number;
  title:        string;
  description:  string;
  deliverables: string;
  percentage:   number; // how much of the total budget this milestone gets
}

// ─── Category templates ───────────────────────────────────────────────────────
// Each category has a list of milestone templates with budget percentages.
// The percentages in each template must sum to 100.

const templates: Record<string, Omit<MilestoneSuggestion, 'order'>[]> = {
  web: [
    { title: 'Requirements & Wireframes',      description: 'Finalise requirements, create wireframes and UI mockups', deliverables: 'Wireframes PDF, design mockups',                       percentage: 15 },
    { title: 'UI Design (Figma)',              description: 'Design all screens in Figma with responsive layout',       deliverables: 'Figma file, design system',                             percentage: 20 },
    { title: 'Frontend Development',           description: 'Implement all UI screens with React/HTML/CSS',             deliverables: 'Working frontend, GitHub repo link',                    percentage: 30 },
    { title: 'Backend & Database Integration', description: 'Build APIs, connect database, implement business logic',   deliverables: 'API endpoints, database schema, Postman collection',    percentage: 25 },
    { title: 'Testing & Deployment',           description: 'End-to-end testing, bug fixes, deploy to production',      deliverables: 'Deployed URL, test report, documentation',              percentage: 10 },
  ],
  mobile: [
    { title: 'App Architecture & Design',      description: 'Finalise tech stack, design UI screens',                  deliverables: 'Architecture doc, Figma screens',                       percentage: 15 },
    { title: 'Core Features (Sprint 1)',        description: 'Build the main screens and navigation',                   deliverables: 'Working app (Sprint 1), APK/TestFlight link',            percentage: 30 },
    { title: 'Advanced Features (Sprint 2)',    description: 'Implement remaining features, push notifications, auth',  deliverables: 'Working app (Sprint 2), APK/TestFlight link',            percentage: 30 },
    { title: 'Testing & Store Submission',     description: 'QA testing, performance optimisation, store submission',  deliverables: 'App Store / Play Store submission, release notes',       percentage: 25 },
  ],
  design: [
    { title: 'Research & Moodboard',           description: 'Competitive analysis, brand direction, moodboard',        deliverables: 'Moodboard PDF, research doc',                           percentage: 20 },
    { title: 'Initial Concepts (3 options)',   description: 'Present 3 design directions for feedback',                deliverables: 'Concept presentations, feedback session',                percentage: 30 },
    { title: 'Refined Design',                 description: 'Refine chosen concept based on feedback',                 deliverables: 'Polished design files',                                  percentage: 30 },
    { title: 'Final Files & Handover',         description: 'Export all assets, prepare style guide, handover',        deliverables: 'Source files (AI/PSD/Figma), asset library, style guide', percentage: 20 },
  ],
  data: [
    { title: 'Data Collection & Exploration',  description: 'Gather dataset, perform EDA, identify patterns',          deliverables: 'EDA notebook, data quality report',                     percentage: 20 },
    { title: 'Data Cleaning & Preprocessing', description: 'Handle missing values, outliers, feature engineering',    deliverables: 'Clean dataset, preprocessing pipeline',                  percentage: 20 },
    { title: 'Model Development',              description: 'Train and compare multiple models, hyperparameter tuning', deliverables: 'Model notebook, performance metrics',                    percentage: 35 },
    { title: 'Report & Dashboard',             description: 'Summarise findings, create visualisations/dashboard',     deliverables: 'Final report, dashboard link or PDF',                    percentage: 25 },
  ],
  writing: [
    { title: 'Research & Outline',             description: 'Research topic, prepare detailed outline for approval',   deliverables: 'Content outline document',                               percentage: 20 },
    { title: 'First Draft',                    description: 'Write complete first draft based on approved outline',    deliverables: 'First draft (Google Doc / Word)',                        percentage: 40 },
    { title: 'Revisions & Final Draft',        description: 'Incorporate feedback, proofread, finalise content',       deliverables: 'Final draft, clean formatted copy',                      percentage: 40 },
  ],
  // Default template for any category not matched above
  default: [
    { title: 'Planning & Kickoff',             description: 'Requirements gathering, project planning, kickoff meeting', deliverables: 'Project plan, requirements doc',                      percentage: 20 },
    { title: 'First Deliverable',              description: 'Complete first major deliverable as agreed',               deliverables: 'First deliverable as per scope',                        percentage: 30 },
    { title: 'Second Deliverable',             description: 'Complete second major deliverable as agreed',              deliverables: 'Second deliverable as per scope',                       percentage: 30 },
    { title: 'Final Review & Handover',        description: 'Final review, revisions, project handover',               deliverables: 'Final output, handover documentation',                  percentage: 20 },
  ],
};

// ─── Category detection ───────────────────────────────────────────────────────
// We pick a template by looking for keywords in the title and description.
function detectCategory(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();

  if (/\b(web|website|webapp|frontend|backend|react|vue|angular|html|css|api|fullstack)\b/.test(text)) return 'web';
  if (/\b(mobile|app|android|ios|flutter|react native|swift|kotlin)\b/.test(text)) return 'mobile';
  if (/\b(design|figma|ui|ux|logo|brand|graphic|illustrat)\b/.test(text)) return 'design';
  if (/\b(data|ml|machine learning|model|dataset|analysis|analytics|python|notebook)\b/.test(text)) return 'data';
  if (/\b(writ|content|blog|article|copywrite|seo|book)\b/.test(text)) return 'writing';

  return 'default';
}

// ─── Main function ────────────────────────────────────────────────────────────
/**
 * suggestMilestones — given project details, returns a list of milestone
 * suggestions with amounts calculated from the total budget.
 *
 * @param title             Project title
 * @param description       Project description
 * @param totalBudgetPaise  Total budget in paise
 * @returns                 Array of milestone suggestions
 */
export function suggestMilestones(
  title: string,
  description: string,
  totalBudgetPaise: number
): MilestoneSuggestion[] {
  const category = detectCategory(title, description);
  const template = templates[category] ?? templates.default;

  let remaining = totalBudgetPaise;

  return template.map((t, index) => {
    const isLast = index === template.length - 1;

    // For the last milestone, use whatever remains (avoids rounding errors)
    const amount = isLast
      ? remaining
      : Math.round((totalBudgetPaise * t.percentage) / 100);

    remaining -= amount;

    return {
      order:       index + 1,
      title:       t.title,
      description: t.description,
      deliverables: t.deliverables,
      percentage:  t.percentage,
      // Note: 'amount' isn't part of MilestoneSuggestion interface —
      // the client shows it as (percentage% of totalBudget) and the
      // user can edit before confirming
    };
  });
}

export type { MilestoneSuggestion };
