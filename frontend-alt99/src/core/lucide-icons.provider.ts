import { Provider } from '@angular/core';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import {
  Home,
  Lock,
  Database,
  Settings,
  Folder,
  Eye,
  Search,
  X,
  Rocket,
  Share2,
  Copy,
  Tag,
  Trash2,
  Menu,
  Grid,
  BarChart2,
  Globe,
  Info,
  Maximize2,
  Minimize2,
  FileText,
  Activity,
} from 'lucide-angular';

// Export individual icons for direct use with [img] property
export {
  Home,
  Lock,
  Database,
  Settings,
  Folder,
  Eye,
  Search,
  X,
  Rocket,
  Share2,
  Copy,
  Tag,
  Trash2,
  Menu,
  Grid,
  BarChart2,
  Globe,
  Info,
  Maximize2,
  Minimize2,
  FileText,
  Activity,
};

/**
 * Provides Lucide icons for the application.
 * Returns an array of providers to prevent tree-shaking.
 */
export function provideLucideIcons(): Provider[] {
  return [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
        Home,
        Lock,
        Database,
        Settings,
        Folder,
        Eye,
        Search,
        X,
        Rocket,
        Share2,
        Copy,
        Tag,
        Trash2,
        Menu,
        Grid,
        BarChart2,
        Globe,
        Info,
        Maximize2,
        Minimize2,
        FileText,
        Activity,
      }),
    },
  ];
}
