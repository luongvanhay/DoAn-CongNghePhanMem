import { useEffect, useRef, useState } from "react";
import { resolveImageUrl } from "../utils/imageUrl.js";

export default function PoiImageField({
  file,
  imageUrl,
  onFileChange,
  onImageUrlChange,
}) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [failedImage, setFailedImage] = useState("");

  useEffect(() => {
    if (!file) {
      if (inputRef.current) inputRef.current.value = "";
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview({ file, url: objectUrl });
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const previewUrl = preview?.file === file ? preview.url : "";
  const displayedImage = previewUrl || resolveImageUrl(imageUrl);
  const previewFailed = failedImage === displayedImage;

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
      {displayedImage && (
        <img
          className="poi-image-preview"
          src={displayedImage}
          alt="Xem trước ảnh địa điểm"
          hidden={previewFailed}
          onError={() => setFailedImage(displayedImage)}
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
