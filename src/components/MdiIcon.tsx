import { Icon } from "@mdi/react";

interface MdiIconProps {
  path: string;
  className?: string;
  size?: number | string;
}

export default function MdiIcon({ path, className, size = 1 }: MdiIconProps) {
  return <Icon path={path} className={className} size={size} />;
}