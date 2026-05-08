'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ActivitySquare,
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  ClipboardList,
  Eye,
  FileSearch,
  Globe,
  Layers,
  Lock,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Phone,
  Play,
  Plus,
  Radar,
  Send,
  ShieldCheck,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { loadFromStorage, saveToStorage } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
type MessageStatus = 'DRAFT' | 'PENDING_VALIDATION' | 'APPROVED' | 'REJECTED' | 'SENT';
type ValidationRole = 'SUPERVISOR' | 'MANAGER' | 'RESPONSABLE';
type MaintenanceType = 'PREVENTIVE' | 'CURATIVE';
type Visibility = 'PUBLIC' | 'PRIVATE';
type TicketType = 'INCIDENT' | 'SURVEY' | 'DEPLOIEMENT' | 'SUPERVISION';
type TicketStatus = 'OUVERT' | 'EN_COURS' | 'RESOLU' | 'FERME';
type ComplaintChannel = 'PHONE' | 'MAIL' | 'VISITE';

type ClientOption = {
  id_client: number;
  client_ref: string;
  client_name: string;
  contact_phone?: string;
  contact_email?: string;
};

type Complaint = {
  id: string;
  clientId: number;
  clientRef: string;
  clientName: string;
  title: string;
  description: string;
  channel: ComplaintChannel;
  priority: Priority;
  createdAt: string;
};

type ServiceTask = {
  id: string;
  complaintId: string;
  clientId: number;
  clientName: string;
  title: string;
  priority: Priority;
  status: TaskStatus;
  assignedTech?: string;
  announcedAt?: string;
  createdAt: string;
};

type ClientMessage = {
  id: string;
  clientId: number;
  clientName: string;
  subject: string;
  content: string;
  requestedRole: ValidationRole;
  status: MessageStatus;
  validationComment?: string;
  validatedBy?: string;
  createdAt: string;
};

type MaintenanceItem = {
  id: string;
  clientId: number;
  clientName: string;
  maintenanceType: MaintenanceType;
  title: string;
  details: string;
  visibility: Visibility;
  createdAt: string;
};

type Ticket = {
  id: string;
  ticketType: TicketType;
  clientId: number;
  clientRef: string;
  clientName: string;
  title: string;
  description: string;
  priority: Priority;
  status: TicketStatus;
  assignedTech: string;
  createdAt: string;
  updatedAt?: string;
};

const PRIORITY_ORDER: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const PRIORITY_LABEL: Record<Priority, string> = { CRITICAL: 'Critique', HIGH: 'Haute', MEDIUM: 'Moyenne', LOW: 'Basse' };
const PRIORITY_BADGE: Record<Priority, string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-amber-500 text-white',
  LOW: 'bg-slate-500 text-white',
};

const TASK_STEPS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
const TASK_STEP_LABELS: Record<TaskStatus, string> = { TODO: 'A faire', IN_PROGRESS: 'En cours', DONE: 'Termine' };

const MSG_STEPS: MessageStatus[] = ['DRAFT', 'PENDING_VALIDATION', 'APPROVED', 'SENT'];
const MSG_STEP_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING_VALIDATION: 'En attente',
  APPROVED: 'Valide',
  REJECTED: 'Rejete',
  SENT: 'Envoye',
};
const MSG_STATUS_BADGE: Record<MessageStatus, string> = {
  DRAFT: 'bg-slate-500 text-white',
  PENDING_VALIDATION: 'bg-amber-500 text-white',
  APPROVED: 'bg-emerald-600 text-white',
  REJECTED: 'bg-red-600 text-white',
  SENT: 'bg-indigo-600 text-white',
};

const TICKET_TYPE_LABEL: Record<TicketType, string> = {
  INCIDENT: 'Incident',
  SURVEY: 'Survey',
  DEPLOIEMENT: 'Deploiement',
  SUPERVISION: 'Supervision',
};
const TICKET_TYPE_COLOR: Record<TicketType, string> = {
  INCIDENT: 'bg-red-600 text-white',
  SURVEY: 'bg-violet-600 text-white',
  DEPLOIEMENT: 'bg-sky-600 text-white',
  SUPERVISION: 'bg-emerald-600 text-white',
};
const TICKET_STATUS_STEPS: TicketStatus[] = ['OUVERT', 'EN_COURS', 'RESOLU', 'FERME'];
const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OUVERT: 'Ouvert',
  EN_COURS: 'En cours',
  RESOLU: 'Resolu',
  FERME: 'Ferme',
};
const TICKET_STATUS_BADGE: Record<TicketStatus, string> = {
  OUVERT: 'bg-red-600 text-white',
  EN_COURS: 'bg-amber-500 text-white',
  RESOLU: 'bg-emerald-600 text-white',
  FERME: 'bg-slate-500 text-white',
};

const STORAGE_KEYS = {
  complaints: 'noc_callcenter_service_complaints',
  tasks: 'noc_callcenter_service_tasks',
  messages: 'noc_callcenter_service_messages',
  maintenances: 'noc_callcenter_service_maintenances',
  tickets: 'noc_callcenter_tickets',
} as const;

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function IconBtn({
  icon,
  tooltip,
  onClick,
  variant = 'outline',
  className = '',
  disabled = false,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'destructive' | 'ghost' | 'secondary';
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant={variant} className={`h-7 w-7 ${className}`} onClick={onClick} disabled={disabled}>
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
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                  done
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : filled
                      ? 'border-cyan-600 bg-cyan-600 text-white'
                      : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800'
                } ${active ? 'ring-2 ring-cyan-400 ring-offset-1' : ''}`}
              >
                {done && i === 2 ? (
                  <Check className="h-2.5 w-2.5" />
                ) : filled ? (
                  <Circle className="h-1.5 w-1.5 fill-current" />
                ) : (
                  <Circle className="h-1.5 w-1.5" />
                )}
              </div>
              <span className="whitespace-nowrap text-[9px] text-slate-500 dark:text-slate-400">{TASK_STEP_LABELS[step]}</span>
            </div>
            {i < TASK_STEPS.length - 1 && (
              <div className={`mb-3 h-px min-w-4 flex-1 transition-colors ${i < currentIndex ? 'bg-cyan-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function MessageStepper({ status }: { status: MessageStatus }) {
  const rejectedAtStep2 = status === 'REJECTED';
  const currentIndex = status === 'REJECTED' ? 2 : MSG_STEPS.indexOf(status as MessageStatus);
  return (
    <div className="mt-2 flex items-center gap-0">
      {MSG_STEPS.map((step, i) => {
        const isRejected = rejectedAtStep2 && i === 2;
        const filled = i <= currentIndex;
        const active = step === status || isRejected;
        return (
          <Fragment key={step}>
            <div className="flex min-w-0 flex-col items-center gap-0.5">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                  isRejected
                    ? 'border-red-600 bg-red-600 text-white'
                    : filled
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800'
                } ${active ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}
              >
                {isRejected ? <X className="h-2.5 w-2.5" /> : filled ? <Check className="h-2.5 w-2.5" /> : <Circle className="h-1.5 w-1.5" />}
              </div>
              <span className="whitespace-nowrap text-[9px] text-slate-500 dark:text-slate-400">{isRejected ? 'Rejete' : MSG_STEP_LABELS[step]}</span>
            </div>
            {i < MSG_STEPS.length - 1 && (
              <div className={`mb-3 h-px min-w-3 flex-1 transition-colors ${!rejectedAtStep2 && i < currentIndex ? 'bg-indigo-600' : rejectedAtStep2 && i < 2 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function TicketStepper({ status }: { status: TicketStatus }) {
  const currentIndex = TICKET_STATUS_STEPS.indexOf(status);
  return (
    <div className="mt-2 flex items-center gap-0">
      {TICKET_STATUS_STEPS.map((step, i) => {
        const filled = i <= currentIndex;
        const done = status === 'FERME';
        const active = step === status;
        return (
          <Fragment key={step}>
            <div className="flex min-w-0 flex-col items-center gap-0.5">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                  done
                    ? 'border-slate-500 bg-slate-500 text-white'
                    : filled
                      ? 'border-violet-600 bg-violet-600 text-white'
                      : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800'
                } ${active ? 'ring-2 ring-violet-400 ring-offset-1' : ''}`}
              >
                {done && i === TICKET_STATUS_STEPS.length - 1 ? <Check className="h-2.5 w-2.5" /> : filled ? <Circle className="h-1.5 w-1.5 fill-current" /> : <Circle className="h-1.5 w-1.5" />}
              </div>
              <span className="whitespace-nowrap text-[9px] text-slate-500 dark:text-slate-400">{TICKET_STATUS_LABEL[step]}</span>
            </div>
            {i < TICKET_STATUS_STEPS.length - 1 && (
              <div className={`mb-3 h-px min-w-3 flex-1 transition-colors ${i < currentIndex ? 'bg-violet-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

export function NocCallCenterPanel() {
  const { user } = useAuthStore();

  const [hydrated, setHydrated] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [announcedTaskId, setAnnouncedTaskId] = useState<string | null>(null);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [tasks, setTasks] = useState<ServiceTask[]>([]);
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceItem[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showTicketTracker, setShowTicketTracker] = useState(false);

  const [complaintForm, setComplaintForm] = useState({
    clientId: '',
    title: '',
    description: '',
    channel: 'PHONE' as ComplaintChannel,
    priority: 'MEDIUM' as Priority,
  });
  const [taskForm, setTaskForm] = useState({ complaintId: '', title: '', priority: 'HIGH' as Priority, assignedTech: '' });
  const [ticketForm, setTicketForm] = useState({
    clientId: '',
    ticketType: 'INCIDENT' as TicketType,
    title: '',
    description: '',
    priority: 'HIGH' as Priority,
    assignedTech: '',
  });
  const [messageForm, setMessageForm] = useState({
    clientId: '',
    subject: '',
    content: '',
    requestedRole: 'SUPERVISOR' as ValidationRole,
  });
  const [maintenanceForm, setMaintenanceForm] = useState({
    clientId: '',
    maintenanceType: 'PREVENTIVE' as MaintenanceType,
    title: '',
    details: '',
    visibility: 'PUBLIC' as Visibility,
  });
  const [validationComment, setValidationComment] = useState<Record<string, string>>({});

  const canValidate = useMemo(() => {
    const role = (user?.role || '').toUpperCase();
    return role.includes('SUPERVIS') || role.includes('MANAGER') || role.includes('RESPONSABLE') || role.includes('ADMIN');
  }, [user?.role]);

  useEffect(() => {
    setComplaints(loadFromStorage<Complaint[]>(STORAGE_KEYS.complaints, []));
    setTasks(loadFromStorage<ServiceTask[]>(STORAGE_KEYS.tasks, []));
    setMessages(loadFromStorage<ClientMessage[]>(STORAGE_KEYS.messages, []));
    setMaintenances(loadFromStorage<MaintenanceItem[]>(STORAGE_KEYS.maintenances, []));
    setTickets(loadFromStorage<Ticket[]>(STORAGE_KEYS.tickets, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveToStorage(STORAGE_KEYS.complaints, complaints);
  }, [complaints, hydrated]);
  useEffect(() => {
    if (hydrated) saveToStorage(STORAGE_KEYS.tasks, tasks);
  }, [hydrated, tasks]);
  useEffect(() => {
    if (hydrated) saveToStorage(STORAGE_KEYS.messages, messages);
  }, [hydrated, messages]);
  useEffect(() => {
    if (hydrated) saveToStorage(STORAGE_KEYS.maintenances, maintenances);
  }, [hydrated, maintenances]);
  useEffect(() => {
    if (hydrated) saveToStorage(STORAGE_KEYS.tickets, tickets);
  }, [hydrated, tickets]);

  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoadingClients(true);
        const res = await fetch('/api/noc/clients');
        const data = await res.json();
        if (data?.success && Array.isArray(data.clients)) {
          setClients(data.clients);
          if (data.clients.length > 0) {
            const firstId = String(data.clients[0].id_client);
            setSelectedClientId(firstId);
            setComplaintForm((p) => ({ ...p, clientId: firstId }));
            setMessageForm((p) => ({ ...p, clientId: firstId }));
            setMaintenanceForm((p) => ({ ...p, clientId: firstId }));
            setTicketForm((p) => ({ ...p, clientId: firstId }));
          }
        }
      } catch {
        toast.error('Impossible de charger les clients');
      } finally {
        setLoadingClients(false);
      }
    };
    loadClients();
  }, []);

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || Number(a.status === 'DONE') - Number(b.status === 'DONE')),
    [tasks],
  );
  const waitingTasks = sortedTasks.filter((t) => t.status !== 'DONE');
  const nextTask = waitingTasks[0] || null;
  const selectedClientHistory = useMemo(
    () => complaints.filter((c) => String(c.clientId) === selectedClientId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [complaints, selectedClientId],
  );
  const pendingMessages = messages.filter((m) => m.status === 'PENDING_VALIDATION').length;
  const openTickets = useMemo(
    () => tickets.filter((t) => t.status !== 'FERME').sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
    [tickets],
  );

  const createComplaint = () => {
    const client = clients.find((c) => String(c.id_client) === complaintForm.clientId);
    if (!client) return toast.error('Choisis un client');
    if (!complaintForm.title.trim()) return toast.error('Le titre est obligatoire');

    const complaint: Complaint = {
      id: makeId('cmp'),
      clientId: client.id_client,
      clientRef: client.client_ref,
      clientName: client.client_name,
      title: complaintForm.title.trim(),
      description: complaintForm.description.trim(),
      channel: complaintForm.channel,
      priority: complaintForm.priority,
      createdAt: new Date().toISOString(),
    };
    setComplaints((p) => [complaint, ...p]);
    setTaskForm((p) => ({ ...p, complaintId: complaint.id, priority: complaint.priority }));
    setComplaintForm((p) => ({ ...p, title: '', description: '' }));
    toast.success('Plainte enregistree');
  };

  const createTask = () => {
    const complaint = complaints.find((c) => c.id === taskForm.complaintId);
    if (!complaint) return toast.error('Selectionne une plainte');
    if (!taskForm.title.trim()) return toast.error('Le titre est obligatoire');

    const task: ServiceTask = {
      id: makeId('tsk'),
      complaintId: complaint.id,
      clientId: complaint.clientId,
      clientName: complaint.clientName,
      title: taskForm.title.trim(),
      priority: taskForm.priority,
      status: 'TODO',
      assignedTech: taskForm.assignedTech.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    setTasks((p) => [task, ...p]);
    setTaskForm((p) => ({ ...p, title: '', assignedTech: '' }));
    toast.success('Tache creee');
  };

  const announceNext = () => {
    if (!nextTask) return toast.info('Aucune tache en attente');
    setAnnouncedTaskId(nextTask.id);
    setTasks((p) => p.map((t) => (t.id === nextTask.id ? { ...t, announcedAt: new Date().toISOString() } : t)));
    toast.success(`Annonce: ${nextTask.title}`);
  };

  const createTicket = () => {
    const client = clients.find((c) => String(c.id_client) === ticketForm.clientId);
    if (!client) return toast.error('Choisis un client');
    if (!ticketForm.title.trim()) return toast.error('Le titre est obligatoire');

    const ticket: Ticket = {
      id: makeId('tkt'),
      ticketType: ticketForm.ticketType,
      clientId: client.id_client,
      clientRef: client.client_ref,
      clientName: client.client_name,
      title: ticketForm.title.trim(),
      description: ticketForm.description.trim(),
      priority: ticketForm.priority,
      status: 'OUVERT',
      assignedTech: ticketForm.assignedTech.trim(),
      createdAt: new Date().toISOString(),
    };
    setTickets((p) => [ticket, ...p]);
    setTicketForm((p) => ({ ...p, title: '', description: '', assignedTech: '' }));
    toast.success('Ticket cree');
  };

  const createMessage = () => {
    const client = clients.find((c) => String(c.id_client) === messageForm.clientId);
    if (!client) return toast.error('Client introuvable');
    if (!messageForm.subject.trim() || !messageForm.content.trim()) return toast.error('Sujet et contenu obligatoires');

    const message: ClientMessage = {
      id: makeId('msg'),
      clientId: client.id_client,
      clientName: client.client_name,
      subject: messageForm.subject.trim(),
      content: messageForm.content.trim(),
      requestedRole: messageForm.requestedRole,
      status: 'PENDING_VALIDATION',
      createdAt: new Date().toISOString(),
    };
    setMessages((p) => [message, ...p]);
    setMessageForm((p) => ({ ...p, subject: '', content: '' }));
    toast.success('Message soumis pour validation');
  };

  const createMaintenance = () => {
    const client = clients.find((c) => String(c.id_client) === maintenanceForm.clientId);
    if (!client) return toast.error('Choisis un client');
    if (!maintenanceForm.title.trim()) return toast.error('Titre obligatoire');

    const item: MaintenanceItem = {
      id: makeId('mnt'),
      clientId: client.id_client,
      clientName: client.client_name,
      maintenanceType: maintenanceForm.maintenanceType,
      title: maintenanceForm.title.trim(),
      details: maintenanceForm.details.trim(),
      visibility: maintenanceForm.visibility,
      createdAt: new Date().toISOString(),
    };
    setMaintenances((p) => [item, ...p]);
    setMaintenanceForm((p) => ({ ...p, title: '', details: '' }));
    toast.success('Maintenance ajoutee');
  };

  const updateTaskStatus = (id: string, status: TaskStatus) => {
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const updateTicketStatus = (id: string, status: TicketStatus) => {
    setTickets((p) => p.map((t) => (t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t)));
  };

  const validateMessage = (id: string, approved: boolean) => {
    const comment = (validationComment[id] || '').trim();
    setMessages((p) =>
      p.map((m) =>
        m.id === id
          ? {
              ...m,
              status: approved ? 'APPROVED' : 'REJECTED',
              validationComment: comment || undefined,
              validatedBy: user?.name || user?.email || 'Chef',
            }
          : m,
      ),
    );
    toast.success(approved ? 'Message valide' : 'Message rejete');
  };

  const sendMessage = (id: string) => {
    setMessages((p) => p.map((m) => (m.id === id ? { ...m, status: 'SENT' } : m)));
    toast.success('Message marque comme envoye');
  };

  if (!hydrated) {
    return (
      <div className="flex h-60 items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-linear-to-r from-slate-50 via-cyan-50 to-indigo-50 p-4 dark:border-slate-700 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">NOC Call Center</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pilotage des operations, validation messages, suivi des tickets et maintenance.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1 font-normal"><AlertTriangle className="h-3 w-3 text-red-600" /> {complaints.length} plaintes</Badge>
            <Badge variant="secondary" className="gap-1 font-normal"><ClipboardList className="h-3 w-3 text-cyan-600" /> {waitingTasks.length} taches actives</Badge>
            <Badge variant="secondary" className="gap-1 font-normal"><MessageSquare className="h-3 w-3 text-indigo-600" /> {pendingMessages} validations</Badge>
            <Badge variant="secondary" className="gap-1 font-normal"><Wrench className="h-3 w-3 text-amber-600" /> {maintenances.length} maintenances</Badge>
            <Badge variant="secondary" className="gap-1 font-normal"><ActivitySquare className="h-3 w-3 text-violet-600" /> {openTickets.length} tickets ouverts</Badge>
          </div>
        </div>

        <Tabs defaultValue="complaints" className="w-full">
          <TabsList className="h-auto flex-wrap gap-1 p-1">
            <TabsTrigger value="complaints" className="gap-1.5 text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Plaintes</TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5 text-xs"><ClipboardList className="h-3.5 w-3.5" /> File taches</TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5 text-xs"><MessageSquare className="h-3.5 w-3.5" /> Messages</TabsTrigger>
            <TabsTrigger value="maintenances" className="gap-1.5 text-xs"><Wrench className="h-3.5 w-3.5" /> Maintenances</TabsTrigger>
            <TabsTrigger value="tickets" className="relative gap-1.5 text-xs">
              <ActivitySquare className="h-3.5 w-3.5" /> Tickets
              {openTickets.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white">{openTickets.length}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="complaints" className="mt-3">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_1fr]">
              <Card className="h-fit border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-red-600" /> Nouvelle plainte</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Client</Label>
                      <Select value={complaintForm.clientId} onValueChange={(v) => setComplaintForm((p) => ({ ...p, clientId: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={loadingClients ? 'Chargement...' : 'Client'} /></SelectTrigger>
                        <SelectContent>{clients.map((c) => <SelectItem key={c.id_client} value={String(c.id_client)} className="text-xs">{c.client_ref} - {c.client_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Canal</Label>
                      <Select value={complaintForm.channel} onValueChange={(v) => setComplaintForm((p) => ({ ...p, channel: v as ComplaintChannel }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PHONE" className="text-xs">Telephone</SelectItem>
                          <SelectItem value="MAIL" className="text-xs">Mail</SelectItem>
                          <SelectItem value="VISITE" className="text-xs">Visite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Titre</Label><Input className="h-8 text-xs" value={complaintForm.title} onChange={(e) => setComplaintForm((p) => ({ ...p, title: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Description</Label><Textarea className="text-xs" rows={3} value={complaintForm.description} onChange={(e) => setComplaintForm((p) => ({ ...p, description: e.target.value }))} /></div>
                  <div className="space-y-1">
                    <Label className="text-xs">Priorite</Label>
                    <Select value={complaintForm.priority} onValueChange={(v) => setComplaintForm((p) => ({ ...p, priority: v as Priority }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRITICAL" className="text-xs">Critique</SelectItem>
                        <SelectItem value="HIGH" className="text-xs">Haute</SelectItem>
                        <SelectItem value="MEDIUM" className="text-xs">Moyenne</SelectItem>
                        <SelectItem value="LOW" className="text-xs">Basse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="h-8 w-full gap-2 text-xs" onClick={createComplaint}><Plus className="h-3.5 w-3.5" /> Enregistrer</Button>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-slate-500" /> Historique client</CardTitle></CardHeader>
                <CardContent>
                  <div className="mb-3">
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Client a filtrer" /></SelectTrigger>
                      <SelectContent>{clients.map((c) => <SelectItem key={c.id_client} value={String(c.id_client)} className="text-xs">{c.client_ref} - {c.client_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="max-h-140 space-y-2 overflow-y-auto pr-1">
                    {selectedClientHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-10 text-center dark:border-slate-700"><AlertTriangle className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" /><p className="text-sm text-slate-500 dark:text-slate-400">Aucune plainte pour ce client</p></div>
                    ) : (
                      selectedClientHistory.map((c) => (
                        <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                          <div className="flex items-start justify-between gap-2"><Badge className={`${PRIORITY_BADGE[c.priority]} px-1.5 py-0 text-[9px]`}>{PRIORITY_LABEL[c.priority]}</Badge><span className="text-[10px] text-slate-500">{formatDateTime(c.createdAt)}</span></div>
                          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{c.title}</p>
                          {c.description && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{c.description}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-3">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_1fr]">
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-xl border border-cyan-200 bg-cyan-50 px-5 py-4 dark:border-cyan-900/60 dark:bg-cyan-950/30">
                  <motion.div key={waitingTasks.length} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-6xl font-black tabular-nums leading-none text-slate-900 dark:text-slate-100">{String(waitingTasks.length).padStart(2, '0')}</motion.div>
                  <div className="flex-1"><p className="text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">Taches en attente</p><p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">Prochain: <span className="text-cyan-700 dark:text-cyan-400">{nextTask ? nextTask.title : 'Aucun'}</span></p></div>
                  <IconBtn icon={<Megaphone className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />} tooltip="Annoncer le prochain" onClick={announceNext} disabled={!nextTask} className="border-cyan-300 bg-white hover:bg-cyan-100 dark:border-cyan-700 dark:bg-slate-900" />
                </div>

                <Card className="h-fit border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><ClipboardList className="h-4 w-4 text-cyan-600" /> Nouvelle tache</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Plainte liee</Label>
                      <Select value={taskForm.complaintId} onValueChange={(v) => setTaskForm((p) => ({ ...p, complaintId: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selectionner une plainte" /></SelectTrigger>
                        <SelectContent>{complaints.map((c) => <SelectItem key={c.id} value={c.id} className="text-xs">{c.clientName} - {c.title}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Titre tache</Label><Input className="h-8 text-xs" value={taskForm.title} onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))} /></div>
                    <div className="space-y-1">
                      <Label className="text-xs">Priorite</Label>
                      <Select value={taskForm.priority} onValueChange={(v) => setTaskForm((p) => ({ ...p, priority: v as Priority }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CRITICAL" className="text-xs">Critique</SelectItem>
                          <SelectItem value="HIGH" className="text-xs">Haute</SelectItem>
                          <SelectItem value="MEDIUM" className="text-xs">Moyenne</SelectItem>
                          <SelectItem value="LOW" className="text-xs">Basse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Technicien responsable</Label><div className="relative"><User className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" /><Input className="h-8 pl-6 text-xs" value={taskForm.assignedTech} onChange={(e) => setTaskForm((p) => ({ ...p, assignedTech: e.target.value }))} placeholder="Nom du technicien" /></div></div>
                    <Button className="h-8 w-full gap-2 text-xs" onClick={createTask}><Plus className="h-3.5 w-3.5" /> Creer la tache</Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><ClipboardList className="h-4 w-4 text-slate-500" /> File operationnelle</CardTitle></CardHeader>
                <CardContent>
                  <div className="max-h-140 space-y-2 overflow-y-auto pr-1">
                    {sortedTasks.length === 0 ? <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-10 text-center dark:border-slate-700"><ClipboardList className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" /><p className="text-sm text-slate-500 dark:text-slate-400">Aucune tache</p></div> : sortedTasks.map((task) => (
                      <div key={task.id} className={`rounded-lg border p-3 ${announcedTaskId === task.id ? 'border-cyan-400 bg-cyan-50 dark:border-cyan-700 dark:bg-cyan-950/40' : task.status === 'DONE' ? 'border-slate-200 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-800/30' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5"><Badge className={`${PRIORITY_BADGE[task.priority]} px-1.5 py-0 text-[9px]`}>{PRIORITY_LABEL[task.priority]}</Badge>{announcedTaskId === task.id && <Badge className="bg-amber-500 px-1.5 py-0 text-[9px] text-white">ANNONCE</Badge>}</div>
                            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><span>{task.clientName} - {formatDateTime(task.createdAt)}</span>{task.assignedTech && <span className="flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800"><User className="h-2.5 w-2.5" /> {task.assignedTech}</span>}</div>
                            <TaskStepper status={task.status} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <IconBtn icon={<Circle className="h-3 w-3" />} tooltip="A faire" onClick={() => updateTaskStatus(task.id, 'TODO')} variant={task.status === 'TODO' ? 'default' : 'outline'} />
                            <IconBtn icon={<Play className="h-3 w-3" />} tooltip="En cours" onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')} variant={task.status === 'IN_PROGRESS' ? 'default' : 'outline'} />
                            <IconBtn icon={<CheckCircle2 className="h-3 w-3" />} tooltip="Termine" onClick={() => updateTaskStatus(task.id, 'DONE')} variant={task.status === 'DONE' ? 'default' : 'outline'} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="messages" className="mt-3">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_1fr]">
              <Card className="h-fit border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4 text-indigo-600" /> Nouveau message client</CardTitle><CardDescription className="text-xs">Validation avant envoi.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Client</Label><Select value={messageForm.clientId} onValueChange={(v) => setMessageForm((p) => ({ ...p, clientId: v }))}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Client" /></SelectTrigger><SelectContent>{clients.map((c) => <SelectItem key={c.id_client} value={String(c.id_client)} className="text-xs">{c.client_ref} - {c.client_name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1"><Label className="text-xs">Validation par</Label><Select value={messageForm.requestedRole} onValueChange={(v) => setMessageForm((p) => ({ ...p, requestedRole: v as ValidationRole }))}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SUPERVISOR" className="text-xs">Supervisor</SelectItem><SelectItem value="MANAGER" className="text-xs">Manager</SelectItem><SelectItem value="RESPONSABLE" className="text-xs">Responsable</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Sujet</Label><Input className="h-8 text-xs" value={messageForm.subject} onChange={(e) => setMessageForm((p) => ({ ...p, subject: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Contenu</Label><Textarea className="text-xs" rows={4} value={messageForm.content} onChange={(e) => setMessageForm((p) => ({ ...p, content: e.target.value }))} /></div>
                  <Button className="h-8 w-full gap-2 text-xs" onClick={createMessage}><Send className="h-3.5 w-3.5" /> Soumettre pour validation</Button>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4 text-slate-500" /> Workflow messages</CardTitle></CardHeader>
                <CardContent>
                  <div className="max-h-140 space-y-2 overflow-y-auto pr-1">
                    {messages.length === 0 ? <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-10 text-center dark:border-slate-700"><MessageSquare className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" /><p className="text-sm text-slate-500 dark:text-slate-400">Aucun message</p></div> : messages.map((m) => (
                      <div key={m.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-2"><Badge className={`${MSG_STATUS_BADGE[m.status]} px-1.5 py-0 text-[9px]`}>{MSG_STEP_LABELS[m.status]}</Badge><span className="text-[10px] text-slate-500">{formatDateTime(m.createdAt)}</span></div>
                        <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{m.subject}</p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{m.content}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500"><span className="inline-flex items-center gap-0.5"><User className="h-3 w-3" /> {m.clientName}</span><span className="inline-flex items-center gap-0.5"><ShieldCheck className="h-3 w-3" /> {m.requestedRole}</span></div>
                        <MessageStepper status={m.status} />
                        {canValidate && m.status === 'PENDING_VALIDATION' && (
                          <div className="mt-2 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/40">
                            <Input className="h-8 text-xs" placeholder="Commentaire validation (optionnel)" value={validationComment[m.id] || ''} onChange={(e) => setValidationComment((p) => ({ ...p, [m.id]: e.target.value }))} />
                            <div className="flex gap-1"><IconBtn icon={<Check className="h-3 w-3" />} tooltip="Valider" onClick={() => validateMessage(m.id, true)} variant="default" className="bg-emerald-600 hover:bg-emerald-700" /><IconBtn icon={<X className="h-3 w-3" />} tooltip="Rejeter" onClick={() => validateMessage(m.id, false)} variant="destructive" /></div>
                          </div>
                        )}
                        {m.status === 'APPROVED' && <div className="mt-2"><IconBtn icon={<Send className="h-3 w-3" />} tooltip="Marquer envoye" onClick={() => sendMessage(m.id)} variant="default" className="bg-indigo-600 hover:bg-indigo-700" /></div>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="maintenances" className="mt-3">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_1fr]">
              <Card className="h-fit border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><Wrench className="h-4 w-4 text-amber-600" /> Nouvelle maintenance</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Client</Label><Select value={maintenanceForm.clientId} onValueChange={(v) => setMaintenanceForm((p) => ({ ...p, clientId: v }))}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Client" /></SelectTrigger><SelectContent>{clients.map((c) => <SelectItem key={c.id_client} value={String(c.id_client)} className="text-xs">{c.client_ref} - {c.client_name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1"><Label className="text-xs">Type</Label><Select value={maintenanceForm.maintenanceType} onValueChange={(v) => setMaintenanceForm((p) => ({ ...p, maintenanceType: v as MaintenanceType }))}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PREVENTIVE" className="text-xs">Preventive</SelectItem><SelectItem value="CURATIVE" className="text-xs">Curative</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Visibilite</Label><div className="flex gap-2"><button type="button" onClick={() => setMaintenanceForm((p) => ({ ...p, visibility: 'PUBLIC' }))} className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border text-xs ${maintenanceForm.visibility === 'PUBLIC' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}><Globe className="h-3.5 w-3.5" /> Public</button><button type="button" onClick={() => setMaintenanceForm((p) => ({ ...p, visibility: 'PRIVATE' }))} className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border text-xs ${maintenanceForm.visibility === 'PRIVATE' ? 'border-slate-700 bg-slate-100 text-slate-800 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}><Lock className="h-3.5 w-3.5" /> Prive</button></div></div>
                  <div className="space-y-1"><Label className="text-xs">Titre</Label><Input className="h-8 text-xs" value={maintenanceForm.title} onChange={(e) => setMaintenanceForm((p) => ({ ...p, title: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Details</Label><Textarea className="text-xs" rows={2} value={maintenanceForm.details} onChange={(e) => setMaintenanceForm((p) => ({ ...p, details: e.target.value }))} /></div>
                  <Button className="h-8 w-full gap-2 text-xs" onClick={createMaintenance}><Plus className="h-3.5 w-3.5" /> Creer la maintenance</Button>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><Wrench className="h-4 w-4 text-slate-500" /> Maintenances</CardTitle></CardHeader>
                <CardContent>
                  <div className="max-h-140 space-y-2 overflow-y-auto pr-1">
                    {maintenances.length === 0 ? <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-10 text-center dark:border-slate-700"><Wrench className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" /><p className="text-sm text-slate-500 dark:text-slate-400">Aucune maintenance</p></div> : maintenances.map((m) => (
                      <div key={m.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex flex-wrap items-center gap-1.5"><Badge className={`px-1.5 py-0 text-[9px] ${m.maintenanceType === 'PREVENTIVE' ? 'bg-sky-600 text-white' : 'bg-orange-500 text-white'}`}>{m.maintenanceType}</Badge><span className="flex items-center gap-0.5 text-[10px] text-slate-500">{m.visibility === 'PUBLIC' ? <Globe className="h-3 w-3 text-emerald-600" /> : <Lock className="h-3 w-3 text-slate-500" />}{m.visibility === 'PUBLIC' ? 'Public' : 'Prive'}</span></div>
                        <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{m.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{m.clientName} - {formatDateTime(m.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tickets" className="mt-3">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[400px_1fr]">
              <Card className="h-fit border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><ActivitySquare className="h-4 w-4 text-violet-600" /> Nouveau ticket</CardTitle><CardDescription className="text-xs">Incident, Survey, Deploiement ou Supervision.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Type ticket</Label><Select value={ticketForm.ticketType} onValueChange={(v) => setTicketForm((p) => ({ ...p, ticketType: v as TicketType }))}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INCIDENT" className="text-xs">Incident</SelectItem><SelectItem value="SURVEY" className="text-xs">Survey</SelectItem><SelectItem value="DEPLOIEMENT" className="text-xs">Deploiement</SelectItem><SelectItem value="SUPERVISION" className="text-xs">Supervision</SelectItem></SelectContent></Select></div>
                    <div className="space-y-1"><Label className="text-xs">Client</Label><Select value={ticketForm.clientId} onValueChange={(v) => setTicketForm((p) => ({ ...p, clientId: v }))}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Client" /></SelectTrigger><SelectContent>{clients.map((c) => <SelectItem key={c.id_client} value={String(c.id_client)} className="text-xs">{c.client_ref} - {c.client_name}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Priorite</Label><Select value={ticketForm.priority} onValueChange={(v) => setTicketForm((p) => ({ ...p, priority: v as Priority }))}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CRITICAL" className="text-xs">Critique</SelectItem><SelectItem value="HIGH" className="text-xs">Haute</SelectItem><SelectItem value="MEDIUM" className="text-xs">Moyenne</SelectItem><SelectItem value="LOW" className="text-xs">Basse</SelectItem></SelectContent></Select></div>
                    <div className="space-y-1"><Label className="text-xs">Technicien responsable</Label><div className="relative"><User className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" /><Input className="h-8 pl-6 text-xs" value={ticketForm.assignedTech} onChange={(e) => setTicketForm((p) => ({ ...p, assignedTech: e.target.value }))} placeholder="Nom du technicien" /></div></div>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Titre</Label><Input className="h-8 text-xs" value={ticketForm.title} onChange={(e) => setTicketForm((p) => ({ ...p, title: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Description</Label><Textarea className="text-xs" rows={3} value={ticketForm.description} onChange={(e) => setTicketForm((p) => ({ ...p, description: e.target.value }))} /></div>
                  <Button className="h-8 w-full gap-2 text-xs" onClick={createTicket}><Plus className="h-3.5 w-3.5" /> Creer le ticket</Button>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold"><ActivitySquare className="h-4 w-4 text-slate-500" /> Tickets - {tickets.length}</CardTitle>
                    <Button size="sm" variant={showTicketTracker ? 'default' : 'outline'} className="h-7 gap-1.5 text-xs" onClick={() => setShowTicketTracker((v) => !v)}><Eye className="h-3.5 w-3.5" /> Suivre les tickets {openTickets.length > 0 && <Badge className="ml-1 h-4 min-w-4 px-1 py-0 text-[9px]">{openTickets.length}</Badge>}</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-140 space-y-2 overflow-y-auto pr-1">
                    {(showTicketTracker ? openTickets : tickets).length === 0 ? <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-10 text-center dark:border-slate-700"><ActivitySquare className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" /><p className="text-sm text-slate-500 dark:text-slate-400">{showTicketTracker ? 'Aucun ticket ouvert' : 'Aucun ticket'}</p></div> : (showTicketTracker ? openTickets : tickets).map((t, idx) => {
                      const iconByType = {
                        INCIDENT: <ActivitySquare className="mr-0.5 inline h-2.5 w-2.5" />,
                        SURVEY: <FileSearch className="mr-0.5 inline h-2.5 w-2.5" />,
                        DEPLOIEMENT: <Layers className="mr-0.5 inline h-2.5 w-2.5" />,
                        SUPERVISION: <Radar className="mr-0.5 inline h-2.5 w-2.5" />,
                      } as const;

                      return (
                        <motion.div key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5"><Badge className={`px-1.5 py-0 text-[9px] ${TICKET_TYPE_COLOR[t.ticketType]}`}>{iconByType[t.ticketType]}{TICKET_TYPE_LABEL[t.ticketType]}</Badge><Badge className={`px-1.5 py-0 text-[9px] ${PRIORITY_BADGE[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</Badge><Badge className={`px-1.5 py-0 text-[9px] ${TICKET_STATUS_BADGE[t.status]}`}>{TICKET_STATUS_LABEL[t.status]}</Badge></div>
                              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{t.title}</p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><span>{t.clientName} - {formatDateTime(t.createdAt)}</span>{t.assignedTech && <span className="flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800"><User className="h-2.5 w-2.5" /> {t.assignedTech}</span>}</div>
                              {t.description && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{t.description}</p>}
                              <TicketStepper status={t.status} />
                            </div>
                            <div className="flex flex-col gap-1"><IconBtn icon={<Circle className="h-3 w-3" />} tooltip="Ouvert" onClick={() => updateTicketStatus(t.id, 'OUVERT')} variant={t.status === 'OUVERT' ? 'default' : 'outline'} /><IconBtn icon={<Play className="h-3 w-3" />} tooltip="En cours" onClick={() => updateTicketStatus(t.id, 'EN_COURS')} variant={t.status === 'EN_COURS' ? 'default' : 'outline'} /><IconBtn icon={<Check className="h-3 w-3" />} tooltip="Resolu" onClick={() => updateTicketStatus(t.id, 'RESOLU')} variant={t.status === 'RESOLU' ? 'default' : 'outline'} /><IconBtn icon={<X className="h-3 w-3" />} tooltip="Ferme" onClick={() => updateTicketStatus(t.id, 'FERME')} variant={t.status === 'FERME' ? 'default' : 'outline'} /></div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 md:grid-cols-3">
          <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-500" /> Scope NOC national</div>
          <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-500" /> Support telephonique prioritaire</div>
          <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-500" /> Workflow de validation messages</div>
          <div className="flex items-center gap-2"><MessageCircle className="h-3.5 w-3.5 text-slate-500" /> Communication coordonnee</div>
          <div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-slate-500" /> Gouvernance et validation</div>
          <div className="flex items-center gap-2"><ActivitySquare className="h-3.5 w-3.5 text-slate-500" /> Suivi tickets en temps reel</div>
        </div>
      </div>
    </TooltipProvider>
  );
}
