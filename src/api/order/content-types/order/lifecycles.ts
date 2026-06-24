import { sendCustomerInvoiceEmail } from '../../utils/customer-invoice-email';

declare const strapi: any;

const FREE_DELIVERY_THRESHOLD = toFiniteNumber(process.env.ORDER_FREE_DELIVERY_THRESHOLD, 0);

type OrderLifecycleEvent = {
  params: {
    data?: Record<string, unknown>;
    where?: Record<string, unknown>;
  };
  result?: Record<string, any>;
  state?: Record<string, unknown>;
};

function toFiniteNumber(value: unknown, fallback?: number) {
  const normalizedValue = typeof value === 'string' && value.trim() ? value.replace(',', '.') : value;
  const numericValue = typeof normalizedValue === 'number' ? normalizedValue : Number(normalizedValue);

  if (Number.isFinite(numericValue)) {
    return numericValue;
  }

  return fallback;
}

function roundDecimal(value: number, fractionDigits = 2) {
  return Number(value.toFixed(fractionDigits));
}

function isWeightUnitName(unitName: unknown) {
  if (typeof unitName !== 'string') {
    return false;
  }

  const normalizedUnitName = unitName.trim().toLowerCase();

  return normalizedUnitName === 'кг' || normalizedUnitName === 'kg';
}

function getPricedItemMeasure(isWeightItem: boolean, itemWeight: number, quantity: number) {
  return isWeightItem ? itemWeight : quantity;
}

function canRecalculateItems(items: unknown[]) {
  return items.every((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const orderItem = item as Record<string, unknown>;

    return (
      toFiniteNumber(orderItem.unitPrice) !== undefined &&
      toFiniteNumber(orderItem.packageWeight) !== undefined &&
      toFiniteNumber(orderItem.quantity) !== undefined
    );
  });
}

function recalculateOrderData(data: Record<string, unknown>) {
  if (!Array.isArray(data.items) || !canRecalculateItems(data.items)) {
    return;
  }

  let totalItems = 0;
  let totalWeight = 0;
  let totalPrice = 0;

  data.items = data.items.map((rawItem) => {
    const item = rawItem as Record<string, unknown>;
    const unitPrice = roundDecimal(toFiniteNumber(item.unitPrice, 0) ?? 0);
    const packageWeight = roundDecimal(toFiniteNumber(item.packageWeight, 0) ?? 0, 3);
    const quantity = Math.max(Math.trunc(toFiniteNumber(item.quantity, 0) ?? 0), 0);
    const orderedWeight = roundDecimal(packageWeight * quantity, 3);
    const isWeightItem = isWeightUnitName(item.unitName);
    const parsedActualWeight = toFiniteNumber(item.actualWeight);
    const parsedItemWeight = toFiniteNumber(item.itemWeight);
    const nextItemWeight = isWeightItem
      ? roundDecimal(
          parsedActualWeight && parsedActualWeight > 0
            ? parsedActualWeight
            : parsedItemWeight && parsedItemWeight > 0
              ? parsedItemWeight
              : orderedWeight,
          3
        )
      : orderedWeight;
    const itemTotal = roundDecimal(
      unitPrice * getPricedItemMeasure(isWeightItem, nextItemWeight, quantity)
    );

    totalItems += quantity;
    if (isWeightItem) {
      totalWeight += nextItemWeight;
    }
    totalPrice += itemTotal;

    return {
      ...item,
      unitPrice,
      packageWeight,
      quantity,
      itemWeight: nextItemWeight,
      actualWeight:
        isWeightItem && parsedActualWeight && parsedActualWeight > 0 ? nextItemWeight : null,
      itemTotal,
    };
  });

  const roundedTotalPrice = roundDecimal(totalPrice);

  data.totalItems = totalItems;
  data.totalWeight = roundDecimal(totalWeight, 3);
  data.totalPrice = roundedTotalPrice;
  data.amountLeftForFreeDelivery = roundDecimal(
    Math.max(FREE_DELIVERY_THRESHOLD - roundedTotalPrice, 0)
  );
}

async function rememberPreviousOrderStatus(event: OrderLifecycleEvent) {
  if (event.params.data?.orderStatus === undefined || !event.params.where) {
    return;
  }

  const previousOrder = await strapi.db.query('api::order.order').findOne({
    where: event.params.where,
    select: ['id', 'orderStatus'],
  });

  event.state = {
    ...(event.state ?? {}),
    previousOrderStatus: previousOrder?.orderStatus,
  };
}

async function sendDeliveringInvoice(orderId: number) {
  const order = await strapi.entityService.findOne('api::order.order' as any, orderId, {
    populate: {
      items: true,
    },
  });

  if (!order?.customerEmail) {
    return;
  }

  await sendCustomerInvoiceEmail(
    {
      id: Number(order.id),
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      deliveryAddress: order.deliveryAddress,
      deliveryRegion: order.deliveryRegion,
      deliveryRegionCode: order.deliveryRegionCode,
      deliveryDate: order.deliveryDate,
      deliveryTimeInterval: order.deliveryTimeInterval,
      deliveryCost: order.deliveryCost,
      comment: order.comment,
      totalItems: order.totalItems,
      totalWeight: order.totalWeight,
      totalPrice: order.totalPrice,
      submittedAt: order.submittedAt,
      items: Array.isArray(order.items) ? order.items : [],
    },
    'delivering'
  );
}

export default {
  beforeCreate(event: { params: { data?: Record<string, unknown> } }) {
    if (event.params.data) {
      recalculateOrderData(event.params.data);
    }
  },

  async beforeUpdate(event: OrderLifecycleEvent) {
    if (event.params.data) {
      recalculateOrderData(event.params.data);
    }

    await rememberPreviousOrderStatus(event);
  },

  afterUpdate(event: OrderLifecycleEvent) {
    const nextStatus = event.params.data?.orderStatus;
    const previousStatus = event.state?.previousOrderStatus;
    const orderId = Number(event.result?.id);

    if (
      nextStatus !== 'delivering' ||
      previousStatus === undefined ||
      previousStatus === 'delivering' ||
      !Number.isInteger(orderId)
    ) {
      return;
    }

    void sendDeliveringInvoice(orderId).catch((error) => {
      strapi.log.error(`Failed to send delivering invoice for order ${orderId}`, error);
    });
  },
};
