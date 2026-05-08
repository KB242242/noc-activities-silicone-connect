import { startOfHour, subHours, format } from 'date-fns';

export type IncidentPoint = {
  clock: number;
  severity: number;
};

export type ClientModelInput = {
  service_type: string;
  monitor_status: 'DOWN' | 'SUSPENDED' | 'RESTARTED' | 'INTERFACES_DOWN' | 'UP';
  equipment_status: string;
  total_equipments_count: number;
  down_equipments_count: number;
  incidents: IncidentPoint[];
};

export type IncidentTimelinePoint = {
  label: string;
  incidents: number;
  pressure: number;
  availability: number;
};

export type SeverityDistributionPoint = {
  name: string;
  count: number;
  fill: string;
};

export type IncidentModel = {
  timeline: IncidentTimelinePoint[];
  severityDistribution: SeverityDistributionPoint[];
  averageAvailability: number;
  peakPressure: number;
  totalIncidents: number;
  infraImpactPercent: number;
  slaTarget: number;
  slaGap: number;
  reliabilityScore: number;
};

type ModelProfile = {
  severityWeight: number;
  incidentWeight: number;
  carryDecay: number;
  carryWeight: number;
  infraWeight: number;
};

function readNumEnv(key: string, fallback: number, min?: number, max?: number): number {
  const raw = process.env[key];
  const parsed = raw ? Number(raw) : Number.NaN;
  if (Number.isNaN(parsed)) return fallback;
  if (typeof min === 'number' && parsed < min) return min;
  if (typeof max === 'number' && parsed > max) return max;
  return parsed;
}

function resolveSlaTarget(serviceTypeUpper: string): number {
  if (serviceTypeUpper.includes('LIAISON')) {
    return readNumEnv('NEXT_PUBLIC_NOC_SLA_LIAISON', 99.9, 95, 100);
  }

  if (serviceTypeUpper.includes('MPLS') || serviceTypeUpper.includes('VPN')) {
    return readNumEnv('NEXT_PUBLIC_NOC_SLA_MPLS_VPN', 99.7, 95, 100);
  }

  return readNumEnv('NEXT_PUBLIC_NOC_SLA_DEFAULT', 99.5, 90, 100);
}

function resolveModelProfile(serviceTypeUpper: string): ModelProfile {
  const defaultProfile: ModelProfile = {
    severityWeight: readNumEnv('NEXT_PUBLIC_NOC_MODEL_SEVERITY_WEIGHT', 12, 1, 30),
    incidentWeight: readNumEnv('NEXT_PUBLIC_NOC_MODEL_INCIDENT_WEIGHT', 7, 1, 30),
    carryDecay: readNumEnv('NEXT_PUBLIC_NOC_MODEL_CARRY_DECAY', 0.55, 0, 0.99),
    carryWeight: readNumEnv('NEXT_PUBLIC_NOC_MODEL_CARRY_WEIGHT', 4, 0, 20),
    infraWeight: readNumEnv('NEXT_PUBLIC_NOC_MODEL_INFRA_WEIGHT', 34, 0, 60),
  };

  if (serviceTypeUpper.includes('LIAISON')) {
    return {
      severityWeight: readNumEnv('NEXT_PUBLIC_NOC_MODEL_LIAISON_SEVERITY_WEIGHT', 14, 1, 30),
      incidentWeight: readNumEnv('NEXT_PUBLIC_NOC_MODEL_LIAISON_INCIDENT_WEIGHT', 8, 1, 30),
      carryDecay: readNumEnv('NEXT_PUBLIC_NOC_MODEL_LIAISON_CARRY_DECAY', 0.62, 0, 0.99),
      carryWeight: readNumEnv('NEXT_PUBLIC_NOC_MODEL_LIAISON_CARRY_WEIGHT', 4, 0, 20),
      infraWeight: readNumEnv('NEXT_PUBLIC_NOC_MODEL_LIAISON_INFRA_WEIGHT', 38, 0, 70),
    };
  }

  return defaultProfile;
}

export function buildIncidentModel(input: ClientModelInput): IncidentModel {
  const serviceTypeUpper = (input.service_type || '').toUpperCase();
  const slaTarget = resolveSlaTarget(serviceTypeUpper);
  const modelProfile = resolveModelProfile(serviceTypeUpper);

  const incidents = input.incidents ?? [];
  const weights: Record<number, number> = {
    0: 1,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
  };

  const labels = [
    { key: 4, name: 'Critique', fill: '#ef4444' },
    { key: 3, name: 'Haute', fill: '#f97316' },
    { key: 2, name: 'Moyenne', fill: '#eab308' },
    { key: 0, name: 'Faible', fill: '#38bdf8' },
  ];

  const now = new Date();
  const start = startOfHour(subHours(now, 23)).getTime();
  const hourMs = 60 * 60 * 1000;

  const infraRatio =
    input.total_equipments_count > 0
      ? input.down_equipments_count / input.total_equipments_count
      : input.down_equipments_count > 0
      ? 1
      : 0;
  const infraImpactPercent = Math.min(100, Math.round(infraRatio * 100));
  const infraBias = Math.round(infraRatio * modelProfile.infraWeight);

  const statusBias =
    (input.monitor_status === 'DOWN'
      ? 16
      : input.monitor_status === 'INTERFACES_DOWN'
      ? 12
      : input.monitor_status === 'SUSPENDED'
      ? 9
      : input.monitor_status === 'RESTARTED'
      ? 5
      : 0) + (input.equipment_status !== 'UP' ? 7 : 0);

  const buckets = Array.from({ length: 24 }, (_, idx) => {
    const ts = start + idx * hourMs;
    return {
      timestamp: ts,
      label: format(new Date(ts), 'HH:mm'),
      incidents: 0,
      severityScore: 0,
    };
  });

  for (const incident of incidents) {
    const incidentTime = Number(incident.clock);
    if (Number.isNaN(incidentTime) || incidentTime < start) continue;
    const idx = Math.floor((incidentTime - start) / hourMs);
    if (idx < 0 || idx >= buckets.length) continue;
    const sev = Number(incident.severity);
    buckets[idx].incidents += 1;
    buckets[idx].severityScore += weights[sev] ?? 1;
  }

  let peakPressure = 0;
  let availabilityAccumulator = 0;
  let carry = 0;
  const availabilityFloor = Math.max(60, slaTarget - 34);

  const timeline: IncidentTimelinePoint[] = buckets.map((bucket) => {
    const burst =
      bucket.severityScore * modelProfile.severityWeight +
      bucket.incidents * modelProfile.incidentWeight;
    carry = Math.max(0, carry * modelProfile.carryDecay + bucket.incidents * modelProfile.carryWeight);
    const pressure = Math.min(100, Math.round(burst + carry + infraBias + statusBias));
    const availability = Math.max(availabilityFloor, Math.min(100, 100 - pressure * 0.32));
    peakPressure = Math.max(peakPressure, pressure);
    availabilityAccumulator += availability;
    return {
      label: bucket.label,
      incidents: bucket.incidents,
      pressure,
      availability,
    };
  });

  const severityDistribution: SeverityDistributionPoint[] = labels.map((label) => {
    const count = incidents.filter((incident) => {
      const sev = Number(incident.severity);
      if (label.key === 0) return sev <= 1;
      return sev === label.key;
    }).length;
    return {
      name: label.name,
      count,
      fill: label.fill,
    };
  });

  const averageAvailability = timeline.length > 0 ? availabilityAccumulator / timeline.length : 100;

  return {
    timeline,
    severityDistribution,
    averageAvailability,
    peakPressure,
    totalIncidents: incidents.length,
    infraImpactPercent,
    slaTarget,
    slaGap: averageAvailability - slaTarget,
    reliabilityScore: Math.max(
      0,
      Math.min(
        100,
        Math.round(averageAvailability * 0.52 + (100 - peakPressure) * 0.28 + (100 - infraImpactPercent) * 0.2)
      )
    ),
  };
}
