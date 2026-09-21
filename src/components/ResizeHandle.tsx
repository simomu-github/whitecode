import { Separator } from "react-resizable-panels";

type ResizeHandleProps = {
  /** Orientation of the parent Group, not of the handle itself. */
  orientation: "horizontal" | "vertical";
};

export function ResizeHandle({ orientation }: ResizeHandleProps) {
  const size = orientation === "horizontal" ? "w-px" : "h-px";
  return (
    <Separator
      className={`${size} bg-border transition-colors data-[separator=active]:bg-accent data-[separator=hover]:bg-accent`}
    />
  );
}
