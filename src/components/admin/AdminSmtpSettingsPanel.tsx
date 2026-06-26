'use client';

import { CheckCircle, Eye, EyeOff, FlaskConical, RefreshCw, Save, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ─── Types ────────────────────────────────────────────────────────────────────

type SmtpSettingsForm = {
  host: string;
  port: number | string;
  secure: boolean;
  user: string;
  pass: string; // empty means "keep existing"
  from: string;
  nocMailbox: string;
  extraNotificationEmails: string;
  testEnabled: boolean;
};

type TestResult = {
  ok: boolean;
  message: string;
} | null;

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminSmtpSettingsPanel({ requesterId }: { requesterId: string }) {
  const [form, setForm] = useState<SmtpSettingsForm>({
    host: '127.0.0.1',
    port: 25,
    secure: false,
    user: '',
    pass: '',
    from: 'NOC Silicone Connect <noc@siliconeconnect.com>',
    nocMailbox: 'noc@siliconeconnect.com',
    extraNotificationEmails: '',
    testEnabled: true,
  });

  const [passSet, setPassSet] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testResult, setTestResult] = useState<TestResult>(null);

  // ── Load settings ────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!requesterId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/system/smtp-settings?requesterId=${encodeURIComponent(requesterId)}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('load_failed');
      const data = await res.json();
      setForm({
        host: data.host ?? '127.0.0.1',
        port: data.port ?? 25,
        secure: Boolean(data.secure),
        user: data.user ?? '',
        pass: '', // never prefilled
        from: data.from ?? 'NOC Silicone Connect <noc@siliconeconnect.com>',
        nocMailbox: data.nocMailbox ?? 'noc@siliconeconnect.com',
        extraNotificationEmails: (data.extraNotificationEmails ?? []).join(', '),
        testEnabled: Boolean(data.testEnabled ?? true),
      });
      setPassSet(Boolean(data.passSet));
      setTestTo(data.nocMailbox ?? 'noc@siliconeconnect.com');
    } catch {
      toast.error('Impossible de charger la configuration SMTP');
    } finally {
      setLoading(false);
    }
  }, [requesterId]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Save ─────────────────────────────────────────────────────────────────

  const save = async () => {
    if (!requesterId) return;

    // Basic validation
    if (!form.host.trim()) {
      toast.error('Hôte SMTP requis');
      return;
    }
    if (!form.nocMailbox.trim()) {
      toast.error('Boîte NOC requise');
      return;
    }

    setSaving(true);
    try {
      const extraEmails = form.extraNotificationEmails
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);

      const body: Record<string, unknown> = {
        requesterId,
        host: form.host.trim(),
        port: Number(form.port),
        secure: form.secure,
        user: form.user.trim(),
        from: form.from.trim(),
        nocMailbox: form.nocMailbox.trim(),
        extraNotificationEmails: extraEmails,
        testEnabled: form.testEnabled,
      };

      // Only send the password if the user typed a new one.
      if (form.pass.trim()) {
        body.pass = form.pass.trim();
      }

      const res = await fetch('/api/system/smtp-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('save_failed');

      const data = await res.json();
      setPassSet(Boolean(data.settings?.passSet));
      setForm((prev) => ({ ...prev, pass: '' }));
      toast.success('Configuration SMTP enregistrée');
    } catch {
      toast.error('Enregistrement SMTP impossible');
    } finally {
      setSaving(false);
    }
  };

  // ── Test ─────────────────────────────────────────────────────────────────

  const runTest = async () => {
    if (!requesterId) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/system/smtp-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId,
          to: testTo.trim() || form.nocMailbox,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, message: `Email envoyé vers ${data.to} via ${data.host}:${data.port} (${data.mode === 'auth' ? 'authentifié' : 'Postfix local'})` });
        toast.success('Test SMTP réussi');
      } else {
        setTestResult({ ok: false, message: data.error ?? 'Échec de l\'envoi' });
        toast.error('Test SMTP échoué', { description: data.error });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur réseau';
      setTestResult({ ok: false, message: msg });
      toast.error('Test SMTP impossible', { description: msg });
    } finally {
      setTesting(false);
    }
  };

  // ── Mode detection ────────────────────────────────────────────────────────

  const isPostfixMode = !form.user.trim();
  const isGmailMode = form.host.includes('gmail') || form.host.includes('smtp.google');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="space-y-4">

        {/* ── NOC Mailbox ── */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-base">Boîte NOC principale</CardTitle>
            <CardDescription>
              Toutes les notifications tickets, alertes et rapports sont envoyés à cette adresse.
              Les admins peuvent la modifier ici sans toucher au code.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="noc-mailbox">Email de référence NOC</Label>
                <Input
                  id="noc-mailbox"
                  value={form.nocMailbox}
                  onChange={(e) => setForm((prev) => ({ ...prev, nocMailbox: e.target.value }))}
                  placeholder="noc@siliconeconnect.com"
                  disabled={loading || saving}
                />
                <p className="text-xs text-muted-foreground">
                  Reçoit toutes les notifications. Actuellement : <strong>{form.nocMailbox || '—'}</strong>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="extra-emails">Emails supplémentaires (optionnel)</Label>
                <Input
                  id="extra-emails"
                  value={form.extraNotificationEmails}
                  onChange={(e) => setForm((prev) => ({ ...prev, extraNotificationEmails: e.target.value }))}
                  placeholder="supervision@siliconeconnect.com, direction@siliconeconnect.com"
                  disabled={loading || saving}
                />
                <p className="text-xs text-muted-foreground">Adresses séparées par une virgule. Reçoivent les mêmes notifications que la boîte NOC.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── SMTP Transport ── */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-base">Configuration SMTP</CardTitle>
                <CardDescription className="mt-1">
                  Transport des emails. Utilisez Postfix local en production ou Gmail en développement.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {isGmailMode && <Badge variant="secondary">Mode Gmail</Badge>}
                {isPostfixMode && !isGmailMode && <Badge variant="outline">Mode Postfix local</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pb-4">

            {/* Preset Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    host: '127.0.0.1',
                    port: 25,
                    secure: false,
                    user: '',
                    pass: '',
                    from: `NOC Silicone Connect <${prev.nocMailbox || 'noc@siliconeconnect.com'}>`,
                  }))
                }
              >
                Preset: Postfix local
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false,
                    from: prev.user ? `Noc Activities <${prev.user}>` : prev.from,
                  }))
                }
              >
                Preset: Gmail
              </Button>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="smtp-host">Hôte SMTP</Label>
                <Input
                  id="smtp-host"
                  value={form.host}
                  onChange={(e) => setForm((prev) => ({ ...prev, host: e.target.value }))}
                  placeholder="127.0.0.1 ou smtp.gmail.com"
                  disabled={loading || saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-port">Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={form.port}
                  onChange={(e) => setForm((prev) => ({ ...prev, port: Number(e.target.value) }))}
                  disabled={loading || saving}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">TLS / SMTP sécurisé (port 465)</p>
                <p className="text-xs text-muted-foreground">Désactivez pour Postfix local (port 25) ou Gmail STARTTLS (port 587).</p>
              </div>
              <Switch
                checked={form.secure}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, secure: checked }))}
                disabled={loading || saving}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="smtp-user">Utilisateur SMTP</Label>
                <Input
                  id="smtp-user"
                  value={form.user}
                  onChange={(e) => setForm((prev) => ({ ...prev, user: e.target.value }))}
                  placeholder="noc@siliconeconnect.com (vide = Postfix local)"
                  disabled={loading || saving}
                />
                <p className="text-xs text-muted-foreground">Laisser vide pour utiliser Postfix sans authentification.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-pass">
                  Mot de passe SMTP
                  {passSet && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="ml-2 text-xs text-emerald-600 cursor-default">(défini)</span>
                      </TooltipTrigger>
                      <TooltipContent>Un mot de passe est enregistré. Saisir un nouveau pour le remplacer.</TooltipContent>
                    </Tooltip>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="smtp-pass"
                    type={showPass ? 'text' : 'password'}
                    value={form.pass}
                    onChange={(e) => setForm((prev) => ({ ...prev, pass: e.target.value }))}
                    placeholder={passSet ? '(mot de passe défini — laisser vide pour conserver)' : 'Mot de passe App Gmail ou vide'}
                    disabled={loading || saving}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPass((prev) => !prev)}
                    tabIndex={-1}
                    aria-label={showPass ? 'Masquer' : 'Afficher'}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Pour Gmail, utilisez un App Password (compte 2FA requis).</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-from">Expéditeur (From)</Label>
              <Input
                id="smtp-from"
                value={form.from}
                onChange={(e) => setForm((prev) => ({ ...prev, from: e.target.value }))}
                placeholder='NOC Silicone Connect <noc@siliconeconnect.com>'
                disabled={loading || saving}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Test SMTP ── */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-base">Test de connexion SMTP</CardTitle>
            <CardDescription>
              Envoie un email de test avec la configuration actuellement enregistrée (pas les modifications non sauvegardées).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-50 space-y-2">
                <Label htmlFor="test-to">Destinataire du test</Label>
                <Input
                  id="test-to"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="noc@siliconeconnect.com"
                  disabled={testing}
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => void runTest()}
                disabled={testing || !form.testEnabled}
                className="flex items-center gap-2"
              >
                {testing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <FlaskConical className="w-4 h-4" />
                )}
                {testing ? 'Envoi…' : 'Envoyer test'}
              </Button>
            </div>

            {testResult && (
              <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${testResult.ok ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-red-300 bg-red-50 text-red-800'}`}>
                {testResult.ok ? (
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Activer l'endpoint de test SMTP</p>
                <p className="text-xs text-muted-foreground">Désactiver en production si vous n'avez plus besoin de cet endpoint.</p>
              </div>
              <Switch
                checked={form.testEnabled}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, testEnabled: checked }))}
                disabled={loading || saving}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Actions ── */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => void load()}
            disabled={loading || saving}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Recharger
          </Button>
          <Button
            onClick={() => void save()}
            disabled={loading || saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Enregistrement…' : 'Enregistrer la configuration SMTP'}
          </Button>
        </div>

      </div>
    </TooltipProvider>
  );
}
