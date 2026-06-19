import { useEffect, useState, type ComponentType, type Dispatch, type SetStateAction } from 'react';

import { ClipboardList, Plus, Search, Ticket } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type NewTaskDraft<TPriority extends string, TCategory extends string> = {
  title: string;
  description: string;
  linkedTicketId?: string;
  linkedTicketNumero?: string;
  linkedTicketObjet?: string;
  visibility: 'public' | 'private';
  priority: TPriority;
  category: TCategory;
  startTime: Date;
  estimatedDuration: number;
  tags: string;
};

type TicketLite = {
  id: string;
  numero: string;
  objet: string;
};

type OptionDef = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  color?: string;
};

type AppTaskCreateDialogProps<TPriority extends string, TCategory extends string> = {
  taskDialogOpen: boolean;
  setTaskDialogOpen: Dispatch<SetStateAction<boolean>>;
  newTask: NewTaskDraft<TPriority, TCategory>;
  setNewTask: Dispatch<SetStateAction<NewTaskDraft<TPriority, TCategory>>>;
  taskPriorities: Record<TPriority, OptionDef>;
  taskCategories: Record<TCategory, OptionDef>;
  onCreateTask: () => void;
};

export function AppTaskCreateDialog<TPriority extends string, TCategory extends string>({
  taskDialogOpen,
  setTaskDialogOpen,
  newTask,
  setNewTask,
  taskPriorities,
  taskCategories,
  onCreateTask,
}: AppTaskCreateDialogProps<TPriority, TCategory>) {
  const [ticketQuery, setTicketQuery] = useState('');
  const [ticketResults, setTicketResults] = useState<TicketLite[]>([]);
  const [ticketLoading, setTicketLoading] = useState(false);

  useEffect(() => {
    const trimmed = ticketQuery.trim();
    if (!taskDialogOpen || !trimmed) {
      setTicketResults([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setTicketLoading(true);
      try {
        const response = await fetch(`/api/tickets?search=${encodeURIComponent(trimmed)}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        const list = Array.isArray(payload?.tickets) ? payload.tickets : [];
        setTicketResults(
          list.slice(0, 6).map((ticket: any) => ({
            id: String(ticket.id ?? ''),
            numero: String(ticket.numero ?? ticket.id ?? ''),
            objet: String(ticket.objet ?? 'Ticket'),
          }))
        );
      } catch {
        setTicketResults([]);
      } finally {
        setTicketLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [taskDialogOpen, ticketQuery]);

  useEffect(() => {
    if (!taskDialogOpen) {
      setTicketQuery('');
      setTicketResults([]);
    }
  }, [taskDialogOpen]);

  return (
    <>
      <Button className="gap-2 bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700" onClick={() => setTaskDialogOpen(true)}>
        <Plus className="w-4 h-4" /> Nouvelle tache
      </Button>
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Créer une nouvelle tâche
          </DialogTitle>
          <DialogDescription>Remplissez les details de votre tache</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="task-title">Titre *</Label>
            <Input
              id="task-title"
              placeholder="Titre de la tache"
              value={newTask.title}
              onChange={(event) => setNewTask({ ...newTask, title: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              placeholder="Description detaillee..."
              value={newTask.description}
              onChange={(event) => setNewTask({ ...newTask, description: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-ticket-search">Lier à un ticket existant</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="task-ticket-search"
                placeholder="Rechercher par ID, numéro ou objet..."
                className="pl-9"
                value={ticketQuery}
                onChange={(event) => setTicketQuery(event.target.value)}
              />
            </div>
            {newTask.linkedTicketNumero ? (
              <div className="flex items-center justify-between rounded-md border border-cyan-200 bg-cyan-50/70 px-3 py-2 text-xs dark:border-cyan-900 dark:bg-cyan-950/30">
                <div className="min-w-0">
                  <p className="flex items-center gap-1 font-semibold text-cyan-800 dark:text-cyan-300"><Ticket className="h-3.5 w-3.5" />{newTask.linkedTicketNumero}</p>
                  <p className="truncate text-cyan-700/80 dark:text-cyan-300/80">{newTask.linkedTicketObjet || 'Ticket lié'}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setNewTask({ ...newTask, linkedTicketId: '', linkedTicketNumero: '', linkedTicketObjet: '' })}
                >
                  Retirer
                </Button>
              </div>
            ) : null}
            {ticketQuery.trim() ? (
              <div className="max-h-40 overflow-auto rounded-md border">
                {ticketLoading ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Recherche en cours...</p>
                ) : ticketResults.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Aucun ticket trouvé.</p>
                ) : (
                  ticketResults.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      className="block w-full border-b px-3 py-2 text-left text-xs transition hover:bg-muted/60"
                      onClick={() => {
                        setNewTask({
                          ...newTask,
                          linkedTicketId: ticket.id,
                          linkedTicketNumero: ticket.numero,
                          linkedTicketObjet: ticket.objet,
                        });
                        setTicketQuery(ticket.numero);
                        setTicketResults([]);
                      }}
                    >
                      <p className="font-semibold">{ticket.numero}</p>
                      <p className="truncate text-muted-foreground">{ticket.objet}</p>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Priorite</Label>
              <Select
                value={newTask.priority}
                onValueChange={(value) => setNewTask({ ...newTask, priority: value as TPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(taskPriorities).map(([key, value]) => {
                    const option = value as OptionDef;
                    const IconComponent = option.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <IconComponent className={`w-4 h-4 ${option.color || ''}`} />
                          {option.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Categorie</Label>
              <Select
                value={newTask.category}
                onValueChange={(value) => setNewTask({ ...newTask, category: value as TCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(taskCategories).map(([key, value]) => {
                    const option = value as OptionDef;
                    const IconComponent = option.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Visibilite</Label>
            <Select
              value={newTask.visibility}
              onValueChange={(value) => setNewTask({ ...newTask, visibility: value as 'public' | 'private' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Publique (visible par tous)</SelectItem>
                <SelectItem value="private">Privee (visible uniquement par moi)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Duree estimee (minutes)</Label>
              <Select
                value={newTask.estimatedDuration.toString()}
                onValueChange={(value) => setNewTask({ ...newTask, estimatedDuration: Number.parseInt(value, 10) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 heure</SelectItem>
                  <SelectItem value="90">1h30</SelectItem>
                  <SelectItem value="120">2 heures</SelectItem>
                  <SelectItem value="180">3 heures</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Heure de debut</Label>
              <Input
                type="time"
                value={`${String(newTask.startTime.getHours()).padStart(2, '0')}:${String(newTask.startTime.getMinutes()).padStart(2, '0')}`}
                onChange={(event) => {
                  const [hours, minutes] = event.target.value.split(':');
                  const nextStartTime = new Date();
                  nextStartTime.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10));
                  setNewTask({ ...newTask, startTime: nextStartTime });
                }}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Tags (separes par des virgules)</Label>
            <Input
              placeholder="urgent, client, reseau..."
              value={newTask.tags}
              onChange={(event) => setNewTask({ ...newTask, tags: event.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>
            Annuler
          </Button>
          <Button onClick={onCreateTask} disabled={!newTask.title.trim()}>
            Créer la tâche
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </>
  );
}

