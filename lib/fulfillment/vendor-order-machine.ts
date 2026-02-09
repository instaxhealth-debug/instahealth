import { prisma } from '@/lib/prisma';
import { logOrderEvent } from '@/lib/fulfillment/order-events';
type VendorOrderStatus =
  | 'NEW'
  | 'READY_FOR_FULFILLMENT'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'FAILED';

export type TransitionTarget = VendorOrderStatus;

export class VendorOrderTransitionError extends Error {
  code: 'INVALID_TRANSITION' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'CONFLICT' | 'INVALID_DATA';
  constructor(code: VendorOrderTransitionError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

const TERMINAL_STATUSES = new Set<VendorOrderStatus>([
  'REJECTED',
  'COMPLETED',
  'CANCELLED',
  'FAILED',
]);

const TRANSITIONS: Record<VendorOrderStatus, VendorOrderStatus[]> = {
  NEW: ['READY_FOR_FULFILLMENT', 'REJECTED'],
  READY_FOR_FULFILLMENT: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
  FAILED: [],
};

interface TransitionOptions {
  vendorOrderId: string;
  targetStatus: TransitionTarget;
  actorType: 'SYSTEM' | 'VENDOR' | 'ADMIN' | 'USER';
  actorId?: string;
  vendorId?: string;
  reason?: string;
  terminalReason?: string;
  overrideEventType?: string;
  allowExpiredAcceptBy?: boolean;
}

function assertVendorOrderIntegrity(vendorOrder: any) {
  if (!vendorOrder.orderId) {
    throw new VendorOrderTransitionError('INVALID_DATA', 'Vendor order is missing orderId');
  }
  if (!vendorOrder.items || vendorOrder.items.length === 0) {
    throw new VendorOrderTransitionError('INVALID_DATA', 'Vendor order has no items');
  }
  if (
    ['NEW', 'READY_FOR_FULFILLMENT'].includes(vendorOrder.status) &&
    !vendorOrder.acceptBy
  ) {
    throw new VendorOrderTransitionError('INVALID_DATA', 'acceptBy is required for pending orders');
  }
}

function getEventType(from: VendorOrderStatus, to: VendorOrderStatus, override?: string) {
  if (override) return override;
  if (to === 'ACCEPTED') return 'VENDOR_ACCEPTED';
  if (to === 'REJECTED') return 'VENDOR_REJECTED';
  if (to === 'CANCELLED') return 'VENDOR_CANCELLED_AFTER_ACCEPT';
  if (to === 'COMPLETED') return 'VENDOR_FULFILLED';
  return 'VENDOR_STATUS_CHANGED';
}

export async function transitionVendorOrder(options: TransitionOptions) {
  const {
    vendorOrderId,
    targetStatus,
    actorType,
    actorId,
    vendorId,
    reason,
    terminalReason,
    overrideEventType,
    allowExpiredAcceptBy = false,
  } = options;

  const vendorOrder = await prisma.vendorOrder.findUnique({
    where: { id: vendorOrderId },
    include: {
      vendor: true,
      order: true,
      items: { include: { orderItem: true } },
    },
  });

  if (!vendorOrder) {
    throw new VendorOrderTransitionError('NOT_FOUND', 'Vendor order not found');
  }

  if (vendorId && vendorOrder.vendorId !== vendorId) {
    throw new VendorOrderTransitionError('UNAUTHORIZED', 'Vendor order access denied');
  }

  assertVendorOrderIntegrity(vendorOrder);

  const currentStatus = vendorOrder.status as VendorOrderStatus;

  if (currentStatus === targetStatus) {
    return { already: true, vendorOrder };
  }

  if (TERMINAL_STATUSES.has(currentStatus)) {
    throw new VendorOrderTransitionError(
      'INVALID_TRANSITION',
      `Cannot transition from terminal status ${currentStatus}`
    );
  }

  const allowedTargets = TRANSITIONS[currentStatus] || [];
  if (!allowedTargets.includes(targetStatus)) {
    throw new VendorOrderTransitionError(
      'INVALID_TRANSITION',
      `Cannot transition from ${currentStatus} to ${targetStatus}`
    );
  }

  if (['ACCEPTED', 'REJECTED'].includes(targetStatus) && !allowExpiredAcceptBy) {
    if (vendorOrder.acceptBy && vendorOrder.acceptBy < new Date()) {
      throw new VendorOrderTransitionError('INVALID_TRANSITION', 'Acceptance deadline passed');
    }
  }

  const effectiveTerminalReason =
    terminalReason ||
    (targetStatus === 'REJECTED'
      ? 'VENDOR_REJECTED'
      : targetStatus === 'CANCELLED'
      ? 'VENDOR_CANCELLED'
      : targetStatus === 'FAILED'
      ? 'FAILED'
      : undefined);

  if (targetStatus === 'REJECTED' && !effectiveTerminalReason) {
    throw new VendorOrderTransitionError('INVALID_DATA', 'terminalReason is required for rejection');
  }

  const updateData: Record<string, any> = { status: targetStatus };

  if (targetStatus === 'ACCEPTED') updateData.acceptedAt = new Date();
  if (targetStatus === 'COMPLETED') updateData.fulfilledAt = new Date();
  if (targetStatus === 'REJECTED') updateData.rejectedAt = new Date();
  if (targetStatus === 'CANCELLED') updateData.cancelledAt = new Date();

  if (effectiveTerminalReason) {
    updateData.terminalReason = effectiveTerminalReason;
  }

  if (reason) {
    updateData.notesInternal = `${targetStatus} transition: ${reason}`;
    updateData.resolutionNotes = reason;
  }

  const updateWhere: any = { id: vendorOrderId, status: currentStatus };
  if (
    ['READY_FOR_FULFILLMENT', 'NEW'].includes(currentStatus) &&
    ['ACCEPTED', 'REJECTED'].includes(targetStatus) &&
    !allowExpiredAcceptBy
  ) {
    updateWhere.acceptBy = { gt: new Date() };
  }

  const updated = await prisma.vendorOrder.updateMany({
    where: updateWhere,
    data: updateData,
  });

  if (updated.count === 0) {
    const latest = await prisma.vendorOrder.findUnique({
      where: { id: vendorOrderId },
      include: {
        items: {
          include: {
            orderItem: true,
          },
        },
      },
    });
    if (latest?.status === targetStatus) {
      return { already: true, vendorOrder: latest };
    }
    throw new VendorOrderTransitionError('CONFLICT', 'Order was already processed');
  }

  const eventType = getEventType(currentStatus, targetStatus, overrideEventType);

  await logOrderEvent({
    vendorOrderId,
    orderId: vendorOrder.orderId,
    actorType,
    actorId,
    eventType,
    data: {
      vendorName: vendorOrder.vendor?.name,
      from: currentStatus,
      to: targetStatus,
      reason,
      terminalReason: effectiveTerminalReason,
      itemCount: vendorOrder.items.length,
      timestamp: new Date().toISOString(),
    },
  });

  const refreshed = await prisma.vendorOrder.findUnique({
    where: { id: vendorOrderId },
    include: {
      items: {
        include: {
          orderItem: true,
        },
      },
    },
  });

  return { already: false, vendorOrder: refreshed };
}