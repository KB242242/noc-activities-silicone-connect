import type { TicketCountryOption } from '@/features/app-shell/types';

export function renderTicketCountryLabel(country: TicketCountryOption) {
  return (
    <span className="inline-flex items-center gap-2">
      <img
        src={country.flagImage}
        alt={`Drapeau ${country.name}`}
        className="h-4 w-6 rounded-[2px] border border-slate-300 object-cover dark:border-slate-600"
        loading="lazy"
      />
      <span>{country.name}</span>
    </span>
  );
}
