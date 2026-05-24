import { AlertTriangle, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type PasswordSecurityGuardProps = {
  mustChangePassword: boolean;
  securityDialogOpen: boolean;
  onOpenSecurityDialog: () => void;
  onLogout: () => void;
};

export function PasswordSecurityGuard({
  mustChangePassword,
  securityDialogOpen,
  onOpenSecurityDialog,
  onLogout,
}: PasswordSecurityGuardProps) {
  if (!mustChangePassword) {
    return null;
  }

  return (
    <>
      <div className="sticky top-0 z-60 w-full bg-linear-to-r from-amber-500 to-orange-500 text-white px-4 py-2">
        <div className="flex items-center justify-center gap-3 max-w-7xl mx-auto">
          <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse" />
          <div className="flex-1 text-center">
            <span className="font-semibold">⚠️ SÉCURITÉ REQUISE :</span>{' '}
            <span>Vous devez changer votre mot de passe avant de pouvoir utiliser l'application.</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenSecurityDialog}
            className="bg-white text-orange-600 hover:bg-orange-50 font-semibold"
          >
            <Lock className="w-4 h-4 mr-2" />
            Changer maintenant
          </Button>
        </div>
      </div>

      {!securityDialogOpen && (
        <div className="fixed inset-0 z-65 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <Card className="w-full max-w-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                Changement de mot de passe obligatoire
              </CardTitle>
              <CardDescription>
                Votre compte est temporairement restreint. Vous devez définir un nouveau mot de passe pour continuer.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button variant="outline" onClick={onLogout}>Se déconnecter</Button>
              <Button onClick={onOpenSecurityDialog}>
                <Lock className="w-4 h-4 mr-2" />
                Ouvrir le formulaire
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
