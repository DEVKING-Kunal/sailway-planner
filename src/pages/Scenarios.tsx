import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Scenarios() {
  const [scenarioType, setScenarioType] = useState("");
  const [selectedPoint, setSelectedPoint] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = async () => {
    if (!scenarioType) {
      toast.error("Please select a scenario type");
      return;
    }

    setIsSimulating(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success("Scenario simulation complete! Check the Plans page for results.");
    setIsSimulating(false);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">What-If Scenarios</h1>
        <p className="text-muted-foreground">Simulate disruptions and test optimization resilience</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Scenario Simulator</h2>
              <p className="text-sm text-muted-foreground">Test different operational conditions</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="scenario-type">Scenario Type</Label>
              <Select value={scenarioType} onValueChange={setScenarioType}>
                <SelectTrigger id="scenario-type" className="bg-secondary border-border">
                  <SelectValue placeholder="Select a scenario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loading-point-failure">Loading Point Failure</SelectItem>
                  <SelectItem value="urgent-order">Urgent High-Priority Order</SelectItem>
                  <SelectItem value="wagon-shortage">Wagon Shortage</SelectItem>
                  <SelectItem value="route-blockage">Route Blockage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scenarioType === "loading-point-failure" && (
              <div className="space-y-2">
                <Label htmlFor="loading-point">Select Loading Point to Disable</Label>
                <Select value={selectedPoint} onValueChange={setSelectedPoint}>
                  <SelectTrigger id="loading-point" className="bg-secondary border-border">
                    <SelectValue placeholder="Choose loading point" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LP-001">LP-001 - Main Loading Bay</SelectItem>
                    <SelectItem value="LP-002">LP-002 - East Terminal</SelectItem>
                    <SelectItem value="LP-003">LP-003 - West Terminal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {scenarioType === "route-blockage" && (
              <div className="space-y-2">
                <Label htmlFor="route">Select Route to Block</Label>
                <Select>
                  <SelectTrigger id="route" className="bg-secondary border-border">
                    <SelectValue placeholder="Choose route" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="route-1">Bokaro → Delhi</SelectItem>
                    <SelectItem value="route-2">Bokaro → Mumbai</SelectItem>
                    <SelectItem value="route-3">Bokaro → Kolkata</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={handleSimulate}
              disabled={isSimulating || !scenarioType}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSimulating ? "Simulating..." : "Run Simulation"}
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-[hsl(var(--medium))]/10">
              <AlertCircle className="h-6 w-6 text-[hsl(var(--medium))]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Scenario Information</h2>
              <p className="text-sm text-muted-foreground">What each scenario tests</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-secondary rounded-lg">
              <h3 className="font-semibold text-foreground mb-2">Loading Point Failure</h3>
              <p className="text-sm text-muted-foreground">
                Simulates a loading point going offline. The system will re-optimize using only available loading points and show which orders can still be fulfilled.
              </p>
            </div>

            <div className="p-4 bg-secondary rounded-lg">
              <h3 className="font-semibold text-foreground mb-2">Urgent High-Priority Order</h3>
              <p className="text-sm text-muted-foreground">
                Tests how the system handles a critical order arrival. It may dismantle lower-priority rakes to free up resources.
              </p>
            </div>

            <div className="p-4 bg-secondary rounded-lg">
              <h3 className="font-semibold text-foreground mb-2">Wagon Shortage</h3>
              <p className="text-sm text-muted-foreground">
                Reduces wagon availability to test resource allocation. The system will prioritize high-value orders and flag unfulfillable ones.
              </p>
            </div>

            <div className="p-4 bg-secondary rounded-lg">
              <h3 className="font-semibold text-foreground mb-2">Route Blockage</h3>
              <p className="text-sm text-muted-foreground">
                Blocks a specific route to test adaptability. Orders for blocked destinations are put on hold while others are optimized.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
