export type TaskPriority = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'To Do' | 'In Progress' | 'In Review' | 'Completed';

export interface KanbanTask {
  id: string;
  name: string;
  description: string;
  projectName: string;
  priority: TaskPriority;
  dueDate: string;
  dueStatus: 'future' | 'today' | 'tomorrow' | 'overdue';
  status: TaskStatus;
  assignee: {
    name: string;
    avatar: string;
  };
}

export const mockTasks: KanbanTask[] = [
  {
    id: 'TSK-1',
    name: 'Inspect roof deck framing',
    description: 'Full visual inspection of all deck framing on Site A, document any soft spots or rot.',
    projectName: 'Oakdale Residential',
    priority: 'High',
    dueDate: 'Apr 10',
    dueStatus: 'overdue',
    status: 'To Do',
    assignee: {
      name: 'Jose Martinez',
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=40&h=40&fit=crop'
    }
  },
  {
    id: 'TSK-2',
    name: 'Order TPO membrane rolls',
    description: 'Place order with supplier for 22 rolls of 60-mil TPO.',
    projectName: 'Metro Commercial Flat',
    priority: 'Medium',
    dueDate: 'Tomorrow',
    dueStatus: 'tomorrow',
    status: 'To Do',
    assignee: {
      name: 'Karen Brooks',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop'
    }
  },
  {
    id: 'TSK-3',
    name: 'Install flashing on parapet walls',
    description: 'Complete flashing installation on all four parapet walls.',
    projectName: 'Metro Commercial Flat',
    priority: 'High',
    dueDate: 'Jun 9, 2026',
    dueStatus: 'future',
    status: 'Completed',
    assignee: {
      name: 'Troy Shaw',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop'
    }
  },
  {
    id: 'TSK-4',
    name: 'Safety harness inspection',
    description: 'Inspect all crew harnesses and lanyards per OSHA standards.',
    projectName: 'Oakdale Residential',
    priority: 'Low',
    dueDate: 'Jun 9, 2026',
    dueStatus: 'future',
    status: 'To Do',
    assignee: {
      name: 'Marcus Bell',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop'
    }
  },
  {
    id: 'TSK-5',
    name: 'Submit RFI for drainage slope',
    description: 'Final walkthrough prep and submit RFI.',
    projectName: 'Riverside Shingle',
    priority: 'Low',
    dueDate: 'Tomorrow',
    dueStatus: 'tomorrow',
    status: 'In Progress',
    assignee: {
      name: 'Jane Cooper',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop'
    }
  },
  {
    id: 'TSK-6',
    name: 'Update project completion photos',
    description: 'Upload all before/after photos to project folder.',
    projectName: 'Highland Tearoff',
    priority: 'High',
    dueDate: 'Apr 10',
    dueStatus: 'overdue',
    status: 'In Review',
    assignee: {
      name: 'Priya Nair',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=40&h=40&fit=crop'
    }
  },
  {
    id: 'TSK-7',
    name: 'Seal all pipe penetrations',
    description: 'Apply mastic sealant around all pipe and HVAC penetrations.',
    projectName: 'Summerlin Flat',
    priority: 'Medium',
    dueDate: 'Jun 9, 2026',
    dueStatus: 'future',
    status: 'Completed',
    assignee: {
      name: 'Jane Cooper',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop'
    }
  },
  {
    id: 'TSK-8',
    name: 'Clean up site debris',
    description: 'Remove all waste materials, packaging, and old shingles.',
    projectName: 'Metro Commercial Flat',
    priority: 'Medium',
    dueDate: 'Tomorrow',
    dueStatus: 'tomorrow',
    status: 'In Review',
    assignee: {
      name: 'Jose Martinez',
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=40&h=40&fit=crop'
    }
  },
  {
    id: 'TSK-9',
    name: 'Membrane overlap seam check',
    description: 'QC inspection of all TPO seam overlaps — minimum 1.5 inches.',
    projectName: 'Highland Tearoff',
    priority: 'High',
    dueDate: 'Jun 9, 2026',
    dueStatus: 'future',
    status: 'In Review',
    assignee: {
      name: 'Priya Nair',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=40&h=40&fit=crop'
    }
  }
];
