'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Plus, Edit, Trash2, Search, Building2, Phone, Mail, MapPin,
  Calendar, FileText, Download, Eye, X, User, AlertTriangle,
  ChevronDown, ChevronUp, Crown, Star, Award, Medal
} from 'lucide-react';
import { ClientSC, ClientType, ServiceType, ResponsiblePerson } from '@/types';
import { generateId, formatDate, saveToStorage, loadFromStorage } from '@/lib/utils';
import { CLIENT_TYPE_CONFIG, SERVICE_TYPE_CONFIG, ALL_CLIENTS, LOCALITIES_LIST } from '@/lib/constants';

interface ClientsManagementProps {
  userRole: string;
}

export default function ClientsManagement({ userRole }: ClientsManagementProps) {
  const [clients, setClients] = useState<ClientSC[]>(() =>
    loadFromStorage('noc_clients', [])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientSC | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    district: '',
    address: '',
    phone: '',
    email: '',
    clientType: 'Standard' as ClientType,
    serviceType: 'Internet' as ServiceType,
    ipAddress: '',
    contractStartDate: '',
    contractEndDate: '',
    responsiblePersons: [] as ResponsiblePerson[]
  });

  const [newResponsible, setNewResponsible] = useState({
    name: '',
    phone: '',
    email: '',
    role: ''
  });

  // Save to localStorage whenever clients change
  useEffect(() => {
    saveToStorage('noc_clients', clients);
  }, [clients]);

  // Filter clients
  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.district.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = clientTypeFilter === 'all' || client.clientType === clientTypeFilter;
    const matchesService = serviceTypeFilter === 'all' || client.serviceType === serviceTypeFilter;

    return matchesSearch && matchesType && matchesService;
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      department: '',
      district: '',
      address: '',
      phone: '',
      email: '',
      clientType: 'Standard',
      serviceType: 'Internet',
      ipAddress: '',
      contractStartDate: '',
      contractEndDate: '',
      responsiblePersons: []
    });
    setNewResponsible({ name: '', phone: '', email: '', role: '' });
  };

  // Add responsible person
  const addResponsiblePerson = () => {
    if (!newResponsible.name.trim()) {
      toast.error('Le nom du responsable est requis');
      return;
    }

    setFormData(prev => ({
      ...prev,
      responsiblePersons: [
        ...prev.responsiblePersons,
        { id: generateId(), ...newResponsible }
      ]
    }));
    setNewResponsible({ name: '', phone: '', email: '', role: '' });
    toast.success('Responsable ajouté');
  };

  // Remove responsible person
  const removeResponsiblePerson = (id: string) => {
    setFormData(prev => ({
      ...prev,
      responsiblePersons: prev.responsiblePersons.filter(r => r.id !== id)
    }));
  };

  // Create client
  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error('Le nom du client est requis');
      return;
    }

    const newClient: ClientSC = {
      id: generateId(),
      name: formData.name,
      department: formData.department,
      district: formData.district,
      address: formData.address,
      phone: formData.phone,
      email: formData.email,
      clientType: formData.clientType,
      serviceType: formData.serviceType,
      ipAddress: formData.ipAddress,
      contractStartDate: formData.contractStartDate ? new Date(formData.contractStartDate) : undefined,
      contractEndDate: formData.contractEndDate ? new Date(formData.contractEndDate) : undefined,
      responsiblePersons: formData.responsiblePersons,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    setClients(prev => [...prev, newClient]);
    setCreateDialogOpen(false);
    resetForm();
    toast.success('Client créé avec succès');
  };

  // Update client
  const handleUpdate = () => {
    if (!selectedClient || !formData.name.trim()) {
      toast.error('Le nom du client est requis');
      return;
    }

    setClients(prev => prev.map(c =>
      c.id === selectedClient.id
        ? {
          ...c,
          name: formData.name,
          department: formData.department,
          district: formData.district,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          clientType: formData.clientType,
          serviceType: formData.serviceType,
          ipAddress: formData.ipAddress,
          contractStartDate: formData.contractStartDate ? new Date(formData.contractStartDate) : undefined,
          contractEndDate: formData.contractEndDate ? new Date(formData.contractEndDate) : undefined,
          responsiblePersons: formData.responsiblePersons,
          updatedAt: new Date()
        }
        : c
    ));

    setEditDialogOpen(false);
    resetForm();
    setSelectedClient(null);
    toast.success('Client mis à jour avec succès');
  };

  // Delete client
  const handleDelete = () => {
    if (!selectedClient) return;

    setClients(prev => prev.filter(c => c.id !== selectedClient.id));
    setDeleteDialogOpen(false);
    setSelectedClient(null);
    toast.success('Client supprimé avec succès');
  };

  // Open edit dialog
  const openEditDialog = (client: ClientSC) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      department: client.department,
      district: client.district,
      address: client.address || '',
      phone: client.phone || '',
      email: client.email || '',
      clientType: client.clientType,
      serviceType: client.serviceType,
      ipAddress: client.ipAddress || '',
      contractStartDate: client.contractStartDate ? new Date(client.contractStartDate).toISOString().split('T')[0] : '',
      contractEndDate: client.contractEndDate ? new Date(client.contractEndDate).toISOString().split('T')[0] : '',
      responsiblePersons: client.responsiblePersons || []
    });
    setEditDialogOpen(true);
  };

  // Open detail dialog
  const openDetailDialog = (client: ClientSC) => {
    setSelectedClient(client);
    setDetailDialogOpen(true);
  };

  // Get client type icon
  const getClientTypeIcon = (type: ClientType) => {
    switch (type) {
      case 'Gold': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'Premium': return <Star className="w-4 h-4 text-purple-500" />;
      case 'Standard': return <Award className="w-4 h-4 text-blue-500" />;
      case 'Bronze': return <Medal className="w-4 h-4 text-orange-500" />;
    }
  };

  // Client Form Component
  const ClientForm = () => (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom du client *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Nom de l'entreprise"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">Département</Label>
          <Select
            value={formData.department}
            onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Brazzaville">Brazzaville</SelectItem>
              <SelectItem value="Pointe-Noire">Pointe-Noire</SelectItem>
              <SelectItem value="Dolisie">Dolisie</SelectItem>
              <SelectItem value="Nkayi">Nkayi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="district">Quartier</Label>
          <Input
            id="district"
            value={formData.district}
            onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
            placeholder="Quartier"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Adresse</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="Adresse complète"
          />
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+242 XX XXX XXXX"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="contact@client.com"
          />
        </div>
      </div>

      {/* Client & Service Type */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type de Client</Label>
          <Select
            value={formData.clientType}
            onValueChange={(value: ClientType) => setFormData(prev => ({ ...prev, clientType: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CLIENT_TYPE_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    {getClientTypeIcon(key as ClientType)}
                    {config.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Type de Service</Label>
          <Select
            value={formData.serviceType}
            onValueChange={(value: ServiceType) => setFormData(prev => ({ ...prev, serviceType: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SERVICE_TYPE_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* IP Address */}
      <div className="space-y-2">
        <Label htmlFor="ipAddress">Adresse IP</Label>
        <Input
          id="ipAddress"
          value={formData.ipAddress}
          onChange={(e) => setFormData(prev => ({ ...prev, ipAddress: e.target.value }))}
          placeholder="192.168.99.X ou 102.220.XXX.XXX"
        />
      </div>

      {/* Contract Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date de début du contrat</Label>
          <Input
            type="date"
            value={formData.contractStartDate}
            onChange={(e) => setFormData(prev => ({ ...prev, contractStartDate: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Date de fin du contrat</Label>
          <Input
            type="date"
            value={formData.contractEndDate}
            onChange={(e) => setFormData(prev => ({ ...prev, contractEndDate: e.target.value }))}
          />
        </div>
      </div>

      {/* Responsible Persons */}
      <div className="space-y-2">
        <Label>Responsables à contacter</Label>
        <div className="border rounded-lg p-3 space-y-3">
          {formData.responsiblePersons.length > 0 && (
            <div className="space-y-2">
              {formData.responsiblePersons.map((person, index) => (
                <div key={person.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{person.name}</span>
                    {person.role && <span className="text-sm text-gray-500">({person.role})</span>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeResponsiblePerson(person.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            <Input
              placeholder="Nom"
              value={newResponsible.name}
              onChange={(e) => setNewResponsible(prev => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder="Téléphone"
              value={newResponsible.phone}
              onChange={(e) => setNewResponsible(prev => ({ ...prev, phone: e.target.value }))}
            />
            <Input
              placeholder="Rôle"
              value={newResponsible.role}
              onChange={(e) => setNewResponsible(prev => ({ ...prev, role: e.target.value }))}
            />
            <Button type="button" variant="outline" onClick={addResponsiblePerson}>
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Clients SC</h2>
          <p className="text-muted-foreground">Gérez les clients de Silicone Connect</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nouveau Client
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {Object.entries(CLIENT_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les services</SelectItem>
                {Object.entries(SERVICE_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      <div className="grid gap-4">
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium">Aucun client trouvé</h3>
              <p className="text-muted-foreground">
                {searchQuery || clientTypeFilter !== 'all' || serviceTypeFilter !== 'all'
                  ? 'Essayez de modifier vos filtres'
                  : 'Commencez par créer un nouveau client'}
              </p>
              {!searchQuery && clientTypeFilter === 'all' && serviceTypeFilter === 'all' && (
                <Button className="mt-4" onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" /> Créer un client
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${CLIENT_TYPE_CONFIG[client.clientType].bgColor}`}>
                      {getClientTypeIcon(client.clientType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{client.name}</h3>
                        <Badge className={CLIENT_TYPE_CONFIG[client.clientType].bgColor}>
                          {client.clientType}
                        </Badge>
                        <Badge variant="outline" className={SERVICE_TYPE_CONFIG[client.serviceType].color}>
                          {SERVICE_TYPE_CONFIG[client.serviceType].label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {client.department}{client.district && `, ${client.district}`}
                        </span>
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </span>
                        )}
                        {client.ipAddress && (
                          <span className="flex items-center gap-1">
                            <span className="font-mono text-xs">{client.ipAddress}</span>
                          </span>
                        )}
                      </div>
                      {client.responsiblePersons.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {client.responsiblePersons.map(r => r.name).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openDetailDialog(client)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(client)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { setSelectedClient(client); setDeleteDialogOpen(true); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau Client</DialogTitle>
            <DialogDescription>Créez un nouveau client Silicone Connect</DialogDescription>
          </DialogHeader>
          <ClientForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate}>Créer le client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le Client</DialogTitle>
            <DialogDescription>Modifiez les informations du client</DialogDescription>
          </DialogHeader>
          <ClientForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdate}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedClient && getClientTypeIcon(selectedClient.clientType)}
              {selectedClient?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={CLIENT_TYPE_CONFIG[selectedClient.clientType].bgColor}>
                  {selectedClient.clientType}
                </Badge>
                <Badge variant="outline" className={SERVICE_TYPE_CONFIG[selectedClient.serviceType].color}>
                  {SERVICE_TYPE_CONFIG[selectedClient.serviceType].label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Département</Label>
                  <p>{selectedClient.department}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Quartier</Label>
                  <p>{selectedClient.district || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Téléphone</Label>
                  <p>{selectedClient.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p>{selectedClient.email || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Adresse IP</Label>
                  <p className="font-mono">{selectedClient.ipAddress || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Adresse</Label>
                  <p>{selectedClient.address || '-'}</p>
                </div>
              </div>

              {selectedClient.responsiblePersons.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Responsables</Label>
                  <div className="mt-2 space-y-2">
                    {selectedClient.responsiblePersons.map(person => (
                      <div key={person.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <User className="w-4 h-4" />
                        <span>{person.name}</span>
                        {person.role && <span className="text-sm text-muted-foreground">({person.role})</span>}
                        {person.phone && <span className="text-sm text-muted-foreground">- {person.phone}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1">
                  <FileText className="w-4 h-4 mr-2" /> Rapport de consommation
                </Button>
                <Button variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" /> Rapport de disponibilité
                </Button>
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
              Êtes-vous sûr de vouloir supprimer le client "{selectedClient?.name}" ?
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
