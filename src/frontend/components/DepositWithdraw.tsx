"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { SUPPORTED_ASSETS, ADDRESSES, VAULT_ABI, ERC20_ABI } from "@/lib/contracts";

type Tab = "deposit" | "withdraw";

export default function DepositWithdraw() {
  const [tab, setTab] = useState<Tab>("deposit");
  const [amount, setAmount] = useState("");
  const [selectedAsset] = useState<string>(SUPPORTED_ASSETS[0].symbol);
  const { address, isConnected } = useAccount();

  const asset = SUPPORTED_ASSETS[0];

  // Read user's token balance
  const { data: tokenBalance } = useReadContract({
    address: asset.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read user's vault share balance
  const { data: shareBalance } = useReadContract({
    address: ADDRESSES.vault,
    abi: VAULT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read allowance
  const { data: allowance } = useReadContract({
    address: asset.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, ADDRESSES.vault] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract: approve, data: approveTxHash } = useWriteContract();
  const { writeContract: deposit, data: depositTxHash } = useWriteContract();
  const { writeContract: withdraw, data: withdrawTxHash } = useWriteContract();

  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isDepositing } = useWaitForTransactionReceipt({ hash: depositTxHash });
  const { isLoading: isWithdrawing } = useWaitForTransactionReceipt({ hash: withdrawTxHash });

  const isLoading = isApproving || isDepositing || isWithdrawing;

  const displayBalance = tab === "deposit"
    ? tokenBalance ? formatUnits(tokenBalance as bigint, asset.decimals) : "0"
    : shareBalance ? formatUnits(shareBalance as bigint, asset.decimals) : "0";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !amount || Number(amount) <= 0) return;

    const parsedAmount = parseUnits(amount, asset.decimals);

    if (tab === "deposit") {
      // Check if approval needed
      const currentAllowance = (allowance as bigint) ?? 0n;
      if (currentAllowance < parsedAmount) {
        approve({
          address: asset.address,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [ADDRESSES.vault, parsedAmount],
        });
        return;
      }

      deposit({
        address: ADDRESSES.vault,
        abi: VAULT_ABI,
        functionName: "deposit",
        args: [parsedAmount, address],
      });
    } else {
      withdraw({
        address: ADDRESSES.vault,
        abi: VAULT_ABI,
        functionName: "withdraw",
        args: [parsedAmount, address, address],
      });
    }

    setAmount("");
  };

  const needsApproval = tab === "deposit" && amount && address
    ? ((allowance as bigint) ?? 0n) < parseUnits(amount || "0", asset.decimals)
    : false;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm overflow-hidden">
      <div className="h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {(["deposit", "withdraw"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${
              tab === t
                ? "bg-white/5 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Asset display */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Asset</label>
          <div className="flex gap-2">
            <div className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25">
              {selectedAsset}
            </div>
          </div>
        </div>

        {/* Amount input */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400">Amount</label>
            <button
              type="button"
              onClick={() => setAmount(displayBalance)}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Balance: {Number(displayBalance).toLocaleString("en-US", { maximumFractionDigits: 2 })} (Max)
            </button>
          </div>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg font-medium text-white placeholder-slate-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
              {selectedAsset}
            </span>
          </div>
        </div>

        {/* Gas sponsored notice */}
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
          <svg className="h-4 w-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-emerald-400">
            Gas fees are sponsored by Conflux - this transaction is free!
          </span>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!isConnected || !amount || Number(amount) <= 0 || isLoading}
        >
          {isLoading
            ? "Confirming..."
            : !isConnected
              ? "Connect Wallet"
              : needsApproval
                ? `Approve ${selectedAsset}`
                : `${tab === "deposit" ? "Deposit" : "Withdraw"} ${selectedAsset}`}
        </button>
      </form>
    </div>
  );
}
