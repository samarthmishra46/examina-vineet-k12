export type Block =
  | { t: 'h2'; text: string }
  | { t: 'p'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] };

export interface Post {
  slug: string;
  title: string;
  description: string;
  published: string; // ISO date
  tags: string[];
  body: Block[];
}

export const POSTS: Post[] = [
  {
    slug: 'how-to-revise-cbse-class-10-maths',
    title: 'How to Revise CBSE Class 10 Maths for the Board Exam',
    description:
      'A practical revision method for Class 10 Maths: how to use NCERT, practise by chapter, avoid silly mistakes and write answers that score step marks.',
    published: '2026-10-02',
    tags: ['Class 10', 'Maths', 'Revision'],
    body: [
      {
        t: 'p',
        text: 'Maths is the subject where revision means practice, not re-reading. You do not remember a method by looking at it; you remember it by using it on problems you have not seen. This guide gives you a simple way to revise Class 10 Maths from the NCERT textbook.',
      },
      { t: 'h2', text: '1. Start with NCERT, fully' },
      {
        t: 'p',
        text: 'CBSE board papers are set around the NCERT syllabus. Work through every solved example and every exercise question in each chapter before moving to any other book. If you can do the NCERT exercises without looking at the solutions, your base is strong.',
      },
      { t: 'h2', text: '2. Make a one-page formula sheet per chapter' },
      {
        t: 'p',
        text: 'After finishing a chapter, close the book and write down every formula and rule you remember. Then open the book and fill in what you missed. The gaps are exactly what to revise. Keep these sheets for the last week.',
      },
      { t: 'h2', text: '3. Practise in three passes' },
      {
        t: 'ol',
        items: [
          'Pass 1: Solve the chapter with the book open and understand each step.',
          'Pass 2: A few days later, solve a mixed set without notes. Mark every question you got wrong or took too long on.',
          'Pass 3: Redo only the marked questions a week later. Repeat until they stop appearing in your wrong list.',
        ],
      },
      { t: 'h2', text: '4. Keep a mistake log' },
      {
        t: 'p',
        text: 'For each wrong answer, write the type of mistake: formula mix-up, sign error, calculation slip, misread question, or concept gap. Most students make the same two or three kinds of mistakes repeatedly. Once you know yours, you can check for them on purpose in the exam.',
      },
      { t: 'h2', text: '5. Write answers the way examiners mark them' },
      {
        t: 'p',
        text: 'Board marking is step-wise. Write what is given, the formula you use, each step of working, and the final answer with units where relevant. A correct method with a small arithmetic slip still earns most of the marks; a bare answer may earn few.',
      },
      { t: 'h2', text: '6. Time yourself' },
      {
        t: 'p',
        text: 'In the last weeks, solve a full previous-year or sample paper in the real time limit. After each paper, review which section cost you the most time and which chapters the wrong answers came from, then revise those first.',
      },
    ],
  },
  {
    slug: 'how-to-revise-cbse-class-10-science',
    title: 'How to Revise CBSE Class 10 Science (Physics, Chemistry, Biology)',
    description:
      'A revision plan for Class 10 Science using NCERT: what to learn by heart, what to practise, and how to handle diagrams, equations and numericals.',
    published: '2026-10-02',
    tags: ['Class 10', 'Science', 'Revision'],
    body: [
      {
        t: 'p',
        text: 'Class 10 Science mixes three kinds of learning: facts and definitions, diagrams and processes, and numericals. Each needs a different revision method. Treating them all as "reading" is why many students feel they know a chapter but lose marks.',
      },
      { t: 'h2', text: 'Read the NCERT text line by line' },
      {
        t: 'p',
        text: 'Board questions often follow NCERT wording and examples. Read the text, boxes, activities and in-text questions, not just the summaries. Many definitions and reasons are worth remembering in NCERT\'s own words.',
      },
      { t: 'h2', text: 'Chemistry: equations and reactions' },
      {
        t: 'ul',
        items: [
          'Write balanced equations from memory, then check them.',
          'Group reactions by type (combination, displacement, and so on) and note an example of each.',
          'For carbon compounds, practise naming and drawing structures until it is automatic.',
        ],
      },
      { t: 'h2', text: 'Biology: diagrams and flow' },
      {
        t: 'ul',
        items: [
          'Redraw every important diagram without looking, then label it. Do this repeatedly.',
          'For processes such as digestion or reproduction, write the steps as a flow of arrows.',
          'Learn the "why" as well as the "what"; many questions ask for a reason.',
        ],
      },
      { t: 'h2', text: 'Physics: numericals' },
      {
        t: 'p',
        text: 'Write the formula, substitute values with units, and calculate. Practise ray diagrams and circuit diagrams until you can draw them neatly and quickly. Keep a list of formulas with the units of each quantity.',
      },
      { t: 'h2', text: 'Revise with questions, not rereading' },
      {
        t: 'p',
        text: 'After each chapter, answer questions from memory first, then check the book. Use the three kinds of questions in the paper: short objective, short answer and long answer, so you practise recalling and writing, not just recognising.',
      },
    ],
  },
  {
    slug: 'cbse-class-12-physics-revision-strategy',
    title: 'CBSE Class 12 Physics Revision Strategy: A Chapter-by-Chapter Approach',
    description:
      'How to revise Class 12 Physics from NCERT: derivations, numericals, diagrams and how to practise for board-style questions.',
    published: '2026-10-02',
    tags: ['Class 12', 'Physics', 'Revision'],
    body: [
      {
        t: 'p',
        text: 'Class 12 Physics rewards understanding over memorising. Derivations, concepts and numericals are all tested, so revision has to cover all three.',
      },
      { t: 'h2', text: 'Sort each chapter into four buckets' },
      {
        t: 'ul',
        items: [
          'Definitions and laws you must state exactly.',
          'Derivations you must reproduce step by step.',
          'Numerical types you must be able to solve.',
          'Diagrams (ray diagrams, circuits, graphs) you must draw correctly.',
        ],
      },
      { t: 'h2', text: 'Learn derivations by understanding the chain' },
      {
        t: 'p',
        text: 'Do not memorise a derivation as a block of text. Note the starting assumption, the key idea at each step, and the final result. Then write it from a blank page. Board marking gives marks for each step, so writing the correct steps matters even if you forget one detail.',
      },
      { t: 'h2', text: 'Numericals: units and signs' },
      {
        t: 'p',
        text: 'Write the formula first, substitute with units, and check that your final unit is right. Many marks are lost on sign conventions in optics and on unit conversions. Make a short list of the conventions you tend to forget.',
      },
      { t: 'h2', text: 'Use previous-year and sample papers' },
      {
        t: 'p',
        text: 'Once you have covered a few chapters, attempt related questions from previous papers and note which topics repeat. This shows you where the paper tends to focus, so you can spend more time there. Confirm the current exam pattern on the official CBSE website.',
      },
    ],
  },
  {
    slug: 'how-to-use-previous-year-papers-cbse-boards',
    title: 'How to Use Previous-Year Papers for CBSE Board Preparation',
    description:
      'When to start solving previous-year and sample papers, how to analyse your mistakes, and how to turn them into a revision plan.',
    published: '2026-10-02',
    tags: ['Past papers', 'Revision', 'Strategy'],
    body: [
      {
        t: 'p',
        text: 'Previous-year papers and CBSE sample papers show you the style of questions, the way marks are split and the time pressure of the real exam. Used well, they are the best test of your preparation. Used badly, they are just a way to feel busy.',
      },
      { t: 'h2', text: 'When to start' },
      {
        t: 'p',
        text: 'Do not wait until you have finished the whole syllabus. After each chapter, attempt the previous-year questions on that chapter. Closer to the exam, switch to full papers under timed conditions.',
      },
      { t: 'h2', text: 'How to attempt a paper' },
      {
        t: 'ol',
        items: [
          'Sit at a desk, set a timer for the real exam length, and use no notes.',
          'Write full answers the way you would in the exam, including steps.',
          'Mark your paper strictly using the official marking scheme.',
        ],
      },
      { t: 'h2', text: 'Analyse, do not just score' },
      {
        t: 'p',
        text: 'For each lost mark, record the chapter and the reason: did not know it, forgot it, made a slip, misread the question, or ran out of time. Count the reasons. If most losses are slips, practise checking your work; if they are gaps, go back to the chapter.',
      },
      { t: 'h2', text: 'Look for patterns, not predictions' },
      {
        t: 'p',
        text: 'Seeing which topics appear often tells you which areas to be strong in. It does not tell you what will come this year, so never skip a chapter because it was "not asked last time".',
      },
    ],
  },
  {
    slug: 'last-30-days-revision-plan-cbse-boards',
    title: 'A 30-Day Revision Plan Before Your CBSE Board Exams',
    description:
      'A simple, realistic month-long revision schedule: what to do in each week, how to balance subjects, and how to stay calm.',
    published: '2026-10-02',
    tags: ['Revision', 'Planning', 'Boards'],
    body: [
      {
        t: 'p',
        text: 'A good last-month plan is simple enough that you will actually follow it. Adjust the numbers to your own exam dates and weak areas.',
      },
      { t: 'h2', text: 'Week 1: Find the gaps' },
      {
        t: 'p',
        text: 'For each subject, list every chapter and rate it: confident, shaky or weak. Attempt one timed paper per subject to confirm your ratings. Weak chapters get the most time from now on.',
      },
      { t: 'h2', text: 'Weeks 2 and 3: Fix weak chapters' },
      {
        t: 'ul',
        items: [
          'Study a weak chapter from NCERT, then practise questions on it the same day.',
          'Revisit it two days later with questions from memory.',
          'Keep a mistake log and review it every evening.',
        ],
      },
      { t: 'h2', text: 'Week 4: Full papers and light revision' },
      {
        t: 'p',
        text: 'Attempt full papers in exam conditions and review them carefully. Spend the rest of the time on your formula sheets, diagrams and mistake log. Do not start new books now.',
      },
      { t: 'h2', text: 'Sleep, food and breaks' },
      {
        t: 'p',
        text: 'Memory and focus fall quickly when you are short on sleep. Keep a regular sleep time, take short breaks while studying, and avoid all-night sessions before an exam.',
      },
    ],
  },
  {
    slug: 'active-recall-and-spaced-repetition-for-board-exams',
    title: 'Active Recall and Spaced Repetition: Revise Less, Remember More',
    description:
      'Two research-backed study methods, active recall and spaced repetition, and how to use them for CBSE board exam revision.',
    published: '2026-10-02',
    tags: ['Study techniques', 'Revision'],
    body: [
      {
        t: 'p',
        text: 'Most students revise by reading and highlighting. It feels productive but it is a weak way to remember things. Two methods that learning research supports are active recall and spaced repetition.',
      },
      { t: 'h2', text: 'Active recall' },
      {
        t: 'p',
        text: 'Active recall means pulling information out of memory instead of looking at it. Close the book and write what you remember, answer a question, or explain a concept aloud. The effort of retrieving it is what strengthens the memory.',
      },
      {
        t: 'ul',
        items: [
          'Turn headings into questions and answer them without notes.',
          'Do practice questions before re-reading the chapter.',
          'Explain a topic to a friend or to yourself as if teaching it.',
        ],
      },
      { t: 'h2', text: 'Spaced repetition' },
      {
        t: 'p',
        text: 'Spaced repetition means revisiting a topic at growing gaps: the next day, then after a few days, then after a week or two. Short, spaced sessions beat one long cram, because you review things just as you start to forget them.',
      },
      { t: 'h2', text: 'Putting them together' },
      {
        t: 'ol',
        items: [
          'Learn a chapter and answer questions on it the same day.',
          'Test yourself again after one to two days, then after a week.',
          'Spend the most time on the questions you got wrong.',
        ],
      },
      {
        t: 'p',
        text: 'This is how an AI tutor can help: it can ask you questions, mark your answers, and show you what to revisit. But the method works with just a notebook and the NCERT textbook.',
      },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
