export type MaterialType =
  | 'Flashcards'
  | 'Quiz'
  | 'Study Material';

export type ReviewerMaterial = {
  id: string;
  title: string;
  type: MaterialType;
  info: string;
  mastery?: number;
};

export type Reviewer = {
  id: string;
  name: string;
  subject: string;
  description: string;
  mastery: number;
  dueCards: number;
  materials: ReviewerMaterial[];
};

export const reviewers: Reviewer[] = [
  {
    id: '1',
    name: 'IT 26',
    subject: 'Human Computer Interaction',
    description: 'Reviewer for Human Computer Interaction.',
    mastery: 72,
    dueCards: 12,
    materials: [
      {
        id: 'material-1',
        title: 'Week 1 – HCI Intro',
        type: 'Flashcards',
        info: '24 cards',
        mastery: 90,
      },
      {
        id: 'material-2',
        title: "Week 2 – Norman's Model",
        type: 'Quiz',
        info: '15 questions',
        mastery: 60,
      },
      {
        id: 'material-3',
        title: 'Week 3 – Affordances',
        type: 'Flashcards',
        info: '18 cards',
        mastery: 40,
      },
      {
        id: 'material-4',
        title: 'Scanned Notes Batch 1',
        type: 'Study Material',
        info: '6 pages',
      },
    ],
  },
  {
    id: '2',
    name: 'IT 25',
    subject: 'Database Systems',
    description: 'Database concepts and SQL reviewer.',
    mastery: 45,
    dueCards: 8,
    materials: [
      {
        id: 'material-5',
        title: 'Database Fundamentals',
        type: 'Flashcards',
        info: '20 cards',
        mastery: 55,
      },
      {
        id: 'material-6',
        title: 'SQL Basics',
        type: 'Quiz',
        info: '10 questions',
        mastery: 35,
      },
    ],
  },
  {
    id: '3',
    name: 'Physics',
    subject: 'General Physics',
    description: 'Physics formulas and concepts.',
    mastery: 0,
    dueCards: 0,
    materials: [],
  },
];

export function getReviewerById(id?: string) {
  return reviewers.find(
    reviewer => reviewer.id === id
  );
}