"use client";

import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { wagmiConfig } from "@/lib/wagmi";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en" className="dark">
      <head>
        <title>ConfluxMind - Autonomous DeFAI Yield Optimizer</title>
        <meta
          name="description"
          content="AI-powered yield optimization on Conflux eSpace with gasless transactions"
        />
      </head>
      <body className="antialiased">
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider
              theme={darkTheme({
                accentColor: "#6366f1",
                accentColorForeground: "white",
                borderRadius: "medium",
                overlayBlur: "small",
              })}
            >
              {children}
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
