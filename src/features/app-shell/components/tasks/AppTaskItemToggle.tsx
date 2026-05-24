import { Checkbox } from '@/components/ui/checkbox';

type AppTaskItemToggleProps = {
  checked: boolean;
  onToggle: (checked: boolean) => void;
};

export function AppTaskItemToggle({ checked, onToggle }: AppTaskItemToggleProps) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(nextChecked) => onToggle(Boolean(nextChecked))}
      className="mt-1"
    />
  );
}
