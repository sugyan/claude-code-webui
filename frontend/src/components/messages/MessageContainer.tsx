import React from "react";

interface MessageContainerProps {
  alignment: "left" | "right" | "center";
  colorScheme: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function MessageContainer({
  alignment,
  colorScheme,
  style,
  children,
}: MessageContainerProps) {
  const justifyClass =
    alignment === "right"
      ? "justify-end"
      : alignment === "center"
        ? "justify-center"
        : "justify-start";

  return (
    <div className={`mb-4 flex ${justifyClass}`}>
      <div
        className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-4 py-3 ${colorScheme}`}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}
