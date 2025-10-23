
export interface Activity {
  id: string;
  description: string;
  unit: string;
  doneToday: number;
  donePrevious: number;
  remaining: number;
  totalVolume: number;
  workFront: string;
}

export interface SimpleActivity {
  id: string;
  description: string;
}

export interface HumanResource {
  id: string;
  description: string;
  count: number;
}

export interface Machinery {
  id: string;
  description: string;
  count: number;
  hoursWorked: number;
}

export interface Obstacle {
  id: string;
  description: string;
  dateAdded: string;
  type: string;
  priority: string;
  status: 'open' | 'closed';
  resolutionDate: string | null;
  resolutionNotes: string | null;
}

export interface ReportHistoryEntry {
  id: string;
  timestamp: string; // ISO 8601 format
  user: string; // For now, will be a static "User"
  action: 'created' | 'updated';
  details: string; // A summary of changes
}

export interface ProjectDailyReport {
  id: string;
  projectId: string; // Link to the project
  project: string; // Kept for display purposes, but projectId is the source of truth
  client: string;
  contractor: string;
  consultant: string;
  date: string;
  day: string;
  weather: string;
  temperature: number;
  startTime: string;
  endTime: string;
  performedActivities: Activity[];
  humanResources: HumanResource[];
  machinery: Machinery[];
  obstacles: Obstacle[];
  executivePersonnel: string;
  supervisorOpinion: string;
  clientOpinion: string;
  history: ReportHistoryEntry[];
}

export interface ProjectDocument {
  id: string;
  projectId: string; // Link to the project
  fileId: string; // ID for the file content in IndexedDB
  name: string;
  type: string;
  size: number;
  description: string;
  uploadDate: string; // ISO 8601 format
}

export interface Project {
  id: string;
  name: string;
}

export interface AppData {
    version: number;
    projects: Project[];
    reports: ProjectDailyReport[];
    documents: ProjectDocument[];
    activeProjectId: string | null;
}

export type Theme = 'light' | 'dark' | 'sepia';