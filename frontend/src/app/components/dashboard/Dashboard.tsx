import { SummaryCards } from "./SummaryCard";
import { MonthlyTrendChart } from "./MonthlyTrendChart";
import { RegionPieChart } from "./RegionPieChart";

export function Dashboard() {
  return (
    <div className="space-y-8">
      <SummaryCards />

      <div className="grid grid-cols-2 gap-6">
        <MonthlyTrendChart />
        <RegionPieChart />
      </div>
    </div>
  );
}
