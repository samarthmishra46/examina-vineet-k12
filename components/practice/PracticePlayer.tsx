'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { DiagnosisResult } from '@/lib/teaching/schemas';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SafeQuestion {
  _id: string;
  text: string;
  options: string[];
  difficulty: 1 | 2 | 3;
  timeExpectedSeconds: number;
  conceptTags: string[];
}

interface SubmitResult {
  isCorrect: boolean;
  correctIndex: number;
  solution: string;
}

type PracticeState = 'loading' | 'answering' | 'correct' | 'wrong' | 'diagnosing' | 'micro' | 'done';

const DIFFICULTY_LABELS: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'text-green-600 bg-green-50 border-green-200',
  2: 'text-amber-600 bg-amber-50 border-amber-200',
  3: 'text-red-600 bg-red-50 border-red-200',
};
const LETTERS = ['A', 'B', 'C', 'D'];

// Aryan Sir reactions to score on session complete
function sessionReaction(correct: number, total: number): string {
  const pct = total === 0 ? 0 : correct / total;
  if (pct === 1) return `${correct}/${total} — Perfect score! Bhai, kya padha hai tune. 🔥`;
  if (pct >= 0.8) return `${correct}/${total} — Almost perfect. Ek baar aur karo, full marks milenge.`;
  if (pct >= 0.6) return `${correct}/${total} — Solid start. The mistakes show where to focus next.`;
  return `${correct}/${total} — Thoda aur mehnat chahiye. Dekh ke fix karte hain.`;
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PracticePlayer({
  sectionId,
  sectionTitle,
  chapterId,
  chapterTitle,
}: {
  sectionId: string;
  sectionTitle: string;
  chapterId: string;
  chapterTitle: string;
}) {
  const [questions, setQuestions] = useState<SafeQuestion[]>([]);
  const [state, setState] = useState<PracticeState>('loading');
  const [error, setError] = useState<string | null>(null);

  // Adaptive difficulty state
  const [currentDifficulty, setCurrentDifficulty] = useState<1 | 2 | 3>(1);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);

  // Per-question state
  const [queueIndex, setQueueIndex] = useState(0); // index into the ordered question list
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [microSelected, setMicroSelected] = useState<number | null>(null);
  const [microCorrect, setMicroCorrect] = useState<boolean | null>(null);

  // Timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  // Session stats
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);

  // ── Load questions ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/practice/questions?sectionId=${sectionId}`)
      .then((r) => r.json())
      .then((data: { questions: SafeQuestion[]; error?: string }) => {
        if (data.error || !data.questions?.length) {
          setError(data.error ?? 'No questions available yet. Ask your admin to generate them.');
          setState('done');
          return;
        }
        setQuestions(data.questions);
        setState('answering');
        startTimer();
      })
      .catch(() => {
        setError('Failed to load questions.');
        setState('done');
      });
    return () => stopTimer();
  }, [sectionId]);

  // ── Timer helpers ───────────────────────────────────────────────────────────
  function startTimer() {
    startTimeRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function getElapsedSeconds() {
    return Math.floor((Date.now() - startTimeRef.current) / 1000);
  }

  // ── Get next question respecting adaptive difficulty ────────────────────────
  const getNextQuestion = useCallback(
    (fromIndex: number, difficulty: 1 | 2 | 3): SafeQuestion | null => {
      // Try to find the next question at the current difficulty
      for (let i = fromIndex; i < questions.length; i++) {
        const q = questions[i];
        if (q && q.difficulty === difficulty) return q;
      }
      // Difficulty pool exhausted — fall back to any remaining question
      const fallback = questions[fromIndex];
      return fallback ?? null;
    },
    [questions],
  );

  const currentQuestion: SafeQuestion | null =
    state !== 'loading' && state !== 'done' && questions.length > 0
      ? getNextQuestion(queueIndex, currentDifficulty) ?? null
      : null;

  // ── Submit answer ───────────────────────────────────────────────────────────
  async function handleSubmit(optionIndex: number) {
    if (!currentQuestion || state !== 'answering') return;
    setSelectedIndex(optionIndex);
    stopTimer();
    const timeTaken = getElapsedSeconds();

    const res = await fetch('/api/practice/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: currentQuestion._id,
        selectedIndex: optionIndex,
        timeTakenSeconds: timeTaken,
      }),
    });
    const result = (await res.json()) as SubmitResult;
    setSubmitResult(result);
    setSessionTotal((t) => t + 1);

    if (result.isCorrect) {
      setSessionCorrect((c) => c + 1);
      const newConsecutive = consecutiveCorrect + 1;
      setConsecutiveCorrect(newConsecutive);
      if (newConsecutive >= 2 && currentDifficulty < 3) {
        setCurrentDifficulty((d) => Math.min(d + 1, 3) as 1 | 2 | 3);
        setConsecutiveCorrect(0);
      }
      setState('correct');
    } else {
      setConsecutiveCorrect(0);
      if (currentDifficulty > 1) {
        setCurrentDifficulty((d) => Math.max(d - 1, 1) as 1 | 2 | 3);
      }
      setState('wrong');
      // Fire diagnosis in background immediately
      triggerDiagnosis(currentQuestion._id, optionIndex);
    }
  }

  async function triggerDiagnosis(questionId: string, optionIndex: number) {
    setState('diagnosing');
    try {
      const res = await fetch('/api/practice/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, selectedIndex: optionIndex }),
      });
      const data = (await res.json()) as DiagnosisResult;
      setDiagnosis(data);
      setState('wrong');
    } catch {
      // Diagnosis failed — go straight to next question
      advanceToNext();
    }
  }

  // ── Micro question ──────────────────────────────────────────────────────────
  function handleMicroSubmit(optionIndex: number) {
    if (!diagnosis) return;
    setMicroSelected(optionIndex);
    const correct = optionIndex === diagnosis.microQuestion.correctIndex;
    setMicroCorrect(correct);
    setState('micro');

    // Save the recovery result
    if (currentQuestion) {
      void fetch('/api/practice/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion._id,
          selectedIndex: submitResult?.correctIndex ?? 0,
          timeTakenSeconds: 0,
          recoveredCorrectly: correct,
          errorType: diagnosis.errorType,
        }),
      });
    }
  }

  // ── Advance to next question ────────────────────────────────────────────────
  function advanceToNext() {
    setSelectedIndex(null);
    setSubmitResult(null);
    setDiagnosis(null);
    setMicroSelected(null);
    setMicroCorrect(null);

    const nextIndex = queueIndex + 1;
    if (nextIndex >= questions.length) {
      setState('done');
      return;
    }
    setQueueIndex(nextIndex);
    setState('answering');
    startTimer();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm text-inkMuted">
        Loading questions…
      </div>
    );
  }

  if (state === 'done') {
    return (
      <SessionComplete
        correct={sessionCorrect}
        total={sessionTotal}
        error={error}
        chapterId={chapterId}
        sectionId={sectionId}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <SessionComplete
        correct={sessionCorrect}
        total={sessionTotal}
        chapterId={chapterId}
        sectionId={sectionId}
      />
    );
  }

  const questionNumber = queueIndex + 1;
  const totalQuestions = questions.length;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between gap-4">
        <Link
          href={`/chapter/${chapterId}`}
          className="text-sm text-inkMuted transition-colors duration-std ease-std hover:text-ink"
        >
          ← {chapterTitle}
        </Link>
        <p className="text-sm text-inkMuted">Practice · {sectionTitle}</p>
      </header>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-inkMuted">
          <span>
            Question {questionNumber} of {totalQuestions}
          </span>
          <span>
            {sessionCorrect}/{sessionTotal} correct
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-accentMuted">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${((queueIndex) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-xl border border-line bg-surface shadow-sm">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <span
            className={`rounded-full border px-3 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[currentQuestion.difficulty]}`}
          >
            {DIFFICULTY_LABELS[currentQuestion.difficulty]}
          </span>
          <span className="text-xs tabular-nums text-inkMuted">
            {formatTime(elapsed)}
            {currentQuestion.timeExpectedSeconds > 0 && (
              <span className="ml-1 opacity-50">/ {currentQuestion.timeExpectedSeconds}s</span>
            )}
          </span>
        </div>

        {/* Question text */}
        <div className="px-6 py-5">
          <p className="text-base leading-relaxed text-ink">{currentQuestion.text}</p>
        </div>

        {/* Options */}
        <div className="space-y-3 px-6 pb-6">
          {currentQuestion.options.map((opt, i) => (
            <OptionButton
              key={i}
              letter={LETTERS[i] ?? String(i)}
              text={opt}
              state={getOptionState(i, selectedIndex, submitResult)}
              disabled={state !== 'answering'}
              onClick={() => handleSubmit(i)}
            />
          ))}
        </div>

        {/* Correct result */}
        {state === 'correct' && submitResult && (
          <CorrectPanel solution={submitResult.solution} onNext={advanceToNext} />
        )}

        {/* Diagnosing spinner */}
        {state === 'diagnosing' && (
          <div className="border-t border-line px-6 py-5 text-sm text-inkMuted">
            Aryan Sir is figuring out what happened…
          </div>
        )}

        {/* Wrong + diagnosis */}
        {(state === 'wrong' || state === 'micro') && submitResult && (
          <WrongPanel
            diagnosis={diagnosis}
            solution={submitResult.solution}
            microSelected={microSelected}
            microCorrect={microCorrect}
            onMicroSubmit={handleMicroSubmit}
            onNext={advanceToNext}
          />
        )}
      </div>
    </div>
  );
}

// ─── Option button ─────────────────────────────────────────────────────────────

type OptionState = 'idle' | 'selected-correct' | 'selected-wrong' | 'revealed-correct' | 'disabled';

function getOptionState(
  index: number,
  selectedIndex: number | null,
  result: SubmitResult | null,
): OptionState {
  if (result === null || selectedIndex === null) return 'idle';
  if (index === result.correctIndex) return 'revealed-correct';
  if (index === selectedIndex && !result.isCorrect) return 'selected-wrong';
  return 'disabled';
}

function OptionButton({
  letter,
  text,
  state,
  disabled,
  onClick,
}: {
  letter: string;
  text: string;
  state: OptionState;
  disabled: boolean;
  onClick: () => void;
}) {
  const baseClass =
    'w-full flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all duration-150';

  const stateClass = {
    idle: 'border-line bg-surface text-ink hover:border-accent hover:bg-accentMuted cursor-pointer',
    'selected-correct': 'border-green-400 bg-green-50 text-green-800 cursor-default',
    'selected-wrong': 'border-red-400 bg-red-50 text-red-800 cursor-default',
    'revealed-correct': 'border-green-400 bg-green-50 text-green-800 cursor-default',
    disabled: 'border-line bg-surface text-inkMuted/50 cursor-default',
  }[state];

  return (
    <button
      type="button"
      className={`${baseClass} ${stateClass}`}
      disabled={disabled && state === 'idle'}
      onClick={onClick}
    >
      <span className="mt-0.5 shrink-0 text-xs font-semibold">{letter}</span>
      <span className="leading-relaxed">{text}</span>
      {state === 'selected-correct' && <span className="ml-auto shrink-0">✓</span>}
      {state === 'revealed-correct' && <span className="ml-auto shrink-0">✓</span>}
      {state === 'selected-wrong' && <span className="ml-auto shrink-0">✗</span>}
    </button>
  );
}

// ─── Correct panel ─────────────────────────────────────────────────────────────

function CorrectPanel({ solution, onNext }: { solution: string; onNext: () => void }) {
  return (
    <div className="border-t border-green-100 bg-green-50 px-6 py-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base font-semibold text-green-700">Correct!</span>
        <span className="text-sm text-green-600">Aryan Sir approves.</span>
      </div>
      <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-green-800">{solution}</p>
      <Button onClick={onNext}>Next question →</Button>
    </div>
  );
}

// ─── Wrong + diagnosis panel ───────────────────────────────────────────────────

function WrongPanel({
  diagnosis,
  solution,
  microSelected,
  microCorrect,
  onMicroSubmit,
  onNext,
}: {
  diagnosis: DiagnosisResult | null;
  solution: string;
  microSelected: number | null;
  microCorrect: boolean | null;
  onMicroSubmit: (i: number) => void;
  onNext: () => void;
}) {
  if (!diagnosis) {
    // Still waiting for diagnosis
    return (
      <div className="border-t border-line px-6 py-5">
        <p className="text-sm text-inkMuted">Getting Aryan Sir's take…</p>
      </div>
    );
  }

  return (
    <div className="border-t border-red-100 bg-red-50 px-6 py-5 space-y-5">
      {/* Error label */}
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-red-200 bg-white px-3 py-0.5 text-xs font-medium text-red-700">
          {diagnosis.errorLabel}
        </span>
        <span className="text-sm font-medium text-red-700">Here&apos;s what happened:</span>
      </div>

      {/* Explanation */}
      <p className="text-sm leading-relaxed text-red-900">{diagnosis.explanation}</p>

      {/* Memory hook */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Remember this</p>
        <p className="mt-1 text-sm font-medium text-amber-900">{diagnosis.memoryHook}</p>
      </div>

      {/* Solution */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-red-700 hover:underline">
          See full solution
        </summary>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-red-800">{solution}</p>
      </details>

      {/* Micro question */}
      {microCorrect === null && (
        <div className="rounded-lg border border-red-200 bg-white px-4 py-4 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-inkMuted">
            Quick check — same concept, different question
          </p>
          <p className="text-sm leading-relaxed text-ink">{diagnosis.microQuestion.text}</p>
          <div className="space-y-2">
            {diagnosis.microQuestion.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onMicroSubmit(i)}
                disabled={microSelected !== null}
                className={`w-full flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all duration-150 ${
                  microSelected === null
                    ? 'border-line bg-surface text-ink hover:border-accent hover:bg-accentMuted cursor-pointer'
                    : i === diagnosis.microQuestion.correctIndex
                      ? 'border-green-400 bg-green-50 text-green-800'
                      : i === microSelected
                        ? 'border-red-400 bg-red-50 text-red-800'
                        : 'border-line bg-surface text-inkMuted/50'
                }`}
              >
                <span className="mt-0.5 shrink-0 text-xs font-semibold">{LETTERS[i]}</span>
                <span className="leading-relaxed">{opt}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Micro result */}
      {microCorrect !== null && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${microCorrect ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}
        >
          {microCorrect
            ? 'Got it! You understand it now. Keep going.'
            : 'Not quite — but you saw the explanation. It will click with practice.'}
        </div>
      )}

      {/* Next button — only shown after micro attempted or skipped */}
      {(microCorrect !== null) && (
        <Button onClick={onNext}>Next question →</Button>
      )}

      {/* Skip diagnosis (for students who just want to move on) */}
      {microCorrect === null && microSelected === null && (
        <button
          type="button"
          onClick={onNext}
          className="text-xs text-inkMuted hover:text-ink transition-colors"
        >
          Skip explanation
        </button>
      )}
    </div>
  );
}

// ─── Session complete ──────────────────────────────────────────────────────────

function SessionComplete({
  correct,
  total,
  error,
  chapterId,
  sectionId,
}: {
  correct: number;
  total: number;
  error?: string | null;
  chapterId: string;
  sectionId: string;
}) {
  return (
    <div className="mx-auto max-w-lg px-6 py-16 text-center">
      <p className="font-display text-3xl text-ink">
        {error ? 'No questions yet' : 'Practice complete'}
      </p>
      {error ? (
        <p className="mt-4 text-sm text-inkMuted">{error}</p>
      ) : (
        <>
          <p className="mt-4 text-lg font-medium text-ink">{sessionReaction(correct, total)}</p>
          <p className="mt-2 text-sm text-inkMuted">
            {correct} correct out of {total} questions
          </p>
        </>
      )}
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link href={`/chapter/${chapterId}`}>
          <Button variant="ghost">Back to chapter</Button>
        </Link>
        <Link href={`/learn/${sectionId}`}>
          <Button>Watch lesson again</Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}
