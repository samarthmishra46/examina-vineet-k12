export type ClassLevel = 10 | 12;
export type Subject = 'maths' | 'science' | 'physics' | 'chemistry' | 'biology';

export const CLASS_LEVELS: ClassLevel[] = [10, 12];

export const SUBJECT_LABEL: Record<Subject, string> = {
  maths: 'Maths',
  science: 'Science',
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
};

export const SUBJECTS_BY_CLASS: Record<ClassLevel, Subject[]> = {
  10: ['maths', 'science'],
  12: ['maths', 'physics', 'chemistry', 'biology'],
};

/** NCERT chapter lists (rationalised syllabus). Index + 1 is the NCERT chapter number. */
export const NCERT_CHAPTERS: Record<ClassLevel, Partial<Record<Subject, string[]>>> = {
  10: {
    maths: [
      'Real Numbers',
      'Polynomials',
      'Pair of Linear Equations in Two Variables',
      'Quadratic Equations',
      'Arithmetic Progressions',
      'Triangles',
      'Coordinate Geometry',
      'Introduction to Trigonometry',
      'Some Applications of Trigonometry',
      'Circles',
      'Areas Related to Circles',
      'Surface Areas and Volumes',
      'Statistics',
      'Probability',
    ],
    science: [
      'Chemical Reactions and Equations',
      'Acids, Bases and Salts',
      'Metals and Non-metals',
      'Carbon and its Compounds',
      'Life Processes',
      'Control and Coordination',
      'How do Organisms Reproduce?',
      'Heredity',
      'Light – Reflection and Refraction',
      'The Human Eye and the Colourful World',
      'Electricity',
      'Magnetic Effects of Electric Current',
      'Our Environment',
    ],
  },
  12: {
    maths: [
      'Relations and Functions',
      'Inverse Trigonometric Functions',
      'Matrices',
      'Determinants',
      'Continuity and Differentiability',
      'Application of Derivatives',
      'Integrals',
      'Application of Integrals',
      'Differential Equations',
      'Vector Algebra',
      'Three Dimensional Geometry',
      'Linear Programming',
      'Probability',
    ],
    physics: [
      'Electric Charges and Fields',
      'Electrostatic Potential and Capacitance',
      'Current Electricity',
      'Moving Charges and Magnetism',
      'Magnetism and Matter',
      'Electromagnetic Induction',
      'Alternating Current',
      'Electromagnetic Waves',
      'Ray Optics and Optical Instruments',
      'Wave Optics',
      'Dual Nature of Radiation and Matter',
      'Atoms',
      'Nuclei',
      'Semiconductor Electronics: Materials, Devices and Simple Circuits',
    ],
    chemistry: [
      'Solutions',
      'Electrochemistry',
      'Chemical Kinetics',
      'The d- and f-Block Elements',
      'Coordination Compounds',
      'Haloalkanes and Haloarenes',
      'Alcohols, Phenols and Ethers',
      'Aldehydes, Ketones and Carboxylic Acids',
      'Amines',
      'Biomolecules',
    ],
    biology: [
      'Sexual Reproduction in Flowering Plants',
      'Human Reproduction',
      'Reproductive Health',
      'Principles of Inheritance and Variation',
      'Molecular Basis of Inheritance',
      'Evolution',
      'Human Health and Disease',
      'Microbes in Human Welfare',
      'Biotechnology: Principles and Processes',
      'Biotechnology and its Applications',
      'Organisms and Populations',
      'Ecosystem',
      'Biodiversity and Conservation',
    ],
  },
};

type CurriculumFields = {
  board?: string | null;
  classLevel?: number | null;
  subject?: string | null;
  ncertChapterNo?: number | null;
};

/** "CBSE Class 10 · Maths" — null for legacy chapters without board metadata. */
export function examLabel(c: CurriculumFields): string | null {
  if (!c.classLevel || !c.subject) return null;
  const subject = SUBJECT_LABEL[c.subject as Subject] ?? c.subject;
  return `${c.board ?? 'CBSE'} Class ${c.classLevel} · ${subject}`;
}

/** "Class 10 · Maths · NCERT Ch 4" */
export function ncertLabel(c: CurriculumFields): string | null {
  if (!c.classLevel || !c.subject) return null;
  const subject = SUBJECT_LABEL[c.subject as Subject] ?? c.subject;
  const ch = c.ncertChapterNo ? ` · NCERT Ch ${c.ncertChapterNo}` : '';
  return `Class ${c.classLevel} · ${subject}${ch}`;
}

export interface SyllabusPage {
  slug: string; // e.g. "cbse-class-10-maths"
  classLevel: ClassLevel;
  subject: Subject;
  chapters: string[];
}

export function syllabusSlug(classLevel: ClassLevel, subject: Subject): string {
  return `cbse-class-${classLevel}-${subject}`;
}

/** Every class + subject combination that has an NCERT chapter list. */
export function allSyllabusPages(): SyllabusPage[] {
  const pages: SyllabusPage[] = [];
  for (const classLevel of [10, 12] as const) {
    for (const subject of SUBJECTS_BY_CLASS[classLevel]) {
      const chapters = NCERT_CHAPTERS[classLevel][subject];
      if (chapters?.length) {
        pages.push({ slug: syllabusSlug(classLevel, subject), classLevel, subject, chapters });
      }
    }
  }
  return pages;
}

export function getSyllabusPage(slug: string): SyllabusPage | undefined {
  return allSyllabusPages().find((p) => p.slug === slug);
}

/**
 * Mongo filter for the chapters of a class + subject, using the admin-entered `ncertClass`
 * ("Class 10") and `ncertSubject` ("Mathematics") strings on Chapter. There is no plain
 * "Science" option in the chapter form, so Class 10 Science also matches Physics, Chemistry
 * and Biology chapters.
 */
export function chapterFilterFor(classLevel: ClassLevel, subject: Subject) {
  const names: Record<Subject, string[]> = {
    maths: ['Mathematics', 'Maths', 'Math'],
    science: ['Science', 'Physics', 'Chemistry', 'Biology'],
    physics: ['Physics'],
    chemistry: ['Chemistry'],
    biology: ['Biology'],
  };
  return {
    ncertClass: { $regex: `^class\\s*${classLevel}$`, $options: 'i' },
    ncertSubject: { $in: names[subject].map((n) => new RegExp(`^${n}$`, 'i')) },
  };
}
