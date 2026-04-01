import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Media } from "../types/api";

interface MediaCarouselProps {
  media: Media[];
  label?: string;
  removeLabel?: string;
  canRemoveCurrent?: boolean;
  isRemovingCurrent?: boolean;
  onRemoveCurrent?: (mediaId: string) => void;
  frameClassName?: string;
  contentClassName?: string;
}

export default function MediaCarousel({
  media,
  label = "Post media",
  removeLabel = "Remove media item",
  canRemoveCurrent = false,
  isRemovingCurrent = false,
  onRemoveCurrent,
  frameClassName = "post-media-frame",
  contentClassName = "post-media-frame-content",
}: MediaCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex > media.length - 1) {
      setActiveIndex(Math.max(media.length - 1, 0));
    }
  }, [activeIndex, media.length]);

  if (!media || !media.length) {
    return null;
  }

  const currentMedia = media[activeIndex] || media[0];
  const hasMultipleItems = media.length > 1;

  const isFirst = activeIndex === 0;
  const isLast = activeIndex === media.length - 1;

  const goToPrevious = () => {
    if (!isFirst) setActiveIndex((current) => current - 1);
  };

  const goToNext = () => {
    if (!isLast) setActiveIndex((current) => current + 1);
  };

  return (
    <div className={`carousel-frame ${frameClassName}`}>
      {currentMedia.type === "video" ? (
        <video
          key={currentMedia.id}
          src={currentMedia.url}
          controls
          className={contentClassName}
          aria-label={label}
        />
      ) : (
        <img
          key={currentMedia.id}
          src={currentMedia.url}
          alt={`${label} ${activeIndex + 1}`}
          className={contentClassName}
        />
      )}

      {hasMultipleItems ? (
        <>
          {!isFirst && (
            <button
              type="button"
              className="carousel-nav carousel-nav-left"
              onClick={goToPrevious}
              aria-label="Previous media item"
            >
              <ChevronLeft className="icon-action-icon" />
            </button>
          )}

          {!isLast && (
            <button
              type="button"
              className="carousel-nav carousel-nav-right"
              onClick={goToNext}
              aria-label="Next media item"
            >
              <ChevronRight className="icon-action-icon" />
            </button>
          )}

          <div className="carousel-counter">
            {activeIndex + 1} / {media.length}
          </div>

          <div className="carousel-dots" aria-hidden="true">
            {media.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`carousel-dot ${index === activeIndex ? "is-active" : ""}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Show media item ${index + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}

      {canRemoveCurrent && currentMedia && onRemoveCurrent ? (
        <button
          type="button"
          className="carousel-remove"
          disabled={isRemovingCurrent}
          onClick={() => onRemoveCurrent(currentMedia.id)}
          aria-label={removeLabel}
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}
