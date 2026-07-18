import {
  Activity,
  AudioLines,
  Hammer,
  Layers,
  LifeBuoy,
  Map,
  Mic,
  Orbit,
  Radar,
  Shield,
  Workflow,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Layers,
  Activity,
  Map,
  Shield,
  Hammer,
  Radar,
  Workflow,
  Orbit,
  LifeBuoy,
  AudioLines,
  Mic,
};

export function ProductIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = iconMap[name] ?? Layers;
  return <Icon className={className} />;
}
