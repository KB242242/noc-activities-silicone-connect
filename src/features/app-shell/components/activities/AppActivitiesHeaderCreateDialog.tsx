import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type ActivityTypeOption = {
  value: string;
  label: string;
};

type ActivityDraft = {
  category: string;
  type: string;
  description: string;
};

type AppActivitiesHeaderCreateDialogProps = {
  activityDialogOpen: boolean;
  onActivityDialogOpenChange: (open: boolean) => void;
  newActivity: ActivityDraft;
  typeOptions: ActivityTypeOption[];
  onCategoryChange: (category: string) => void;
  onTypeChange: (type: string) => void;
  onDescriptionChange: (description: string) => void;
  onSave: () => void;
};

export function AppActivitiesHeaderCreateDialog({
  activityDialogOpen,
  onActivityDialogOpenChange,
  newActivity,
  typeOptions,
  onCategoryChange,
  onTypeChange,
  onDescriptionChange,
  onSave,
}: AppActivitiesHeaderCreateDialogProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Suivi des Activités</h1>
        <p className="text-muted-foreground">Enregistrez vos actions NOC</p>
      </div>
      <Dialog open={activityDialogOpen} onOpenChange={onActivityDialogOpenChange}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Nouvelle activité
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer une activité</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Catégorie</Label>
              <Select value={newActivity.category} onValueChange={onCategoryChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monitoring">Monitoring</SelectItem>
                  <SelectItem value="Call Center">Call Center</SelectItem>
                  <SelectItem value="Reporting 1">Reporting 1</SelectItem>
                  <SelectItem value="Reporting 2">Reporting 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={newActivity.type} onValueChange={onTypeChange}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={newActivity.description} onChange={(event) => onDescriptionChange(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={onSave}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
