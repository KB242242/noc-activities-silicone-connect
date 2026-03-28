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
  Plus, Edit, Trash2, Search, User, Wrench, Phone, Mail,
  Eye, X, AlertTriangle, CheckCircle, Clock
} from 'lucide-react';
import { Technician, TechnicianUnit } from '@/types';
import { generateId, saveToStorage, loadFromStorage } from '@/lib/utils';
import { TECHNICIAN_UNITS, DEFAULT_TECHNICIANS } from '@/lib/constants';

interface TechniciansManagementProps {
  userRole: string;
}

export default function TechniciansManagement({ userRole }: TechniciansManagementProps) {
  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    const saved = loadFromStorage<Technician[]>('noc_technicians', []);
    if (saved.length === 0) {
      // Initialize with default technicians
      return DEFAULT_TECHNICIANS.map(t => ({
        ...t,
        id: generateId(),
        isActive: true,
        assignedTicketsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    }
    return saved;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    pseudo: '',
    department: 'Technique',
    unit: 'NOC' as TechnicianUnit,
    email: '',
    phone: '',
    isActive: true
  });

  // Save to localStorage
  useEffect(() => {
    saveToStorage('noc_technicians', technicians);
  }, [technicians]);

  // Filter technicians
  const filteredTechnicians = technicians.filter(tech => {
    const matchesSearch =
      tech.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.pseudo.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesUnit = unitFilter === 'all' || tech.unit === unitFilter;

    return matchesSearch && matchesUnit;
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      pseudo: '',
      department: 'Technique',
      unit: 'NOC',
      email: '',
      phone: '',
      isActive: true
    });
  };

  // Generate pseudo from name
  const generatePseudo = (firstName: string, lastName: string) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName}`.toLowerCase();
    }
    return firstName || lastName;
  };

  // Create technician
  const handleCreate = () => {
    if (!formData.firstName.trim()) {
      toast.error('Le prénom est requis');
      return;
    }

    const pseudo = formData.pseudo || generatePseudo(formData.firstName, formData.lastName);

    // Check if pseudo already exists
    if (technicians.some(t => t.pseudo.toLowerCase() === pseudo.toLowerCase())) {
      toast.error('Ce pseudo existe déjà');
      return;
    }

    const newTechnician: Technician = {
      id: generateId(),
      firstName: formData.firstName,
      lastName: formData.lastName,
      pseudo: pseudo,
      department: formData.department,
      unit: formData.unit,
      email: formData.email,
      phone: formData.phone,
      isActive: formData.isActive,
      assignedTicketsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setTechnicians(prev => [...prev, newTechnician]);
    setCreateDialogOpen(false);
    resetForm();
    toast.success('Technicien créé avec succès');
  };

  // Update technician
  const handleUpdate = () => {
    if (!selectedTechnician || !formData.firstName.trim()) {
      toast.error('Le prénom est requis');
      return;
    }

    setTechnicians(prev => prev.map(t =>
      t.id === selectedTechnician.id
        ? {
          ...t,
          firstName: formData.firstName,
          lastName: formData.lastName,
          pseudo: formData.pseudo,
          department: formData.department,
          unit: formData.unit,
          email: formData.email,
          phone: formData.phone,
          isActive: formData.isActive,
          updatedAt: new Date()
        }
        : t
    ));

    setEditDialogOpen(false);
    resetForm();
    setSelectedTechnician(null);
    toast.success('Technicien mis à jour avec succès');
  };

  // Delete technician
  const handleDelete = () => {
    if (!selectedTechnician) return;

    setTechnicians(prev => prev.filter(t => t.id !== selectedTechnician.id));
    setDeleteDialogOpen(false);
    setSelectedTechnician(null);
    toast.success('Technicien supprimé avec succès');
  };

  // Open edit dialog
  const openEditDialog = (tech: Technician) => {
    setSelectedTechnician(tech);
    setFormData({
      firstName: tech.firstName,
      lastName: tech.lastName,
      pseudo: tech.pseudo,
      department: tech.department,
      unit: tech.unit,
      email: tech.email || '',
      phone: tech.phone || '',
      isActive: tech.isActive
    });
    setEditDialogOpen(true);
  };

  // Open detail dialog
  const openDetailDialog = (tech: Technician) => {
    setSelectedTechnician(tech);
    setDetailDialogOpen(true);
  };

  // Get unit color
  const getUnitColor = (unit: TechnicianUnit) => {
    return TECHNICIAN_UNITS[unit]?.color || 'text-gray-600';
  };

  // Technician Form Component
  const TechnicianForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => {
              setFormData(prev => ({
                ...prev,
                firstName: e.target.value,
                pseudo: prev.pseudo || generatePseudo(e.target.value, prev.lastName)
              }));
            }}
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

      <div className="space-y-2">
        <Label htmlFor="pseudo">Pseudo *</Label>
        <Input
          id="pseudo"
          value={formData.pseudo}
          onChange={(e) => setFormData(prev => ({ ...prev, pseudo: e.target.value }))}
          placeholder="Pseudo unique"
        />
        <p className="text-xs text-muted-foreground">Identifiant unique pour le technicien</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="department">Département</Label>
          <Input
            id="department"
            value={formData.department}
            disabled
            className="bg-gray-50 dark:bg-gray-800"
          />
          <p className="text-xs text-muted-foreground">Département fixe: Technique</p>
        </div>
        <div className="space-y-2">
          <Label>Unité</Label>
          <Select
            value={formData.unit}
            onValueChange={(value: TechnicianUnit) => setFormData(prev => ({ ...prev, unit: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TECHNICIAN_UNITS).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <span className={config.color}>{config.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="email@exemple.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+242 XX XXX XXXX"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Techniciens</h2>
          <p className="text-muted-foreground">Gérez les techniciens de Silicone Connect</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nouveau Technicien
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{technicians.length}</div>
            <p className="text-sm text-muted-foreground">Total Techniciens</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {technicians.filter(t => t.isActive).length}
            </div>
            <p className="text-sm text-muted-foreground">Actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {technicians.filter(t => t.unit === 'NOC').length}
            </div>
            <p className="text-sm text-muted-foreground">NOC</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              {technicians.filter(t => t.unit === 'Field_Technician').length}
            </div>
            <p className="text-sm text-muted-foreground">Terrain</p>
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
                  placeholder="Rechercher un technicien..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Unité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les unités</SelectItem>
                {Object.entries(TECHNICIAN_UNITS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Technicians Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTechnicians.map((tech) => (
          <Card key={tech.id} className={`hover:shadow-md transition-shadow ${!tech.isActive ? 'opacity-60' : ''}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${tech.isActive ? 'bg-blue-500' : 'bg-gray-400'}`}>
                    {tech.firstName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{tech.firstName} {tech.lastName}</h3>
                      {!tech.isActive && (
                        <Badge variant="secondary" className="text-xs">Inactif</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">@{tech.pseudo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openDetailDialog(tech)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(tech)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { setSelectedTechnician(tech); setDeleteDialogOpen(true); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={`${getUnitColor(tech.unit)} bg-opacity-20`}>
                    {TECHNICIAN_UNITS[tech.unit]?.label}
                  </Badge>
                  <Badge variant="outline">{tech.department}</Badge>
                </div>

                {tech.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{tech.email}</span>
                  </div>
                )}

                {tech.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    <span>{tech.phone}</span>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-2 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span>{tech.assignedTicketsCount} tickets</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau Technicien</DialogTitle>
            <DialogDescription>Ajoutez un nouveau technicien à l'équipe</DialogDescription>
          </DialogHeader>
          <TechnicianForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate}>Créer le technicien</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le Technicien</DialogTitle>
            <DialogDescription>Modifiez les informations du technicien</DialogDescription>
          </DialogHeader>
          <TechnicianForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdate}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {selectedTechnician?.firstName.charAt(0)}
              </div>
              <div>
                <div>{selectedTechnician?.firstName} {selectedTechnician?.lastName}</div>
                <div className="text-sm font-normal text-muted-foreground">@{selectedTechnician?.pseudo}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedTechnician && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={`${getUnitColor(selectedTechnician.unit)}`}>
                  {TECHNICIAN_UNITS[selectedTechnician.unit]?.label}
                </Badge>
                <Badge variant="outline">{selectedTechnician.department}</Badge>
                {selectedTechnician.isActive ? (
                  <Badge className="bg-green-100 text-green-800">Actif</Badge>
                ) : (
                  <Badge variant="secondary">Inactif</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p>{selectedTechnician.email || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Téléphone</Label>
                  <p>{selectedTechnician.phone || '-'}</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Statistiques</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{selectedTechnician.assignedTicketsCount} tickets assignés</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>Cette semaine: {Math.floor(Math.random() * 5)} tickets</span>
                  </div>
                </div>
              </div>
            </div>
          )}
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
              Êtes-vous sûr de vouloir supprimer le technicien "{selectedTechnician?.firstName} {selectedTechnician?.lastName}" ?
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
