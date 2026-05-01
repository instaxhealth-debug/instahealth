"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  RefreshCw,
  Eye,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: "PENDING" | "CONFIRMED" | "RESCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  amountFils: number;
  currency: string;
  createdAt: string;
  preferredDate: string | null;
  scheduledAt: string | null;
  product: {
    name: string;
    imageUrl: string | null;
  };
  vendor: {
    name: string;
  };
  user: {
    name: string | null;
    email: string | null;
  } | null;
}

interface StatusCounts {
  PENDING?: number;
  CONFIRMED?: number;
  RESCHEDULED?: number;
  IN_PROGRESS?: number;
  COMPLETED?: number;
  CANCELLED?: number;
}

interface Vendor {
  id: string;
  name: string;
}

const statusConfig = {
  PENDING: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: CheckCircle2,
  },
  RESCHEDULED: {
    label: "Rescheduled",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: RefreshCw,
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    icon: Package,
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
  },
};

export default function AdminBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);

  // Fetch bookings
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });

      if (selectedStatus !== "all") {
        params.append("status", selectedStatus);
      }
      if (selectedVendor !== "all") {
        params.append("vendorId", selectedVendor);
      }

      const response = await fetch(`/api/admin/bookings?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const data = await response.json();
      setBookings(data.bookings || []);
      setStatusCounts(data.statusCounts || {});
      setTotalBookings(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Fetch vendors for filter
  const fetchVendors = async () => {
    try {
      const response = await fetch("/api/admin/vendors");
      if (response.ok) {
        const data = await response.json();
        // API returns array directly, not wrapped
        setVendors(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedStatus, selectedVendor]);

  useEffect(() => {
    fetchVendors();
  }, []);

  // Filter by search query
  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;

    const query = searchQuery.toLowerCase();
    return bookings.filter(
      (booking) =>
        booking.id.toLowerCase().includes(query) ||
        booking.customerName.toLowerCase().includes(query) ||
        booking.customerEmail.toLowerCase().includes(query) ||
        booking.customerPhone.includes(query) ||
        booking.product.name.toLowerCase().includes(query) ||
        booking.vendor.name.toLowerCase().includes(query)
    );
  }, [bookings, searchQuery]);

  // Handle status change
  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      // Refresh bookings
      await fetchBookings();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  // Format price
  const formatPrice = (fils: number, currency: string = "AED") => {
    return `${currency} ${(fils / 100).toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format date with time
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalAmount = bookings.reduce((sum, b) => sum + b.amountFils, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600 mt-1">Manage customer bookings and appointments</p>
        </div>
        <Button
          onClick={() => fetchBookings()}
          className="bg-[#41a59b] hover:bg-[#369189] rounded-xl"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Count Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Pending</p>
                <p className="text-3xl font-bold text-yellow-900 mt-2">
                  {statusCounts.PENDING || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-yellow-200/50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Confirmed</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">
                  {statusCounts.CONFIRMED || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-200/50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700">In Progress</p>
                <p className="text-3xl font-bold text-indigo-900 mt-2">
                  {statusCounts.IN_PROGRESS || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-indigo-200/50 flex items-center justify-center">
                <Package className="h-6 w-6 text-indigo-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Completed</p>
                <p className="text-3xl font-bold text-green-900 mt-2">
                  {statusCounts.COMPLETED || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-200/50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Cancelled</p>
                <p className="text-3xl font-bold text-red-900 mt-2">
                  {statusCounts.CANCELLED || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-red-200/50 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatPrice(totalAmount)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gray-200/50 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-gray-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by ID, customer, service, vendor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-border/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="RESCHEDULED">Rescheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Vendor Filter */}
            <select
              value={selectedVendor}
              onChange={(e) => {
                setSelectedVendor(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-border/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors"
            >
              <option value="all">All Vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter className="h-4 w-4" />
              <span>
                Showing <strong>{filteredBookings.length}</strong> of{" "}
                <strong>{totalBookings}</strong> bookings
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookings Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Booking ID</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span>Loading bookings...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <Calendar className="h-12 w-12 text-gray-300" />
                        <p className="font-medium">No bookings found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((booking) => {
                    const StatusIcon = statusConfig[booking.status].icon;
                    return (
                      <TableRow key={booking.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">
                          {booking.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900">
                            {booking.product.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">
                              {booking.customerName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {booking.customerEmail}
                            </div>
                            <div className="text-xs text-gray-500">
                              {booking.customerPhone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-900">
                            {booking.vendor.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig[booking.status].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[booking.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {formatDate(booking.scheduledAt || booking.preferredDate)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Created: {formatDate(booking.createdAt)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-gray-900">
                            {formatPrice(booking.amountFils, booking.currency)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() =>
                                  alert(`View details for booking ${booking.id}`)
                                }
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <div className="px-2 py-1 text-xs font-semibold text-gray-500 border-t border-b my-1">
                                Change Status
                              </div>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(booking.id, "CONFIRMED")
                                }
                                disabled={booking.status === "CONFIRMED"}
                              >
                                Confirm
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(booking.id, "IN_PROGRESS")
                                }
                                disabled={booking.status === "IN_PROGRESS"}
                              >
                                Mark In Progress
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(booking.id, "COMPLETED")
                                }
                                disabled={booking.status === "COMPLETED"}
                              >
                                Mark Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(booking.id, "CANCELLED")
                                }
                                disabled={booking.status === "CANCELLED"}
                                className="text-red-600"
                              >
                                Cancel Booking
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && filteredBookings.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
