"use client";

import { useEffect, useRef, useState } from "react";

interface WheelPickerProps {
  options: Array<{ value: number; label: string }>;
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export function WheelPicker({ options, value, onChange, className = "" }: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ y: 0, scrollTop: 0 });
  const lastScrollTop = useRef(0);

  const ITEM_HEIGHT = 44; // Height of each item in pixels
  const VISIBLE_ITEMS = 5; // Number of items visible at once
  const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

  // Initialize scroll position to center the selected value
  useEffect(() => {
    if (containerRef.current) {
      const selectedIndex = options.findIndex((opt) => opt.value === value);
      if (selectedIndex !== -1) {
        const scrollTop = selectedIndex * ITEM_HEIGHT;
        containerRef.current.scrollTop = scrollTop;
        lastScrollTop.current = scrollTop;
      }
    }
  }, []); // Only run on mount

  const snapToNearest = () => {
    if (!containerRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const centerIndex = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(centerIndex, options.length - 1));

    // Snap to the nearest item
    const targetScrollTop = clampedIndex * ITEM_HEIGHT;
    containerRef.current.scrollTo({
      top: targetScrollTop,
      behavior: "smooth",
    });
    lastScrollTop.current = targetScrollTop;

    // Update selected value
    const newValue = options[clampedIndex]?.value;
    if (newValue !== undefined && newValue !== value) {
      onChange(newValue);
    }

    setIsDragging(false);
  };

  const handleScroll = () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    setIsDragging(true);

    scrollTimeoutRef.current = setTimeout(() => {
      snapToNearest();
    }, 100);
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    setIsDragging(true);
    dragStartRef.current = {
      y: e.clientY,
      scrollTop: containerRef.current.scrollTop,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      
      const deltaY = dragStartRef.current.y - moveEvent.clientY;
      containerRef.current.scrollTop = dragStartRef.current.scrollTop + deltaY;
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      snapToNearest();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    
    setIsDragging(true);
    const touch = e.touches[0];
    dragStartRef.current = {
      y: touch.clientY,
      scrollTop: containerRef.current.scrollTop,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    
    const touch = e.touches[0];
    const deltaY = dragStartRef.current.y - touch.clientY;
    containerRef.current.scrollTop = dragStartRef.current.scrollTop + deltaY;
  };

  const handleTouchEnd = () => {
    snapToNearest();
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!containerRef.current) return;
    
    const currentIndex = options.findIndex((opt) => opt.value === value);
    let newIndex = currentIndex;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      newIndex = Math.max(0, currentIndex - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      newIndex = Math.min(options.length - 1, currentIndex + 1);
    }

    if (newIndex !== currentIndex) {
      containerRef.current.scrollTop = newIndex * ITEM_HEIGHT;
      onChange(options[newIndex].value);
    }
  };

  const currentIndex = options.findIndex((opt) => opt.value === value);

  return (
    <div className={`relative ${className}`}>
      {/* Selection highlight overlay */}
      <div
        className="absolute left-0 right-0 pointer-events-none z-10 border-t-2 border-b-2 border-teal-500 bg-teal-50/50"
        style={{
          top: `${ITEM_HEIGHT * 2}px`,
          height: `${ITEM_HEIGHT}px`,
        }}
      />

      {/* Fade overlays for top and bottom */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />

      {/* Scrollable container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className="overflow-y-scroll scrollbar-hide relative focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-lg"
        style={{
          height: `${CONTAINER_HEIGHT}px`,
          scrollSnapType: "y mandatory",
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        {/* Padding items at top */}
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={`top-${i}`} style={{ height: `${ITEM_HEIGHT}px` }} />
        ))}

        {/* Actual options */}
        {options.map((option, index) => {
          const isSelected = option.value === value && !isDragging;
          const distance = Math.abs(index - currentIndex);
          const opacity = Math.max(0.3, 1 - distance * 0.2);

          return (
            <div
              key={option.value}
              className={`flex items-center justify-center transition-all select-none ${
                isSelected ? "font-semibold text-teal-700" : "text-gray-500"
              }`}
              style={{
                height: `${ITEM_HEIGHT}px`,
                scrollSnapAlign: "start",
                opacity,
                fontSize: isSelected ? "1.125rem" : "1rem",
                pointerEvents: "none",
              }}
            >
              {option.label}
            </div>
          );
        })}

        {/* Padding items at bottom */}
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={`bottom-${i}`} style={{ height: `${ITEM_HEIGHT}px` }} />
        ))}
      </div>
    </div>
  );
}
