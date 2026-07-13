"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { ProductIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { products } from "@/lib/products";
import { cn } from "@/lib/utils";

export function ProductGrid() {
  return (
    <section id="products" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            Product suite
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Six tools live. Four on the way.
          </h2>
          <p className="mt-4 text-foreground/60">
            Each product solves one hard engineering job. One account, one
            subscription, shared usage across the suite.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, i) => {
            const isLive = product.status === "available";
            return (
              <motion.div
                key={product.slug}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
              >
                <Link
                  href={isLive ? product.href : "/#waitlist"}
                  className="group block h-full"
                >
                  <Card
                    className={cn(
                      "h-full transition duration-300 hover:border-white/20 hover:bg-white/[0.05]",
                      !isLive && "opacity-80",
                    )}
                  >
                    <CardHeader>
                      <div className="mb-3 flex items-start justify-between">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-slate-950 shadow-lg",
                            product.accent,
                          )}
                        >
                          <ProductIcon name={product.icon} className="h-5 w-5" />
                        </div>
                        <Badge variant={isLive ? "success" : "muted"}>
                          {isLive ? "Available" : "Coming soon"}
                        </Badge>
                      </div>
                      <CardTitle className="flex items-center gap-1.5">
                        {product.name}
                        <ArrowUpRight className="h-4 w-4 opacity-0 transition group-hover:opacity-70" />
                      </CardTitle>
                      <CardDescription className="text-cyan-300/70">
                        {product.tagline}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-foreground/55">
                        {product.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
