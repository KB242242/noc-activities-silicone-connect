/* Composant pour planifier une réunion vidéo */
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/authStore';
import { Calendar, Clock, Users, Save } from 'lucide-react';

interface ScheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  onSchedule: (meetingData: {
    title: string;
    description?: string;
    scheduledStartTime: number;
    scheduledEndTime: number;
    allowScreenShare: boolean;
    allowRecording: boolean;
    participantIds: string[];
  }) => Promise<void>;
}

export const ScheduleMeetingDialog: React.FC<ScheduleMeetingDialogProps> = ({
  open,
  onOpenChange,
  conversationId,
  onSchedule,
}) => {
  const authUser = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allowScreenShare, setAllowScreenShare] = useState(true);
  const [allowRecording, setAllowRecording] = useState(false);
  const [participantEmails, setParticipantEmails] = useState('');

  const handleSchedule = async () => {
    if (!title || !startDate || !startTime || !endTime || !authUser) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setIsLoading(true);

      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${startDate}T${endTime}`);

      await onSchedule({
        title,
        description: description || undefined,
        scheduledStartTime: startDateTime.getTime(),
        scheduledEndTime: endDateTime.getTime(),
        allowScreenShare,
        allowRecording,
        participantIds: participantEmails
          .split(',')
          .map((email) => email.trim())
          .filter(Boolean),
      });

      // Réinitialiser le formulaire
      setTitle('');
      setDescription('');
      setStartDate('');
      setStartTime('');
      setEndTime('');
      setAllowScreenShare(true);
      setAllowRecording(false);
      setParticipantEmails('');
      
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur planification réunion:', error);
      alert('Erreur lors de la planification de la réunion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Planifier une réunion vidéo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Titre */}
          <div>
            <label className="text-sm font-medium mb-1 block">Titre *</label>
            <Input
              placeholder="Titre de la réunion"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Textarea
              placeholder="Description optionnelle"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Date et heure */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                <Calendar size={14} />
                Date *
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                <Clock size={14} />
                Départ *
              </label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                <Clock size={14} />
                Fin *
              </label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="text-sm font-medium mb-1 block flex items-center gap-1">
              <Users size={14} />
              Participants (emails séparés par des virgules)
            </label>
            <Textarea
              placeholder="email1@example.com, email2@example.com"
              value={participantEmails}
              onChange={(e) => setParticipantEmails(e.target.value)}
              rows={2}
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowScreenShare}
                onChange={(e) => setAllowScreenShare(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Autoriser le partage d'écran</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowRecording}
                onChange={(e) => setAllowRecording(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Autoriser l'enregistrement</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isLoading}
            className="gap-2"
          >
            <Save size={16} />
            {isLoading ? 'Planification...' : 'Planifier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleMeetingDialog;
