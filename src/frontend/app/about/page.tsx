"use client";

import Header from "@/components/Header";
import { ADDRESSES } from "@/lib/contracts";

const CONTRACTS = [
  { name: "ConfluxMindVault", address: ADDRESSES.vault, desc: "ERC-4626 vault — deposit, withdraw, share accounting" },
  { name: "StrategyController", address: ADDRESSES.strategyController, desc: "Manages weighted allocation across strategies" },
  { name: "GasSponsorManager", address: ADDRESSES.gasSponsorManager, desc: "Conflux Fee Sponsorship for gasless UX" },
  { name: "dForce Strategy", address: ADDRESSES.dForceStrategy, desc: "Lending yield via dForce Unitus" },
  { name: "SHUI Strategy", address: ADDRESSES.shuiStrategy, desc: "CFX staking yield via SHUI Finance" },
  { name: "WallFreeX Strategy", address: ADDRESSES.wallFreeXStrategy, desc: "Stablecoin LP fees via WallFreeX" },
];

const TECH_STACK = [
  { category: "Frontend", items: "React 18, Next.js 14, Wagmi v2, Viem, TailwindCSS, Recharts" },
  { category: "Smart Contracts", items: "Solidity ^0.8.24, Foundry, OpenZeppelin ERC-4626" },
  { category: "AI Keeper", items: "Node.js 20, TypeScript, ethers.js v6, risk-adjusted yield model" },
  { category: "Blockchain", items: "Conflux eSpace (Chain ID 71 testnet / 1030 mainnet)" },
  { category: "Conflux-Specific", items: "SponsorWhitelistControl, Fee Sponsorship, eSpace RPC" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5">
            <span className="text-xs font-semibold text-indigo-400">Global Hackfest 2026</span>
          </div>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            ConfluxMind
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Autonomous DeFAI yield optimization — your capital, always working at peak efficiency.
          </p>
        </div>

        {/* What is ConfluxMind */}
        <section className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm space-y-4">
          <h2 className="text-xl font-bold text-white">What is ConfluxMind?</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            ConfluxMind is an autonomous, AI-powered yield aggregation protocol built on Conflux eSpace.
            Users deposit assets into a non-custodial ERC-4626 vault, and an off-chain AI strategy agent
            continuously reads live yield signals across Conflux&apos;s DeFi ecosystem — dForce Unitus lending
            markets, SHUI Finance liquid staking, and WallFreeX liquidity pools — and autonomously
            rebalances allocations toward the highest risk-adjusted returns.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            All user interactions are <span className="text-emerald-400 font-medium">completely gasless</span> via
            Conflux&apos;s native Fee Sponsorship mechanism, enabling zero-friction onboarding for any wallet.
          </p>
        </section>

        {/* Problem & Solution */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-red-500/10 bg-red-500/5 p-6 space-y-3">
            <h2 className="text-lg font-bold text-red-400">The Problem</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex gap-2"><span className="text-red-400 mt-0.5">x</span>Yield is fragmented across multiple Conflux DeFi protocols</li>
              <li className="flex gap-2"><span className="text-red-400 mt-0.5">x</span>Users must manually monitor rates across dForce, SHUI, WallFreeX</li>
              <li className="flex gap-2"><span className="text-red-400 mt-0.5">x</span>Rebalancing requires multiple transactions and gas fees</li>
              <li className="flex gap-2"><span className="text-red-400 mt-0.5">x</span>Capital sits idle in suboptimal positions, leaking yield</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-6 space-y-3">
            <h2 className="text-lg font-bold text-emerald-400">Our Solution</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">+</span>AI Keeper monitors all protocols in real-time (every 5 min)</li>
              <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">+</span>Risk-adjusted yield model computes optimal allocations</li>
              <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">+</span>Atomic on-chain rebalancing via StrategyController</li>
              <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">+</span>100% gasless — Conflux Fee Sponsorship covers everything</li>
            </ul>
          </section>
        </div>

        {/* Architecture */}
        <section className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm space-y-4">
          <h2 className="text-xl font-bold text-white">Architecture</h2>
          <div className="space-y-3">
            {[
              { layer: "Vault Layer", color: "indigo", desc: "ERC-4626 vault accepts deposits, mints cmTokens, routes to StrategyController" },
              { layer: "AI Strategy Layer", color: "violet", desc: "StrategyController manages weighted allocation; AI Keeper triggers rebalances" },
              { layer: "Gasless UX Layer", color: "emerald", desc: "GasSponsorManager uses Conflux SponsorWhitelistControl for zero-gas transactions" },
            ].map((l) => (
              <div key={l.layer} className="flex items-start gap-4 rounded-xl bg-white/5 p-4">
                <div className={`mt-1 h-3 w-3 rounded-full bg-${l.color}-500 flex-shrink-0`} />
                <div>
                  <h3 className="text-sm font-semibold text-white">{l.layer}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{l.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Conflux Integration */}
        <section className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm space-y-4">
          <h2 className="text-xl font-bold text-white">Conflux Integration</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { feature: "eSpace (EVM)", desc: "All contracts on Conflux eSpace — fast, cheap, EVM-compatible" },
              { feature: "Fee Sponsorship", desc: "All user txs are gasless via SponsorWhitelistControl built-in" },
              { feature: "dForce Unitus", desc: "Lending yield strategy — deposit into Unitus markets" },
              { feature: "SHUI Finance", desc: "CFX liquid staking — convert CFX to sFX for staking yield" },
              { feature: "WallFreeX", desc: "Stablecoin LP — AxCNH/USDT liquidity pool swap fees" },
              { feature: "Meson.fi", desc: "Cross-chain entry — bridge USDT0/AxCNH directly into vault" },
            ].map((f) => (
              <div key={f.feature} className="rounded-lg bg-white/5 p-3">
                <h3 className="text-sm font-semibold text-indigo-400">{f.feature}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Deployed Contracts */}
        <section className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm space-y-4">
          <h2 className="text-xl font-bold text-white">Deployed Contracts</h2>
          <p className="text-xs text-slate-400">Conflux eSpace Testnet — Chain ID: 71</p>
          <div className="space-y-2">
            {CONTRACTS.map((c) => (
              <div key={c.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 rounded-lg bg-white/5 p-3">
                <div>
                  <h3 className="text-sm font-medium text-white">{c.name}</h3>
                  <p className="text-xs text-slate-500">{c.desc}</p>
                </div>
                <a
                  href={`https://evmtestnet.confluxscan.org/address/${c.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors truncate"
                >
                  {c.address.slice(0, 6)}...{c.address.slice(-4)}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Tech Stack */}
        <section className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm space-y-4">
          <h2 className="text-xl font-bold text-white">Technology Stack</h2>
          <div className="space-y-2">
            {TECH_STACK.map((t) => (
              <div key={t.category} className="flex flex-col sm:flex-row gap-1 sm:gap-4 rounded-lg bg-white/5 p-3">
                <span className="text-sm font-semibold text-indigo-400 sm:w-40 flex-shrink-0">{t.category}</span>
                <span className="text-sm text-slate-300">{t.items}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm space-y-4">
          <h2 className="text-xl font-bold text-white">Team</h2>
          <div className="flex items-center gap-4 rounded-lg bg-white/5 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white font-bold text-lg">
              N
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Nosakhare Jesuorobo</h3>
              <p className="text-xs text-slate-400">Lead Smart Contract Developer</p>
              <a
                href="https://github.com/najnomics"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                @najnomics
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 pt-6 pb-10 text-center space-y-2">
          <p className="text-xs text-slate-500">
            ConfluxMind — Global Hackfest 2026 Submission
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
            <a href="https://github.com/najnomics/conflux-mind" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400">GitHub</a>
            <span>|</span>
            <a href="https://doc.confluxnetwork.org" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400">Conflux Docs</a>
            <span>|</span>
            <a href="https://discord.gg/4A2q3xJKjC" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400">Discord</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
