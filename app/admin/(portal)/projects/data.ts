export type ProjectStatus = 'Completed' | 'In Progress' | 'On Hold';
export type ProjectType = 'Residential' | 'Commercial';
export type PriorityLevel = 'High' | 'Mid' | 'Low';
export type WorkOrderStatus = 'Open' | 'Closed';

export interface WorkOrder {
  id: string;
  name: string;
  priority: PriorityLevel;
  status: WorkOrderStatus;
  technician?: { name: string; avatar?: string };
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export interface ProjectDetails {
  totalBudget: number;
  spent: number;
  remaining: number;
  budgetUsedPercent: number;
  startDate: string;
  crewSize: number;
  workOrders: WorkOrder[];
  team: TeamMember[];
}

export interface Project {
  id: string;
  name: string;
  location: string;
  type: ProjectType;
  manager: string;
  client: string;
  dueDate: string;
  progress: number;
  status: ProjectStatus;
  image: string;
  details?: ProjectDetails;
}

export const mockProjects: Project[] = [
  {
    id: 'PRJ-001',
    name: 'Oakdale Residential Reroofing',
    location: 'Oakdale, NV',
    type: 'Residential',
    manager: 'Karen Brooks',
    client: 'Johnson Family',
    dueDate: 'Apr 15, 2026',
    progress: 100,
    status: 'In Progress', // Using "In Progress" as shown in the screenshot for this detailed project
    image: 'https://images.unsplash.com/photo-1632759145355-6b5d27ffc264?w=1000&h=400&fit=crop',
    details: {
      totalBudget: 85000,
      spent: 61200,
      remaining: 23800,
      budgetUsedPercent: 78,
      startDate: 'Feb 1, 2026',
      crewSize: 3,
      workOrders: [
        { id: 'WO-4412', name: 'Roof Deck Prep', priority: 'High', status: 'Open' },
        { id: 'WO-4398', name: 'TPO Membrane Install', priority: 'Mid', status: 'Open', technician: { name: 'J. Martinez', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=40&h=40&fit=crop' } },
        { id: 'WO-4397', name: 'Flashing & Seam', priority: 'Low', status: 'Closed', technician: { name: 'A. Lowe', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop' } }
      ],
      team: [
        { id: 'T-1', name: 'J. Martinez', role: 'Manager', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop' },
        { id: 'T-2', name: 'L. Nguyen', role: 'Crew Member', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' },
        { id: 'T-3', name: 'A. Lowe', role: 'Crew Member', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop' }
      ]
    }
  },
  {
    id: 'PRJ-002',
    name: 'Metro Commercial Flat Roof',
    location: 'Downtown, NV',
    type: 'Commercial',
    manager: 'Derek Owens',
    client: 'Metro Corp',
    progress: 50,
    dueDate: 'May 30, 2026',
    status: 'In Progress',
    image: 'https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?w=500&h=300&fit=crop',
  },
  {
    id: 'PRJ-003',
    name: 'Riverside Shingle Replacement',
    location: 'Riverside, NV',
    type: 'Residential',
    manager: 'Karen Brooks',
    client: 'Rivera LLC',
    progress: 20,
    dueDate: 'Jun 30, 2026',
    status: 'On Hold',
    image: 'https://images.unsplash.com/photo-1605810711744-1bb6233150cd?w=500&h=300&fit=crop',
  },
  {
    id: 'PRJ-004',
    name: 'Highland Tearoff & Overlay',
    location: 'Henderson, NV',
    type: 'Residential',
    manager: 'David Park',
    client: 'Highland HOA',
    progress: 100,
    dueDate: 'Mar 10, 2026',
    status: 'In Progress',
    image: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=500&h=300&fit=crop',
  },
  {
    id: 'PRJ-005',
    name: 'Summerlin Flat TPO Install',
    location: 'Summerlin, NV',
    type: 'Commercial',
    manager: 'Derek Owens',
    client: 'Summerlin Dev',
    progress: 60,
    dueDate: 'Feb 28, 2026',
    status: 'In Progress',
    image: 'https://images.unsplash.com/photo-1628114510006-21ffcc6a12df?w=500&h=300&fit=crop',
  },
  {
    id: 'PRJ-006',
    name: 'Green Valley Office Roofing',
    location: 'Green Valley, NV',
    type: 'Commercial',
    manager: 'David Park',
    client: 'Johnson Family',
    progress: 60,
    dueDate: 'Apr 15, 2026',
    status: 'On Hold',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&h=300&fit=crop',
  },
  {
    id: 'PRJ-007',
    name: 'Oakdale Residential Reroofing',
    location: 'Oakdale, NV',
    type: 'Residential',
    manager: 'Karen Brooks',
    client: 'Metro Corp',
    progress: 100,
    dueDate: 'Jun 9, 2026',
    status: 'In Progress',
    image: 'https://images.unsplash.com/photo-1623912061214-419b45e22ee5?w=500&h=300&fit=crop',
  },
  {
    id: 'PRJ-008',
    name: 'Sunnyvale Home Roofing Solutions',
    location: 'Sunnyvale, CA',
    type: 'Residential',
    manager: 'Derek Owens',
    client: 'Highland HOA',
    progress: 50,
    dueDate: 'Jun 9, 2026',
    status: 'On Hold',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&h=300&fit=crop',
  },
  {
    id: 'PRJ-009',
    name: 'Maplewood Roof Restoration Project',
    location: 'Maplewood, NJ',
    type: 'Residential',
    manager: 'Karen Brooks',
    client: 'Metro Corp',
    progress: 60,
    dueDate: 'Jun 9, 2026',
    status: 'In Progress',
    image: 'https://images.unsplash.com/photo-1549517045-bc93de075e53?w=500&h=300&fit=crop',
  },
  {
    id: 'PRJ-010',
    name: 'Cedar Grove Roofing Revamp',
    location: 'Cedar Grove, NJ',
    type: 'Commercial',
    manager: 'Derek Owens',
    client: 'Summerlin Dev',
    progress: 40,
    dueDate: 'Jun 9, 2026',
    status: 'On Hold',
    image: 'https://images.unsplash.com/photo-1481277542470-605612bd2d61?w=500&h=300&fit=crop',
  }
];
