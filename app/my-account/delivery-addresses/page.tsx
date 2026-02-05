"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { AddressModal } from "@/components/account/AddressModal";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Trash2, Edit2, CheckCircle, Loader2 } from "lucide-react";

interface Address {
  id: string;
  label: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  area: string | null;
  city: string | null;
  emirate: string | null;
  instructions: string | null;
  lat: number;
  lng: number;
  placeId: string;
  formattedAddress: string;
  isDefault: boolean;
  createdAt: string;
}

export default function DeliveryAddressesPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login?next=/my-account/delivery-addresses");
    }
  }, [sessionStatus, router]);

  // Fetch addresses
  const fetchAddresses = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/my-account/addresses");

      if (!response.ok) {
        throw new Error("Failed to fetch addresses");
      }

      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (err: any) {
      console.error("[FetchAddresses] Error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchAddresses();
    }
  }, [sessionStatus]);

  // Handle add new address
  const handleAddAddress = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  // Handle edit address
  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setIsModalOpen(true);
  };

  // Handle delete address
  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) {
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/my-account/addresses/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete address");
      }

      await fetchAddresses();
    } catch (err: any) {
      console.error("[DeleteAddress] Error:", err);
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Handle set default
  const handleSetDefault = async (id: string) => {
    setError(null);

    try {
      const response = await fetch(`/api/my-account/addresses/${id}/default`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to set default address");
      }

      await fetchAddresses();
    } catch (err: any) {
      console.error("[SetDefault] Error:", err);
      setError(err.message);
    }
  };

  // Handle save address
  const handleSaveAddress = async (addressData: any) => {
    setError(null);

    try {
      const url = editingAddress
        ? `/api/my-account/addresses/${editingAddress.id}`
        : "/api/my-account/addresses";

      const method = editingAddress ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save address");
      }

      await fetchAddresses();
      setIsModalOpen(false);
      setEditingAddress(null);
    } catch (err: any) {
      console.error("[SaveAddress] Error:", err);
      throw err; // Re-throw to show error in modal
    }
  };

  if (sessionStatus === "loading" || sessionStatus === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 md:gap-10">
          {/* Left sidebar */}
          <AccountSidebar activeItem="delivery-addresses" />

          {/* Right content */}
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Delivery Addresses
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage your delivery addresses for faster checkout
                </p>
              </div>
              <Button
                onClick={handleAddAddress}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Address
              </Button>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              </div>
            )}

            {/* Empty state */}
            {!isLoading && addresses.length === 0 && (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No addresses yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Add your first delivery address to get started
                </p>
                <Button
                  onClick={handleAddAddress}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Address
                </Button>
              </div>
            )}

            {/* Address list */}
            {!isLoading && addresses.length > 0 && (
              <div className="grid gap-4">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className={`relative p-6 rounded-lg border-2 transition-all ${
                      address.isDefault
                        ? "border-teal-500 bg-teal-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    {/* Default badge */}
                    {address.isDefault && (
                      <div className="absolute top-4 right-4">
                        <div className="flex items-center gap-1 px-3 py-1 bg-teal-600 text-white text-xs font-medium rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Default
                        </div>
                      </div>
                    )}

                    {/* Address content */}
                    <div className="pr-24">
                      <div className="flex items-start gap-3 mb-3">
                        <MapPin className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 mb-1">
                            {address.label}
                          </div>
                          <div className="text-sm text-gray-700 space-y-1">
                            <div>{address.line1}</div>
                            {address.line2 && <div>{address.line2}</div>}
                            <div>
                              {[address.area, address.city, address.emirate]
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                            {address.phone && (
                              <div className="text-gray-500">
                                Phone: {address.phone}
                              </div>
                            )}
                            {address.instructions && (
                              <div className="text-gray-500 italic">
                                {address.instructions}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                      {!address.isDefault && (
                        <button
                          onClick={() => handleSetDefault(address.id)}
                          className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
                        >
                          Set as default
                        </button>
                      )}

                      <button
                        onClick={() => handleEditAddress(address)}
                        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors ml-auto"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteAddress(address.id)}
                        disabled={deletingId === address.id}
                        className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                      >
                        {deletingId === address.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Address modal */}
      <AddressModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAddress(null);
        }}
        onSave={handleSaveAddress}
        editingAddress={editingAddress}
      />
    </div>
  );
}
