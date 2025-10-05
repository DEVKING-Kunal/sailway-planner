import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  Train, 
  MapPin, 
  FileSpreadsheet,
  Sparkles,
  LogOut
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
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <Train className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground">SAIL Logistics</h1>
            <p className="text-xs text-muted-foreground">Decision Support System</p>
          </div>
        </div>
        
        {user && (
          <div className="px-6 py-2 border-b border-border">
            <p className="text-xs text-muted-foreground truncate" title={user.email}>
              {user.email}
            </p>
          </div>
        )}
        
        <nav className="flex-1 space-y-1 p-4">
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

        <div className="p-4 border-t border-border">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};
