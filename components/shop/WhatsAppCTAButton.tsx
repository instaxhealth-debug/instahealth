"use client";

export function WhatsAppCTAButton() {
  const handleClick = () => {
    const whatsappUrl = "https://wa.me/971505314857?text=Hi%20InstaHealth%20referred%20me%20I%20want%20a%20Lab%20Test%20Service%20at%20my%20location!%20(Please%20don%27t%20delete%20this%20message,%20as%20it%20helps%20us%20serve%20you%20better)";
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="max-w-md mx-auto">
      <button
        onClick={handleClick}
        className="w-full rounded-lg border-2 border-green-500 bg-green-50 p-6 hover:bg-green-100 transition-colors text-center space-y-2"
      >
        <div className="text-2xl font-bold text-green-700">WhatsApp Us</div>
        <div className="text-sm text-green-600">At-home lab test service at your location</div>
        <div className="text-xs text-green-500 pt-2">Click to chat on WhatsApp</div>
      </button>
    </div>
  );
}
