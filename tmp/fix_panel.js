const fs = require('fs');
const filePath = 'd:/Silicone Connnect/Project/noc/noc_activities/noc-activities-silicone-connect/src/components/noc/NocCallCenterPanel.tsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
console.log('Total lines before fix:', lines.length);

const correctSection = `  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant={variant} className={\`h-7 w-7 \${className}\`} onClick={onClick} disabled={disabled}>
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function TaskStepper({ status }: { status: TaskStatus }) {
  const currentIndex = TASK_STEPS.indexOf(status);
  return (
    <div className="mt-2 flex items-center gap-0">
      {TASK_STEPS.map((step, i) => {
        const filled = i <= currentIndex;
        const done = status === 'DONE';
        const active = step === status;
        return (
          <Fragment key={step}>
            <div className="flex min-w-0 flex-col items-center gap-0.5">
              <div className={\`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all \${done ? 'border-emerald-600 bg-emerald-600 text-white' : filled ? 'border-cyan-600 bg-cyan-600 text-white' : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800'} \${active ? 'ring-2 ring-cyan-400 ring-offset-1' : ''}\`}>
                {done && i === 2 ? <Check className="h-2.5 w-2.5" /> : filled ? <Circle className="h-1.5 w-1.5 fill-current" /> : <Circle className="h-1.5 w-1.5" />}
              </div>
              <span className="whitespace-nowrap text-[9px] text-slate-500 dark:text-slate-400">{TASK_STEP_LABELS[step]}</span>
            </div>
            {i < TASK_STEPS.length - 1 && (
              <div className={\`mb-3 h-px min-w-4 flex-1 transition-colors \${i < currentIndex ? 'bg-cyan-600' : 'bg-slate-200 dark:bg-slate-700'}\`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}`;

// Replace lines 222-335 (indices 221-334)
const before = lines.slice(0, 221).join('\n');
const after = lines.slice(335).join('\n');
const newContent = before + '\n' + correctSection + '\n' + after;
fs.writeFileSync(filePath, newContent, 'utf8');
const newLines = newContent.split('\n');
console.log('Total lines after fix:', newLines.length);
console.log('Lines 219-265:');
newLines.slice(218, 265).forEach((l, i) => console.log((219+i)+':', l));
