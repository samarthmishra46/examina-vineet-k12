export interface Faq {
  q: string;
  a: string;
}

/** Shared by the /faq page, the homepage FAQ section and the FAQPage JSON-LD. */
export const FAQS: Faq[] = [
  {
    q: 'What is Examina?',
    a: 'Examina is an AI tutor for school board exam preparation, built around the NCERT textbooks. It explains chapters on a live whiteboard with a spoken walkthrough, lets you ask doubts after each lesson, and gives you practice questions with feedback.',
  },
  {
    q: 'Which classes and subjects does Examina cover?',
    a: 'Examina is for Class 6 to 12 students on CBSE, ICSE and state boards, with board-exam prep focused on Class 10 Maths and Science and Class 12 Maths, Physics, Chemistry and Biology from the NCERT textbooks. Chapters are added as they are published, so check the dashboard for what is available.',
  },
  {
    q: 'Is the content based on NCERT?',
    a: 'Yes. Lessons and questions are built from the NCERT textbook for your class and use NCERT terminology and worked-example style, because CBSE board papers are set around the NCERT syllabus.',
  },
  {
    q: 'How does the AI tutor teach?',
    a: 'Each chapter is split into short sections. For each section the tutor writes on a digital whiteboard while explaining out loud and works through examples step by step. At the end of the lesson you can ask a doubt, and the answer appears on the same board.',
  },
  {
    q: 'Does it help with board-style written answers?',
    a: 'Yes. For short and long answer questions you type your answer and it is marked against a step-wise marking scheme, with the marks you earned, the points you missed, feedback on how to score full marks, and a model answer.',
  },
  {
    q: 'What happens when I get a practice question wrong?',
    a: 'Examina works out what kind of mistake it was, such as a formula mix-up, a sign error, a calculation slip or a misread question. It explains it, gives you a quick memory hook, and asks a similar easier question so you can recover straight away.',
  },
  {
    q: 'Does the difficulty adapt to me?',
    a: 'In MCQ practice, the difficulty goes up after consecutive correct answers and comes down after a wrong one, so you practise at a level that suits you.',
  },
  {
    q: 'Are previous-year board questions included?',
    a: 'Previous-year and sample-paper questions are imported, reviewed by an admin and mapped to the section they test, so a section can show which years the topic was asked in. Coverage grows as papers are added.',
  },
  {
    q: 'Can Examina replace my teacher or coaching?',
    a: 'It is designed as a patient, always-available tutor for revision and doubt-clearing, not a replacement for school or your teachers. Use it alongside your NCERT textbook and school work.',
  },
  {
    q: 'Is Examina free?',
    a: 'You sign in with Google and can start with a 3-day free trial, which is then ₹999 per month and can be cancelled any time. The Subscribe page in the app shows the current plan and price.',
  },
  {
    q: 'Is Examina affiliated with CBSE or NCERT?',
    a: 'No. Examina is an independent study tool. Always confirm the current syllabus, exam pattern and dates on the official CBSE website.',
  },
  {
    q: 'Can the AI make mistakes?',
    a: 'Yes, any AI can. Check important answers against your NCERT textbook and ask your teacher if something looks wrong. Imported past-paper answers are reviewed by an admin before students see them.',
  },
];
