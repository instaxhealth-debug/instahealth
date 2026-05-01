'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Check,
  Clock,
  X,
  Calendar,
  Loader2,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'RESCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  status: BookingStatus;
  preferredDate: string | null;
  scheduledAt: string | null;
  amountFils: number;
  createdAt: string;
  notes: string | null;
  product: {
    name: string;
    imageUrl: string | null;
  };
  user: {
    name: string | null;
    email: string;
  } | null;
}

interface BookingsResponse {
  ok: boolean;
  bookings: Booking[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ActionDialog {
  open: boolean;
  type: 'accept' | 'reschedule' | 'in-progress' | 'complete' | 'cancel' | null;
  booking: Booking | null;
  scheduledDate?: string;
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; variant: string; color: string; icon: React.ReactNode }> = {
  PENDING: {
    label: 'Pending',
    variant: 'outline',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    icon: <Clock className="h-3 w-3" />
  },
  CONFIRMED: {
    label: 'Confirmed',
    variant: 'default',
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: <Check className="h-3 w-3" />
  },
  RESCHEDULED: {
    label: 'Rescheduled',
    variant: 'secondary',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Calendar className="h-3 w-3" />
  },
  IN_PROGRESS: {
    label: 'In Progress',
    variant: 'default',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <PlayCircle className="h-3 w-3" />
  },
  COMPLETED: {
    label: 'Completed',
    variant: 'secondary',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: <CheckCircle2 className="h-3 w-3" />
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'destructive',
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle className="h-3 w-3" />
  },
};

export default function VendorBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [actionDialog, setActionDialog] = useState<ActionDialog>({
    open: false,
    type: null,
    booking: null,
  });
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/bookings/vendor');

      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const data: BookingsResponse = await response.json();
      setBookings(data.bookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast({
        title: 'Error',
        description: 'Failed to load bookings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: BookingStatus, scheduledAt?: string) => {
    try {
      setUpdating(true);
      const response = await fetch('/api/bookings/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          status: newStatus,
          ...(scheduledAt && { scheduledAt }),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update booking status');
      }

      const data = await response.json();

      if (data.ok) {
        setBookings(bookings.map(b =>
          b.id === bookingId ? { ...b, status: newStatus, ...(scheduledAt && { scheduledAt }) } : b
        ));

        toast({
          title: 'Success',
          description: `Booking ${STATUS_CONFIG[newStatus].label.toLowerCase()}`,
        });

        setActionDialog({ open: false, type: null, booking: null });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update booking',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const openActionDialog = (type: ActionDialog['type'], booking: Booking) => {
    setActionDialog({ open: true, type, booking });
  };

  const confirmAction = () => {
    if (!actionDialog.booking || !actionDialog.type) return;

    const statusMap = {
      accept: 'CONFIRMED' as BookingStatus,
      reschedule: 'RESCHEDULED' as BookingStatus,
      'in-progress': 'IN_PROGRESS' as BookingStatus,
      complete: 'COMPLETED' as BookingStatus,
      cancel: 'CANCELLED' as BookingStatus,
    };

    handleStatusUpdate(
      actionDialog.booking.id,
      statusMap[actionDialog.type],
      actionDialog.scheduledDate
    );
  };

  const filteredBookings = bookings.filter(booking => {
    if (activeTab === 'all') return true;
    return booking.status === activeTab;
  });

  const getStatusCounts = () => {
    return {
      all: bookings.length,
      PENDING: bookings.filter(b => b.status === 'PENDING').length,
      CONFIRMED: bookings.filter(b => b.status === 'CONFIRMED').length,
      IN_PROGRESS: bookings.filter(b => b.status === 'IN_PROGRESS').length,
      COMPLETED: bookings.filter(b => b.status === 'COMPLETED').length,
      CANCELLED: bookings.filter(b => b.status === 'CANCELLED').length,
    };
  };

  const counts = getStatusCounts();

  const StatusBadge = ({ status }: { status: BookingStatus }) => {
    const config = STATUS_CONFIG[status];
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        {config.icon}
        {config.label}
      </div>
    );
  };

  const ActionButtons = ({ booking }: { booking: Booking }) => {
    const buttons = [];

    if (booking.status === 'PENDING') {
      buttons.push(
        <Button
          key="accept"
          size="sm"
          variant="default"
          className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700"
          onClick={() => openActionDialog('accept', booking)}
        >
          <Check className="h-3 w-3 mr-1" />
          Accept
        </Button>
      );
    }

    if (['PENDING', 'CONFIRMED'].includes(booking.status)) {
      buttons.push(
        <Button
          key="reschedule"
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs"
          onClick={() => openActionDialog('reschedule', booking)}
        >
          <Calendar className="h-3 w-3 mr-1" />
          Reschedule
        </Button>
      );
    }

    if (booking.status === 'CONFIRMED') {
      buttons.push(
        <Button
          key="start"
          size="sm"
          variant="default"
          className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
          onClick={() => openActionDialog('in-progress', booking)}
        >
          <PlayCircle className="h-3 w-3 mr-1" />
          Start
        </Button>
      );
    }

    if (booking.status === 'IN_PROGRESS') {
      buttons.push(
        <Button
          key="complete"
          size="sm"
          variant="default"
          className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700"
          onClick={() => openActionDialog('complete', booking)}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Complete
        </Button>
      );
    }

    if (!['COMPLETED', 'CANCELLED'].includes(booking.status)) {
      buttons.push(
        <Button
          key="cancel"
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => openActionDialog('cancel', booking)}
        >
          <X className="h-3 w-3 mr-1" />
          Cancel
        </Button>
      );
    }

    return <div className="flex gap-1.5 flex-wrap">{buttons}</div>;
  };

  const MobileBookingCard = ({ booking }: { booking: Booking }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-sm">{booking.product.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(booking.createdAt), 'MMM dd, yyyy')}
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="space-y-2 mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="text-sm font-medium">{booking.customerName}</p>
            <p className="text-xs text-muted-foreground">{booking.customerPhone}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="text-sm">
              {booking.scheduledAt
                ? format(new Date(booking.scheduledAt), 'MMM dd, yyyy - hh:mm a')
                : booking.preferredDate
                ? format(new Date(booking.preferredDate), 'MMM dd, yyyy')
                : 'Not scheduled'}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-sm font-semibold">AED {(booking.amountFils / 100).toFixed(2)}</p>
          </div>
        </div>

        <ActionButtons booking={booking} />
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Failed to Load Bookings</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchBookings}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Service Bookings</h1>
        <p className="text-muted-foreground mt-1">Manage your customer appointments</p>
      </div>

      {/* Tabs Filter */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 bg-transparent p-0">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            All <span className="ml-1.5 text-xs opacity-70">({counts.all})</span>
          </TabsTrigger>
          <TabsTrigger value="PENDING" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white">
            Pending <span className="ml-1.5 text-xs opacity-70">({counts.PENDING})</span>
          </TabsTrigger>
          <TabsTrigger value="CONFIRMED" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
            Confirmed <span className="ml-1.5 text-xs opacity-70">({counts.CONFIRMED})</span>
          </TabsTrigger>
          <TabsTrigger value="IN_PROGRESS" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            In Progress <span className="ml-1.5 text-xs opacity-70">({counts.IN_PROGRESS})</span>
          </TabsTrigger>
          <TabsTrigger value="COMPLETED" className="data-[state=active]:bg-gray-600 data-[state=active]:text-white">
            Completed <span className="ml-1.5 text-xs opacity-70">({counts.COMPLETED})</span>
          </TabsTrigger>
          <TabsTrigger value="CANCELLED" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Cancelled <span className="ml-1.5 text-xs opacity-70">({counts.CANCELLED})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredBookings.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No {activeTab !== 'all' ? STATUS_CONFIG[activeTab as BookingStatus]?.label.toLowerCase() : ''} bookings found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block border rounded-lg overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Service</TableHead>
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold text-right">Amount</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {booking.product.imageUrl && (
                              <img
                                src={booking.product.imageUrl}
                                alt={booking.product.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            )}
                            <div>
                              <p className="font-medium text-sm">{booking.product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Booked {format(new Date(booking.createdAt), 'MMM dd')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{booking.customerName}</p>
                            <p className="text-xs text-muted-foreground">{booking.customerPhone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={booking.status} />
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {booking.scheduledAt
                              ? format(new Date(booking.scheduledAt), 'MMM dd, yyyy')
                              : booking.preferredDate
                              ? format(new Date(booking.preferredDate), 'MMM dd, yyyy')
                              : '-'}
                          </p>
                          {booking.scheduledAt && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(booking.scheduledAt), 'hh:mm a')}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="font-semibold text-sm">
                            AED {(booking.amountFils / 100).toFixed(2)}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <ActionButtons booking={booking} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden">
                {filteredBookings.map((booking) => (
                  <MobileBookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'accept' && 'Accept Booking'}
              {actionDialog.type === 'reschedule' && 'Reschedule Booking'}
              {actionDialog.type === 'in-progress' && 'Mark as In Progress'}
              {actionDialog.type === 'complete' && 'Complete Booking'}
              {actionDialog.type === 'cancel' && 'Cancel Booking'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'accept' && 'Confirm this booking and notify the customer?'}
              {actionDialog.type === 'reschedule' && 'Update the scheduled date for this booking?'}
              {actionDialog.type === 'in-progress' && 'Mark this booking as currently in progress?'}
              {actionDialog.type === 'complete' && 'Mark this booking as completed?'}
              {actionDialog.type === 'cancel' && 'Are you sure you want to cancel this booking? The customer will be notified.'}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.type === 'reschedule' && (
            <div className="py-4">
              <label className="text-sm font-medium mb-2 block">New Scheduled Date</label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                onChange={(e) => setActionDialog({ ...actionDialog, scheduledDate: e.target.value })}
              />
            </div>
          )}

          {actionDialog.booking && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm"><span className="font-medium">Service:</span> {actionDialog.booking.product.name}</p>
              <p className="text-sm"><span className="font-medium">Customer:</span> {actionDialog.booking.customerName}</p>
              <p className="text-sm"><span className="font-medium">Amount:</span> AED {(actionDialog.booking.amountFils / 100).toFixed(2)}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, type: null, booking: null })}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={updating || (actionDialog.type === 'reschedule' && !actionDialog.scheduledDate)}
              variant={actionDialog.type === 'cancel' ? 'destructive' : 'default'}
            >
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
