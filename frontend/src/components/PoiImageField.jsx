import { useEffect, useRef, useState } from "react";
import { resolveImageUrl } from "../utils/imageUrl.js";

export default function PoiImageField({
  file,
  imageUrl,
  onFileChange,
  onImageUrlChange,
}) {
  const inputRef = useRef(null);
  const imageRef = useRef(null);
  const [failedImageKey, setFailedImageKey] = useState(null);
  const displayedImage = resolveImageUrl(imageUrl);
  const currentImageKey = file || displayedImage;
  const previewFailed = currentImageKey === failedImageKey;

  useEffect(() => {
    if (!file) {
      if (inputRef.current) inputRef.current.value = "";
      if (imageRef.current) {
        if (displayedImage) imageRef.current.src = displayedImage;
        else imageRef.current.removeAttribute("src");
      }
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    if (imageRef.current) {
      imageRef.current.src = objectUrl;
      imageRef.current.hidden = false;
    }
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, displayedImage]);

  return (
    <div className="poi-image-field">
      <label className="poi-image-file-label">
        Ảnh địa điểm
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          onChange={(event) => onFileChange(event.target.files?.[0] || null)}
        />
      </label>
      <p className="poi-image-help">
        Chọn ảnh JPEG hoặc PNG, tối đa 8 MB. Ảnh được lưu cùng dữ liệu địa điểm.
      </p>
      {(displayedImage || file) && (
        <img
          ref={imageRef}
          className="poi-image-preview"
          src={displayedImage || undefined}
          alt="Xem trước ảnh địa điểm"
          hidden={previewFailed}
          onError={() => setFailedImageKey(currentImageKey)}
        />
      )}
      <label className="poi-image-url-label">
        Hoặc dùng URL ảnh có sẵn
        <input
          type="text"
          inputMode="url"
          value={imageUrl}
          onChange={(event) => onImageUrlChange(event.target.value)}
          maxLength={500}
          placeholder="https://example.com/image.jpg"
        />
      </label>
    </div>
  );
}
