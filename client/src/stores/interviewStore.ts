import { create } from 'zustand';
import { Interview, MCQQuestion, CodingProblem, CaseStudy } from '../types';

interface InterviewState {
    currentInterview: Interview | null;
    currentRound: number;
    aptitudeQuestions: MCQQuestion[];
    codingProblems: CodingProblem[];
    caseStudies: CaseStudy[];
    answers: Record<string, string>;
    timeRemaining: number;
    isTimerRunning: boolean;
    cheatWarnings: number;

    setInterview: (interview: Interview) => void;
    setCurrentRound: (round: number) => void;
    setAptitudeQuestions: (questions: MCQQuestion[]) => void;
    setCodingProblems: (problems: CodingProblem[]) => void;
    setCaseStudies: (studies: CaseStudy[]) => void;
    setAnswer: (questionId: string, answer: string) => void;
    setTimeRemaining: (time: number) => void;
    setTimerRunning: (running: boolean) => void;
    addCheatWarning: () => void;
    reset: () => void;
}

export const useInterviewStore = create<InterviewState>((set) => ({
    currentInterview: null,
    currentRound: 0,
    aptitudeQuestions: [],
    codingProblems: [],
    caseStudies: [],
    answers: {},
    timeRemaining: 0,
    isTimerRunning: false,
    cheatWarnings: 0,

    setInterview: (interview) => set({ currentInterview: interview }),
    setCurrentRound: (round) => set({ currentRound: round }),
    setAptitudeQuestions: (questions) => set({ aptitudeQuestions: questions }),
    setCodingProblems: (problems) => set({ codingProblems: problems }),
    setCaseStudies: (studies) => set({ caseStudies: studies }),
    setAnswer: (questionId, answer) =>
        set((state) => ({ answers: { ...state.answers, [questionId]: answer } })),
    setTimeRemaining: (time) => set({ timeRemaining: time }),
    setTimerRunning: (running) => set({ isTimerRunning: running }),
    addCheatWarning: () =>
        set((state) => ({ cheatWarnings: state.cheatWarnings + 1 })),
    reset: () =>
        set({
            currentInterview: null,
            currentRound: 0,
            aptitudeQuestions: [],
            codingProblems: [],
            caseStudies: [],
            answers: {},
            timeRemaining: 0,
            isTimerRunning: false,
            cheatWarnings: 0,
        }),
}));
