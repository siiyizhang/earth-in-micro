import { useState } from "react";
import courses from "./courses.json";
import { Modal } from "./Shared";

export default function Learn({ userId }: { userId: string }) {
  const [selected, setSelected] = useState<(typeof courses)[number] | null>(
      null,
    ),
    [step, setStep] = useState(0);
  const key = `eureka.web.courses.${userId}`;
  const [completed, setCompleted] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "[]");
    } catch {
      return [];
    }
  });
  const [error, setError] = useState("");
  const instruction = selected?.steps?.[step];
  return (
    <section className="micro-content">
      <span className="micro-eyebrow">CURIOSITY STARTS SMALL</span>
      <h1>Learn</h1>
      <p>Choose an exploration. Short activities for looking closer.</p>
      <div className="micro-grid">
        {courses.map((course, i) => (
          <button
            className="micro-card micro-course"
            key={course.id}
            onClick={() => {
              setSelected(course);
              setStep(0);
            }}
          >
            <span className="micro-course-number">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h2>{course.title}</h2>
            <p>{course.detail}</p>
            <small>
              {completed.includes(course.id)
                ? "✓ Completed on this browser"
                : course.steps
                  ? `${course.steps.length} preparation steps →`
                  : "Coming soon"}
            </small>
          </button>
        ))}
      </div>
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <p>{selected.introduction ?? selected.detail}</p>
          {selected.materials && (
            <p>
              <strong>Materials:</strong> {selected.materials}
            </p>
          )}
          {instruction ? (
            <>
              <span className="micro-eyebrow">
                STEP {step + 1} / {selected.steps!.length}
              </span>
              <h3>{instruction.title}</h3>
              <p>{instruction.text}</p>
              {instruction.noteText && (
                <p>
                  <strong>{instruction.noteTitle}</strong>{" "}
                  {instruction.noteText}
                </p>
              )}
              <div className="micro-row">
                <button disabled={step === 0} onClick={() => setStep(step - 1)}>
                  Back
                </button>
                <button
                  className="micro-primary"
                  onClick={() => {
                    if (step < selected.steps!.length - 1) setStep(step + 1);
                    else {
                      const next = [...new Set([...completed, selected.id])];
                      try {
                        localStorage.setItem(key, JSON.stringify(next));
                        setCompleted(next);
                        setSelected(null);
                      } catch {
                        setError(
                          "Browser storage is unavailable; progress could not be saved.",
                        );
                      }
                    }
                  }}
                >
                  {step < selected.steps!.length - 1
                    ? "Continue"
                    : "Complete exploration"}
                </button>
              </div>
              <p>
                Follow along with your own microscope and record your
                discoveries in Gallery. Course progress is saved on this
                browser.
              </p>
            </>
          ) : (
            <p>Lessons and activities are coming soon, as in the Eureka App.</p>
          )}
          {error && <p role="alert">{error}</p>}
        </Modal>
      )}
    </section>
  );
}
