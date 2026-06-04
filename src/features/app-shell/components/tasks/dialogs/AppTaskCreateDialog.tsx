import type { ComponentType, Dispatch, SetStateAction } from 'react';

import { ClipboardList, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type NewTaskDraft<TPriority extends string, TCategory extends string> = {
  title: string;
  description: string;
  priority: TPriority;
  category: TCategory;
  startTime: Date;
  estimatedDuration: number;
  tags: string;
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
  return (
    <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
          <Plus className="w-4 h-4" /> Nouvelle tache
        </Button>
      </DialogTrigger>
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
          <Button onClick={onCreateTask}>Créer la tâche</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

