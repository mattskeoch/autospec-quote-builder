"use client";

export default function StepHeader({ steps = [], stepIndex = 0, className = "" }) {
	const total = Math.max(steps.length, 1);
	const current = Math.min(stepIndex + 1, total);

	// Progress should start at 0 on the first step
	const denom = Math.max(total - 1, 1);
	const pct = Math.max(0, Math.min(100, (stepIndex / denom) * 100)); // 0%..100%

	return (
		<div
			className={`sticky top-0 z-30 border-b border-[var(--clr-border)] bg-[var(--clr-bg)]/80 backdrop-blur pointer-events-none ${className}`}
		>
			<div className='mx-auto w-full max-w-[var(--maxw)] px-[var(--pad)] py-3'>
				{/* Progress bar */}
				<div className='relative h-3 rounded-full bg-[var(--clr-border)]'>
					<div
						className='absolute left-0 top-0 h-3 rounded-full bg-[var(--clr-primary)]'
						style={{ width: `${pct}%` }}
						aria-hidden
					/>
					{/* Step badge */}
					<div
						className='absolute -top-3 h-8 w-8 -translate-x-1/2 rounded-full bg-[var(--clr-primary)] text-white
                       flex items-center justify-center text-xs font-semibold shadow'
						style={{ left: `${pct}%` }}
						aria-hidden
					>
						{current}/{total}
					</div>
				</div>

				{/* Label */}
				<div className='mt-3'>
					<div className='text-xs text-[var(--clr-muted)]'>
						Step {current} of {total}
					</div>
					<div className='text-lg font-semibold leading-tight'>{steps[stepIndex]?.title ?? ""}</div>
				</div>
			</div>
		</div>
	);
}
