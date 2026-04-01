'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus, Edit, Trash2, Search, User, Phone, Mail,
  Eye, X, AlertTriangle, CheckCircle, Clock, Calendar
} from 'lucide-react';
import { UserProfile, UserRole, ResponsibilityType } from '@/types';
import { generateId, saveToStorage, loadFromStorage } from '@/lib/utils';
import { ROLE_CONFIG, SHIFTS_DATA } from '@/lib/constants';

interface AgentsManagementProps {
  userRole: string;
}

const RESPONSIBILITY_CONFIG: Record<ResponsibilityType, { label: string; color: string }> = {
  CALL_CENTER: { label: 'Call Center', color: 'text-blue-600' },
  MONITORING: { label: 'Monitoring', color: 'text-green-600' },
  REPORTING_1: { label: 'Reporting 1', color: 'text-purple-600' },
  REPORTING_2: { label: 'Reporting 2', color: 'text-orange-600' }
};

export default function AgentsManagement({ userRole }: AgentsManagementProps) {
  const [agents, setAgents] = useState<UserProfile[]>(() =>
    loadFromStorage('noc_agents', [])
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<UserProfile | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phone: '',
    role: 'TECHNICIEN_NO' as UserRole,
    shiftId: '',
    responsibility: '' as ResponsibilityType | '',
    isActive: true
  });

  // Save to localStorage
  useEffect(() => {
    saveToStorage('noc_agents', agents);
  }, [agents]);

  // Filter agents
  const filteredAgents = agents.filter(agent => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesShift = shiftFilter === 'all' || agent.shiftId === shiftFilter;
    const matchesRole = roleFilter === 'all' || agent.role === roleFilter;

    return matchesSearch && matchesShift && matchesRole;
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      phone: '',
      role: 'TECHNICIEN_NO',
      shiftId: '',
      responsibility: '',
      isActive: true
    });
  };

  // Create agent
  const handleCreate = () => {
    if (!formData.firstName.trim()) {
      toast.error('Le prénom est requis');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('L\'email est requis');
      return;
    }

    // Check if email already exists
    if (agents.some(a => a.email.toLowerCase() === formData.email.toLowerCase())) {
      toast.error('Cet email existe déjà');
      return;
    }

    const newAgent: UserProfile = {
      id: generateId(),
      email: formData.email,
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      firstName: formData.firstName,
      lastName: formData.lastName,
      username: formData.username || formData.firstName.toLowerCase(),
      role: formData.role,
      shiftId: formData.shiftId || null,
      shift: formData.shiftId ? {
        id: formData.shiftId,
        name: formData.shiftId.replace('shift-', '').toUpperCase(),
        color: SHIFTS_DATA[formData.shiftId.replace('shift-', '')]?.color || 'blue',
        colorCode: SHIFTS_DATA[formData.shiftId.replace('shift-', '')]?.colorCode || '#3B82F6'
      } : null,
      responsibility: formData.responsibility || undefined,
      isActive: formData.isActive,
      isBlocked: false,
      isFirstLogin: true,
      mustChangePassword: true,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setAgents(prev => [...prev, newAgent]);
    setCreateDialogOpen(false);
    resetForm();
    toast.success('Agent créé avec succès');
  };

  // Update agent
  const handleUpdate = () => {
    if (!selectedAgent || !formData.firstName.trim()) {
      toast.error('Le prénom est requis');
      return;
    }

    setAgents(prev => prev.map(a =>
      a.id === selectedAgent.id
        ? {
          ...a,
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          username: formData.username,
          role: formData.role,
          shiftId: formData.shiftId || null,
          shift: formData.shiftId ? {
            id: formData.shiftId,
            name: formData.shiftId.replace('shift-', '').toUpperCase(),
            color: SHIFTS_DATA[formData.shiftId.replace('shift-', '')]?.color || 'blue',
            colorCode: SHIFTS_DATA[formData.shiftId.replace('shift-', '')]?.colorCode || '#3B82F6'
          } : null,
          responsibility: formData.responsibility || undefined,
          isActive: formData.isActive,
          updatedAt: new Date()
        }
        : a
    ));

    setEditDialogOpen(false);
    resetForm();
    setSelectedAgent(null);
    toast.success('Agent mis à jour avec succès');
  };

  // Delete agent
  const handleDelete = () => {
    if (!selectedAgent) return;

    setAgents(prev => prev.filter(a => a.id !== selectedAgent.id));
    setDeleteDialogOpen(false);
    setSelectedAgent(null);
    toast.success('Agent supprimé avec succès');
  };

  // Open edit dialog
  const openEditDialog = (agent: UserProfile) => {
    setSelectedAgent(agent);
    setFormData({
      firstName: agent.firstName || '',
      lastName: agent.lastName || '',
      email: agent.email,
      username: agent.username || '',
      phone: '',
      role: agent.role,
      shiftId: agent.shiftId || '',
      responsibility: agent.responsibility || '',
      isActive: agent.isActive
    });
    setEditDialogOpen(true);
  };

  // Agent Form Component
  const AgentForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            placeholder="Prénom"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            placeholder="Nom"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="email@siliconeconnect.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">Pseudo</Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            placeholder="pseudo"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Rôle</Label>
          <Select
            value={formData.role}
            onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <span className={config.color}>{config.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Shift</Label>
          <Select
            value={formData.shiftId}
            onValueChange={(value) => setFormData(prev => ({ ...prev, shiftId: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un shift" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Aucun shift</SelectItem>
              <SelectItem value="shift-a">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  Shift A
                </div>
              </SelectItem>
              <SelectItem value="shift-b">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  Shift B
                </div>
              </SelectItem>
              <SelectItem value="shift-c">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  Shift C
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.role === 'TECHNICIEN_NO' && (
        <div className="space-y-2">
          <Label>Responsabilité</Label>
          <Select
            value={formData.responsibility}
            onValueChange={(value: ResponsibilityType | '') => setFormData(prev => ({ ...prev, responsibility: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une responsabilité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Aucune</SelectItem>
              {Object.entries(RESPONSIBILITY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <span className={config.color}>{config.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Agents</h2>
          <p className="text-muted-foreground">Gérez les agents et utilisateurs du système</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nouvel Agent
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{agents.length}</div>
            <p className="text-sm text-muted-foreground">Total Agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {agents.filter(a => a.isActive).length}
            </div>
            <p className="text-sm text-muted-foreground">Actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {agents.filter(a => a.role === 'TECHNICIEN_NO').length}
            </div>
            <p className="text-sm text-muted-foreground">Techniciens NOC</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {agents.filter(a => a.role === 'RESPONSABLE').length}
            </div>
            <p className="text-sm text-muted-foreground">Responsables</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un agent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={shiftFilter} onValueChange={setShiftFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les shifts</SelectItem>
                <SelectItem value="shift-a">Shift A</SelectItem>
                <SelectItem value="shift-b">Shift B</SelectItem>
                <SelectItem value="shift-c">Shift C</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map((agent) => (
          <Card key={agent.id} className={`hover:shadow-md transition-shadow ${!agent.isActive ? 'opacity-60' : ''}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: agent.shift?.colorCode || '#6B7280' }}
                  >
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{agent.name}</h3>
                      {!agent.isActive && (
                        <Badge variant="secondary" className="text-xs">Inactif</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{agent.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(agent)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { setSelectedAgent(agent); setDeleteDialogOpen(true); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={ROLE_CONFIG[agent.role]?.bgColor}>
                    {ROLE_CONFIG[agent.role]?.label}
                  </Badge>
                  {agent.shift && (
                    <Badge variant="outline" style={{ borderColor: agent.shift.colorCode, color: agent.shift.colorCode }}>
                      Shift {agent.shift.name}
                    </Badge>
                  )}
                </div>

                {agent.responsibility && (
                  <div className="text-sm text-muted-foreground">
                    <span className={RESPONSIBILITY_CONFIG[agent.responsibility]?.color}>
                      {RESPONSIBILITY_CONFIG[agent.responsibility]?.label}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium">Aucun agent trouvé</h3>
            <p className="text-muted-foreground">
              {searchQuery || shiftFilter !== 'all' || roleFilter !== 'all'
                ? 'Essayez de modifier vos filtres'
                : 'Commencez par créer un nouvel agent'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvel Agent</DialogTitle>
            <DialogDescription>Ajoutez un nouvel agent ou utilisateur</DialogDescription>
          </DialogHeader>
          <AgentForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate}>Créer l'agent</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier l'Agent</DialogTitle>
            <DialogDescription>Modifiez les informations de l'agent</DialogDescription>
          </DialogHeader>
          <AgentForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdate}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer l'agent "{selectedAgent?.name}" ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
