import Header from "@/components/Header";
import StatsCards from "@/components/StatsCards";
import DepositWithdraw from "@/components/DepositWithdraw";
import StrategyChart from "@/components/StrategyChart";
import RebalanceHistory from "@/components/RebalanceHistory";

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Mobile gas-sponsored badge */}
        <div className="flex sm:hidden items-center justify-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400">
            Gas Sponsored by Conflux
          </span>
        </div>

        {/* Stats */}
        <StatsCards />

        {/* Main content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Deposit / Withdraw */}
          <div className="lg:col-span-1">
            <DepositWithdraw />
          </div>

          {/* Strategy Chart */}
          <div className="lg:col-span-2">
            <StrategyChart />
          </div>
        </div>

        {/* Rebalance history */}
        <RebalanceHistory />

        {/* Footer */}
        <footer className="border-t border-white/5 pt-6 pb-10 text-center">
          <p className="text-xs text-slate-500">
            ConfluxMind - Autonomous DeFAI Yield Optimizer on Conflux eSpace
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Powered by AI agents with gasless meta-transactions
          </p>
        </footer>
      </main>
    </div>
  );
}
