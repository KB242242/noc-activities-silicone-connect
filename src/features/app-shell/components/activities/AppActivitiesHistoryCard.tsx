import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

type ActivityHistoryItem = {
  id: string;
  userName: string;
  category: string;
  description: string;
  createdAt: Date;
};

type AppActivitiesHistoryCardProps<T extends ActivityHistoryItem> = {
  activities: T[];
  accentColor: string;
};

export function AppActivitiesHistoryCard<T extends ActivityHistoryItem>({
  activities,
  accentColor,
}: AppActivitiesHistoryCardProps<T>) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base">Historique</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <ScrollArea className="h-100">
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="relative pl-8">
                  <div
                    className="absolute left-1.5 top-2 w-4 h-4 rounded-full bg-background border-2"
                    style={{ borderColor: accentColor }}
                  />
                  <Card className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{activity.userName}</span>
                          <Badge variant="outline" className="text-xs">{activity.category}</Badge>
                        </div>
                        <p className="text-sm mt-1">{activity.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(activity.createdAt, 'HH:mm')}
                      </span>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
