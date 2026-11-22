"use client";

export default function OfficeMapPreview({
  address,
  latitude,
  longitude,
}: {
  address: string;
  latitude: string | number;
  longitude: string | number;
}) {
  const hasCoordinates = String(latitude).trim() !== "" && String(longitude).trim() !== "";
  const query = hasCoordinates ? `${latitude},${longitude}` : address.trim();

  if (!query) {
    return <div className="flex h-56 items-center justify-center border border-dashed border-[#CBD3D6] bg-[#F7F9F9] text-sm text-[#66747A]">Enter an address or coordinates to preview the office map.</div>;
  }

  return (
    <div className="border border-[#DCE2E4]">
      <iframe
        title="Office location map preview"
        src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
        className="h-56 w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="flex items-center justify-between gap-3 bg-[#F7F9F9] px-3 py-2 text-xs text-[#66747A]">
        <span>{hasCoordinates ? `${latitude}, ${longitude}` : address}</span>
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`} target="_blank" rel="noreferrer" className="shrink-0 font-medium text-[#36474F] underline">Open Google Maps</a>
      </div>
    </div>
  );
}
