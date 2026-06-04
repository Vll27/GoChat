import { useCallback, useEffect, useState } from "react";

export function useMediaPreview() {
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const clearMedia = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setMediaFile(null);
    setMediaPreview(null);
    setMediaType("");
    setPreviewUrl("");
  }, [previewUrl]);

  const selectMedia = useCallback((file) => {
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      throw new Error("Please select an image or video file");
    }

    const nextPreviewUrl = URL.createObjectURL(file);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setMediaFile(file);
    setPreviewUrl(nextPreviewUrl);
    setMediaPreview(nextPreviewUrl);
    setMediaType(file.type.startsWith("video/") ? "video" : "image");
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return {
    mediaFile,
    mediaPreview,
    mediaType,
    selectMedia,
    clearMedia,
  };
}
