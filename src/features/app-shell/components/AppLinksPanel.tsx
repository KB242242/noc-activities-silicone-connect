import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EXTERNAL_LINKS } from '@/features/app-shell/noc-config';
import { toast } from '@/lib/toast';

export function AppLinksPanel() {
  return (
    <motion.div key="links" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Liens Externes</h1>
        <p className="text-muted-foreground">Accès rapide aux outils NOC</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXTERNAL_LINKS.map((link) => {
          const IconComponent = link.icon;
          return (
            <Card key={link.id} className="card-hover">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <IconComponent className="w-5 h-5" />
                  {link.name}
                </CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2" onClick={() => toast.success(`Ouverture de ${link.name}`)}>
                    <ExternalLink className="w-4 h-4" /> Accéder
                  </Button>
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}