import { AlertCircle, AlertTriangle, ClipboardList, Clock3, Search, Users } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AppTasksFiltersCardProps = {
  searchQuery: string;
  taskFilter: string;
  onSearchQueryChange: (value: string) => void;
  onTaskFilterChange: (value: string) => void;
  compactSearch?: boolean;
  extraControls?: ReactNode;
};

export function AppTasksFiltersCard({
  searchQuery,
  taskFilter,
  onSearchQueryChange,
  onTaskFilterChange,
  compactSearch = false,
  extraControls,
}: AppTasksFiltersCardProps) {
  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className={`relative ${compactSearch ? 'sm:max-w-md' : 'flex-1'}`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une tâche..."
            className="pl-9"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={taskFilter} onValueChange={onTaskFilterChange}>
            <SelectTrigger className="w-37.5">
              <SelectValue placeholder="Filtrer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="my">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" /> Mes tâches
                </div>
              </SelectItem>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" /> Toutes
                </div>
              </SelectItem>
              <SelectItem value="pending">
                <div className="flex items-center gap-2">
                  <Clock3 className="w-4 h-4" /> En attente
                </div>
              </SelectItem>
              <SelectItem value="late">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" /> En retard
                </div>
              </SelectItem>
              <SelectItem value="critical">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" /> Critiques
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {extraControls}
        </div>
      </div>
    </Card>
  );
}
