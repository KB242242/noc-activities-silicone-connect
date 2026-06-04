import { Search } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FilterOption = {
  value: string;
  label: string;
};

type SiteOption = {
  id: string;
  name: string;
};

type TechnicianOption = {
  id: string;
  name: string;
};

type AppTicketsFiltersCardProps = {
  searchQuery: string;
  statusFilter: string;
  priorityFilter: string;
  siteFilter: string;
  localityFilter: string;
  technicianFilter: string;
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  siteOptions: SiteOption[];
  localityOptions: string[];
  technicianOptions: TechnicianOption[];
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onPriorityFilterChange: (value: string) => void;
  onSiteFilterChange: (value: string) => void;
  onLocalityFilterChange: (value: string) => void;
  onTechnicianFilterChange: (value: string) => void;
};

export function AppTicketsFiltersCard({
  searchQuery,
  statusFilter,
  priorityFilter,
  siteFilter,
  localityFilter,
  technicianFilter,
  statusOptions,
  priorityOptions,
  siteOptions,
  localityOptions,
  technicianOptions,
  onSearchQueryChange,
  onStatusFilterChange,
  onPriorityFilterChange,
  onSiteFilterChange,
  onLocalityFilterChange,
  onTechnicianFilterChange,
}: AppTicketsFiltersCardProps) {
  return (
    <Card className="border-2 dark:border-slate-700 bg-white dark:bg-slate-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-foreground">Filtres</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="w-full min-w-56 sm:w-64 lg:w-72">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                className="pl-10 border-2 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-full sm:w-40 border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800">
              <SelectItem value="all">Tous statuts</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
            <SelectTrigger className="w-full sm:w-40 border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue placeholder="Priorité" /></SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800">
              <SelectItem value="all">Toutes priorités</SelectItem>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={siteFilter} onValueChange={onSiteFilterChange}>
            <SelectTrigger className="w-full sm:w-40 border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue placeholder="Site" /></SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800">
              <SelectItem value="all">Tous sites</SelectItem>
              {siteOptions.map((site) => (
                <SelectItem key={site.id} value={site.name}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={localityFilter} onValueChange={onLocalityFilterChange}>
            <SelectTrigger className="w-full sm:w-40 border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue placeholder="Localité" /></SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800">
              <SelectItem value="all">Toutes localités</SelectItem>
              {localityOptions.map((locality) => (
                <SelectItem key={locality} value={locality}>{locality}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={technicianFilter} onValueChange={onTechnicianFilterChange}>
            <SelectTrigger className="w-full sm:w-44 border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue placeholder="Technicien" /></SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800">
              <SelectItem value="all">Tous techniciens</SelectItem>
              {technicianOptions.map((technician) => (
                <SelectItem key={technician.id} value={technician.name}>{technician.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>
      </CardContent>
    </Card>
  );
}