const fs = require('fs');

const badgeImport = `import UserHeaderBadge from '@/app/components/ui/UserHeaderBadge'`;

const blockToReplace = /<div className="flex items-center gap-2 pl-2 border-l border-gray-200">\s*<div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">\s*<span className="text-white text-\[10px\] font-semibold">JD<\/span>\s*<\/div>\s*<div>\s*<p className="text-xs font-medium text-gray-800 leading-none">John Doe<\/p>\s*<p className="text-\[10px\] text-gray-400">Admin<\/p>\s*<\/div>\s*<\/div>/g;

const files = [
  'app/admin/(portal)/employees/EmployeesClient.tsx',
  'app/admin/(portal)/projects/ProjectsClient.tsx',
  'app/admin/(portal)/crm/CRMClient.tsx',
  'app/admin/(portal)/support/SupportClient.tsx',
  'app/admin/(portal)/tasks/TasksClient.tsx',
  'app/admin/(portal)/employees/[id]/EmployeeDetailClient.tsx',
  'app/admin/(portal)/inbox/page.tsx',
  'app/admin/(portal)/settings/SettingsClient.tsx',
  'app/admin/(portal)/settings/employees/[id]/SettingsEmployeeDetailClient.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('UserHeaderBadge')) continue;

  // Find the first lucide-react import
  content = content.replace(/(import \{[^}]*\}\s*from\s*['"]lucide-react['"])/, `$1\n${badgeImport}`);

  // Replace the block
  content = content.replace(blockToReplace, '<UserHeaderBadge />');
  
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
}
