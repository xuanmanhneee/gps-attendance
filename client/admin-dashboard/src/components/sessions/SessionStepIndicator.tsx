import { MdCheck } from 'react-icons/md';

export type SessionStep = {
  title: string;
  description: string;
};

type SessionStepIndicatorProps = {
  steps: readonly SessionStep[];
  /** Chỉ số (0-based) của bước đang mở; các bước nhỏ hơn được coi là đã qua. */
  currentStep: number;
};

/**
 * Chỉ báo tiến trình của wizard tạo phiên.
 *
 * Thuần hiển thị: page quyết định bước hiện tại, component chỉ đánh dấu bước
 * đang mở và các bước đã hoàn thành.
 */
export const SessionStepIndicator = ({
  steps,
  currentStep,
}: SessionStepIndicatorProps) => (
  <ol className="mb-5 flex flex-wrap gap-3">
    {steps.map((step, index) => {
      const isActive = index === currentStep;
      const isCompleted = index < currentStep;
      const isHighlighted = isActive || isCompleted;

      return (
        <li
          key={step.title}
          aria-current={isActive ? 'step' : undefined}
          className={`flex flex-1 items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
            isActive
              ? 'border-accent-strong bg-accent-soft'
              : 'border-line bg-surface'
          }`}
        >
          <span
            aria-hidden="true"
            className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
              isHighlighted
                ? 'bg-accent-strong text-white'
                : 'bg-surface-subtle text-muted'
            }`}
          >
            {isCompleted ? <MdCheck className="text-[13px]" /> : index + 1}
          </span>

          <span className="min-w-0">
            <span className="block text-[12px] font-bold text-ink">
              {step.title}
            </span>
            <span className="mt-0.5 block text-[11px] text-muted">
              {step.description}
            </span>
          </span>
        </li>
      );
    })}
  </ol>
);
