import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  Train, 
  MapPin, 
  FileSpreadsheet,
  Sparkles
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Package, label: "Orders", path: "/orders" },
  { icon: Warehouse, label: "Inventory", path: "/inventory" },
  { icon: Train, label: "Wagons", path: "/wagons" },
  { icon: MapPin, label: "Loading Points", path: "/loading-points" },
  { icon: FileSpreadsheet, label: "Rake Plans", path: "/plans" },
  { icon: Sparkles, label: "Scenarios", path: "/scenarios" },
];

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <Train className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground">SAIL Logistics</h1>
            <p className="text-xs text-muted-foreground">Decision Support System</p>
          </div>
        </div>
        
        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};
