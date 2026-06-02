const FREE_DELIVERY_THRESHOLD = toFiniteNumber(process.env.ORDER_FREE_DELIVERY_THRESHOLD, 0);

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
    const itemTotal = roundDecimal(unitPrice * nextItemWeight);

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

export default {
  beforeCreate(event: { params: { data?: Record<string, unknown> } }) {
    if (event.params.data) {
      recalculateOrderData(event.params.data);
    }
  },

  beforeUpdate(event: { params: { data?: Record<string, unknown> } }) {
    if (event.params.data) {
      recalculateOrderData(event.params.data);
    }
  },
};
