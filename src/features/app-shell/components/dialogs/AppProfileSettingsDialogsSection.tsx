import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Coffee,
  Moon,
  MoonIcon,
  Phone,
  Settings,
  Sun,
  Trash2,
  TrendingUp,
  Upload,
  User,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

type AppProfileSettingsDialogsSectionProps = {
  restDialogOpen: boolean;
  setRestDialogOpen: (open: boolean) => void;
  user: any;
  userRestInfo: any;
  profileDialogOpen: boolean;
  setProfileDialogOpen: (open: boolean) => void;
  openAvatarViewer: any;
  avatarFileInputRef: React.RefObject<HTMLInputElement | null>;
  handleAvatarUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  persistUserProfile: any;
  fetchConversations: () => Promise<unknown>;
  editProfileDialogOpen: boolean;
  setEditProfileDialogOpen: (open: boolean) => void;
  editFirstName: string;
  setEditFirstName: (value: string) => void;
  editLastName: string;
  setEditLastName: (value: string) => void;
  editEmail: string;
  setEditEmail: (value: string) => void;
  editUsername: string;
  setEditUsername: (value: string) => void;
  handleSaveProfile: () => void;
  securityDialogOpen: boolean;
  setSecurityDialogOpen: (open: boolean) => void;
  setSelectedUser: (value: unknown) => void;
  setEditPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  isAdminPasswordResetMode: boolean;
  selectedUser: any;
  editPassword: string;
  confirmPassword: string;
  validatePassword: (value: string) => {
    hasMinLength: boolean;
    hasUppercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
    isValid: boolean;
    strength: 'weak' | 'medium' | 'strong';
  };
  handleSaveSecurity: () => void;
  shiftDialogOpen: boolean;
  setShiftDialogOpen: (open: boolean) => void;
  editShift: string;
  setEditShift: (value: string) => void;
  editResponsibility: string;
  setEditResponsibility: (value: any) => void;
  handleSaveShift: () => void;
  settingsDialogOpen: boolean;
  setSettingsDialogOpen: (open: boolean) => void;
  theme: string;
  setTheme: (value: string) => void;
};

type EmailDomainConfig = {
  id: string;
  domain: string;
  isActive: boolean;
  isDefault: boolean;
};

type UserDomainPolicy = {
  mode?: 'default' | 'custom' | 'allow_any';
  customDomains?: string[];
};

export function AppProfileSettingsDialogsSection({
  restDialogOpen,
  setRestDialogOpen,
  user,
  userRestInfo,
  profileDialogOpen,
  setProfileDialogOpen,
  openAvatarViewer,
  avatarFileInputRef,
  handleAvatarUpload,
  persistUserProfile,
  fetchConversations,
  editProfileDialogOpen,
  setEditProfileDialogOpen,
  editFirstName,
  setEditFirstName,
  editLastName,
  setEditLastName,
  editEmail,
  setEditEmail,
  editUsername,
  setEditUsername,
  handleSaveProfile,
  securityDialogOpen,
  setSecurityDialogOpen,
  setSelectedUser,
  setEditPassword,
  setConfirmPassword,
  isAdminPasswordResetMode,
  selectedUser,
  editPassword,
  confirmPassword,
  validatePassword,
  handleSaveSecurity,
  shiftDialogOpen,
  setShiftDialogOpen,
  editShift,
  setEditShift,
  editResponsibility,
  setEditResponsibility,
  handleSaveShift,
  settingsDialogOpen,
  setSettingsDialogOpen,
  theme,
  setTheme,
}: AppProfileSettingsDialogsSectionProps) {
  const [emailDomains, setEmailDomains] = useState<EmailDomainConfig[]>([]);
  const [selfDomainPolicy, setSelfDomainPolicy] = useState<UserDomainPolicy | null>(null);

  const loadEmailDomains = async () => {
    try {
      const response = await fetch('/api/users/email-domains', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success || !Array.isArray(data?.domains)) {
        return;
      }
      setEmailDomains(data.domains);
    } catch {
      // Keep fallback placeholder when domain settings are not reachable.
    }
  };

  const loadSelfDomainPolicy = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(
        `/api/users/domain-policy?actorId=${encodeURIComponent(user.id)}&userId=${encodeURIComponent(user.id)}`,
        { cache: 'no-store' }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success || !data?.policy) {
        return;
      }
      setSelfDomainPolicy(data.policy as UserDomainPolicy);
    } catch {
      // Keep default mode when policy endpoint is not reachable.
    }
  };

  useEffect(() => {
    void loadEmailDomains();
    void loadSelfDomainPolicy();
  }, []);

  useEffect(() => {
    const onDomainsUpdated = () => {
      void loadEmailDomains();
      void loadSelfDomainPolicy();
    };
    window.addEventListener('noc-email-domains-updated', onDomainsUpdated);
    return () => window.removeEventListener('noc-email-domains-updated', onDomainsUpdated);
  }, []);

  useEffect(() => {
    void loadSelfDomainPolicy();
  }, [user?.id]);

  const profileEmailPlaceholder = useMemo(() => {
    const currentEmail = String(editEmail || '').trim().toLowerCase();
    const atIndex = currentEmail.lastIndexOf('@');
    if (atIndex > 0 && atIndex < currentEmail.length - 1) {
      return `votre.email@${currentEmail.slice(atIndex + 1)}`;
    }

    const activeDomains = emailDomains.filter((entry) => entry.isActive).map((entry) => entry.domain);

    if (selfDomainPolicy?.mode === 'allow_any') {
      return 'votre.email@exemple.com';
    }

    if (selfDomainPolicy?.mode === 'custom' && Array.isArray(selfDomainPolicy.customDomains)) {
      const firstCustom = selfDomainPolicy.customDomains.find((domain) => {
        const normalized = String(domain ?? '').trim().toLowerCase().replace(/^@+/, '');
        return normalized.length > 0;
      });
      if (firstCustom) {
        const normalized = String(firstCustom).trim().toLowerCase().replace(/^@+/, '');
        return `votre.email@${normalized}`;
      }
    }

    const defaultDomain =
      emailDomains.find((entry) => entry.isDefault && entry.isActive)?.domain
      ?? activeDomains[0]
      ?? 'siliconeconnect.com';

    return `votre.email@${defaultDomain}`;
  }, [editEmail, emailDomains, selfDomainPolicy]);

  return (
    <>
      <Dialog open={restDialogOpen} onOpenChange={setRestDialogOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Mes jours de repos</DialogTitle>
            <DialogDescription>Calendrier de vos repos individuels et collectifs</DialogDescription>
          </DialogHeader>
          {user?.shift && userRestInfo && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2"><Coffee className="w-4 h-4" /> Repos Individuel</h4>
                <div className="p-3 rounded-lg bg-muted">
                  {userRestInfo.isOnIndividualRest ? (
                    <p className="text-green-600 font-medium">Vous êtes en repos aujourd'hui</p>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground">Prochain repos :</p>
                      <p className="font-bold">{userRestInfo.nextIndividualRest ? format(userRestInfo.nextIndividualRest, 'EEEE d MMMM yyyy', { locale: fr }) : 'Non planifié'}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2"><MoonIcon className="w-4 h-4" /> Repos Collectif</h4>
                <div className="p-3 rounded-lg bg-muted">
                  {userRestInfo.isOnCollectiveRest ? (
                    <p className="text-green-600 font-medium">Repos collectif en cours</p>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground">Prochain repos collectif :</p>
                      <p className="font-bold">{userRestInfo.nextCollectiveRestStart ? format(userRestInfo.nextCollectiveRestStart, 'EEEE d MMMM yyyy', { locale: fr }) : 'Non planifié'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button>Fermer</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Photo de profil</DialogTitle>
            <DialogDescription>Telechargez votre photo de profil</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <Avatar
              className="h-24 w-24 cursor-zoom-in"
              onClick={() => openAvatarViewer(user?.avatar, user?.name)}
            >
              {user?.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : null}
              <AvatarFallback className="bg-linear-to-br from-blue-500 to-cyan-500 text-white text-2xl">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>

            <Button
              type="button"
              className="flex items-center gap-2"
              onClick={() => avatarFileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              Choisir une image
            </Button>
            <Input
              id="avatar-upload"
              ref={avatarFileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarUpload}
            />

            {user?.avatar && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!user) return;
                  try {
                    await persistUserProfile({ avatar: null });
                    await fetchConversations();
                    toast.success('Photo supprimee', {
                      description: 'La suppression est enregistree en base de donnees.',
                    });
                  } catch (error) {
                    console.error('Erreur suppression avatar', error);
                    toast.error('Erreur', { description: 'Impossible de supprimer la photo de profil' });
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Supprimer
              </Button>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button>Fermer</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editProfileDialogOpen} onOpenChange={setEditProfileDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Modifier mes informations
            </DialogTitle>
            <DialogDescription>Mettez a jour vos informations professionnelles</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prenom</Label>
                <Input
                  id="firstName"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="Votre prenom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Votre nom"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email professionnel</Label>
              <Input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder={profileEmailPlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editUsername">Pseudo (optionnel)</Label>
              <Input
                id="editUsername"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Votre pseudo pour la connexion"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={handleSaveProfile}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={securityDialogOpen}
        onOpenChange={(open) => {
          setSecurityDialogOpen(open);
          if (!open) {
            setSelectedUser(null);
            setEditPassword('');
            setConfirmPassword('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {isAdminPasswordResetMode ? 'Réinitialiser mot de passe' : 'Sécuriser mon compte'}
            </DialogTitle>
            <DialogDescription>
              {isAdminPasswordResetMode
                ? `Definissez un nouveau mot de passe temporaire pour ${selectedUser?.name || 'cet utilisateur'}`
                : 'Definissez votre mot de passe securise'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editPassword">Nouveau mot de passe</Label>
              <Input
                id="editPassword"
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="********"
              />
              {editPassword && (
                <div className="text-xs space-y-1 mt-2">
                  <div className="flex items-center gap-2">
                    {validatePassword(editPassword).hasMinLength ?
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> :
                      <XCircle className="w-3 h-3 text-red-500" />}
                    <span className={validatePassword(editPassword).hasMinLength ? 'text-green-600' : 'text-red-600'}>
                      Minimum 8 caracteres
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {validatePassword(editPassword).hasUppercase ?
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> :
                      <XCircle className="w-3 h-3 text-red-500" />}
                    <span className={validatePassword(editPassword).hasUppercase ? 'text-green-600' : 'text-red-600'}>
                      1 majuscule minimum
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {validatePassword(editPassword).hasNumber ?
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> :
                      <XCircle className="w-3 h-3 text-red-500" />}
                    <span className={validatePassword(editPassword).hasNumber ? 'text-green-600' : 'text-red-600'}>
                      1 chiffre minimum
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {validatePassword(editPassword).hasSpecial ?
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> :
                      <XCircle className="w-3 h-3 text-red-500" />}
                    <span className={validatePassword(editPassword).hasSpecial ? 'text-green-600' : 'text-red-600'}>
                      1 caractere special (!@#$%^&*)
                    </span>
                  </div>
                  {editPassword.length >= 6 && (
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">Force: </span>
                      <span className={`text-xs font-medium ${
                        validatePassword(editPassword).strength === 'weak' ? 'text-red-500' :
                        validatePassword(editPassword).strength === 'medium' ? 'text-yellow-500' : 'text-green-500'
                      }`}>
                        {validatePassword(editPassword).strength === 'weak' ? 'Faible' :
                          validatePassword(editPassword).strength === 'medium' ? 'Moyen' : 'Fort'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
              />
              {confirmPassword && editPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={handleSaveSecurity} disabled={!validatePassword(editPassword).isValid || editPassword !== confirmPassword}>
              {isAdminPasswordResetMode ? 'Réinitialiser' : 'Sécuriser'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Définir mon shift
            </DialogTitle>
            <DialogDescription>Configurez votre shift et votre fonction</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Shift</Label>
              <Select value={editShift} onValueChange={setEditShift}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      Shift A (Bleu)
                    </div>
                  </SelectItem>
                  <SelectItem value="B">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      Shift B (Jaune)
                    </div>
                  </SelectItem>
                  <SelectItem value="C">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      Shift C (Vert)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fonction</Label>
              <Select value={editResponsibility} onValueChange={(v) => setEditResponsibility(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner une fonction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CALL_CENTER"><div className="flex items-center gap-2"><Phone className="w-4 h-4" /> Call Center</div></SelectItem>
                  <SelectItem value="MONITORING"><div className="flex items-center gap-2"><Activity className="w-4 h-4" /> Monitoring</div></SelectItem>
                  <SelectItem value="REPORTING_1"><div className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Reporting 1</div></SelectItem>
                  <SelectItem value="REPORTING_2"><div className="flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Reporting 2</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={handleSaveShift}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Paramètres
            </DialogTitle>
            <DialogDescription>Personnalisez votre experience</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Apparence</h4>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm">Theme sombre</p>
                  <p className="text-xs text-muted-foreground">Activer le mode sombre</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Session</h4>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm">Déconnexion automatique</p>
                  <p className="text-xs text-muted-foreground">Apres 10 minutes d'inactivite</p>
                </div>
                <Badge variant="outline">Active</Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Notifications</h4>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm">Notifications push</p>
                  <p className="text-xs text-muted-foreground">Recevoir les alertes importantes</p>
                </div>
                <Badge variant="outline">Active</Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button>Fermer</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

