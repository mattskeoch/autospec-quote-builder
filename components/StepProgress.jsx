'use client';
export default function StepProgress({ steps, stepIndex, setStepIndex }){
  return (
    <ol className="mb-4 flex flex-wrap gap-2">
      {steps.map((s,i)=>(
        <li key={s.id}>
          <button
            className={"btn " + (i===stepIndex ? "ring-2 ring-slate-400" : "")}
            onClick={()=>setStepIndex(i)}
            aria-current={i===stepIndex?'step':undefined}
          >
            {i+1}. {s.title}
          </button>
        </li>
      ))}
    </ol>
  );
}
