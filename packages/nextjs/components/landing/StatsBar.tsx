"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface Stat {
  value: number;
  suffix: string;
  label: string;
}

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView) return;

    const duration = 2000;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [isInView, value]);

  const text = displayed >= 1000 ? `${displayed.toLocaleString()}${suffix}` : `${displayed}${suffix}`;

  return (
    <span ref={ref} className="font-mono text-3xl font-bold text-white sm:text-4xl">
      {text}
    </span>
  );
}

export default function StatsBar() {
  const [stats, setStats] = useState<Stat[]>([
    { value: 0, suffix: "", label: "Wallets Scored" },
    { value: 5, suffix: "", label: "Chains Supported" },
    { value: 0, suffix: "", label: "Attestations Created" },
    { value: 850, suffix: "", label: "Max Score" },
  ]);

  useEffect(() => {
    fetch("/api/v1/stats")
      .then(res => res.json())
      .then(data => {
        setStats([
          { value: data.walletsScored || 0, suffix: "", label: "Wallets Scored" },
          { value: data.chainsSupported || 5, suffix: "", label: "Chains Supported" },
          { value: data.attestationsCreated || 0, suffix: "", label: "Attestations Created" },
          { value: 850, suffix: "", label: "Max Score" },
        ]);
      })
      .catch(err => console.error("[StatsBar] Failed to load stats:", err));
  }, []);

  return (
    <section className="border-y border-[#2A2F4D] bg-[#111631]/50 backdrop-blur-sm">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="text-center"
          >
            <AnimatedCounter value={stat.value} suffix={stat.suffix} />
            <p className="mt-1 text-sm text-gray-400">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
