import { promises as fs } from 'fs';
import path from 'path';

import {
  defaultNocPlanningSettings,
  sanitizeNocPlanningSettings,
  type NocPlanningSettings,
} from '@/lib/noc/planningSettings';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'noc_planning_settings.json');

export async function loadNocPlanningSettings(): Promise<NocPlanningSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, 'utf8');
    return sanitizeNocPlanningSettings(JSON.parse(raw) as Partial<NocPlanningSettings>);
  } catch {
    const defaults = defaultNocPlanningSettings();
    await saveNocPlanningSettings(defaults);
    return defaults;
  }
}

export async function saveNocPlanningSettings(settings: NocPlanningSettings): Promise<NocPlanningSettings> {
  const safe = sanitizeNocPlanningSettings(settings);
  await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(safe, null, 2), 'utf8');
  return safe;
}