import * as React from "react";
import { Page, useFetchClient, useNotification } from "@strapi/strapi/admin";
import {
  Box,
  Button,
  Flex,
  Loader,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  TextInput,
  Th,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import { File as FileIcon } from "@strapi/icons";
import { Link as RouterLink } from "react-router-dom";

type OrderStatus = "new" | "delivering" | "done" | "cancelled";

type OrderItem = {
  id?: number;
  product?: number | { id?: number; documentId?: string } | null;
  productName?: string | null;
  productSlug?: string | null;
  quantity?: number | string | null;
  packageWeight?: number | string | null;
  unitName?: string | null;
  unitPrice?: number | string | null;
  itemWeight?: number | string | null;
  actualWeight?: number | string | null;
  itemTotal?: number | string | null;
  freezeLabel?: string | null;
  productSnapshot?: unknown;
};

type OrderEntry = {
  id: number;
  documentId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  deliveryAddress?: string | null;
  deliveryRegion?: string | null;
  deliveryRegionCode?: "msk" | "spb" | null;
  deliveryDate?: string | null;
  deliveryTimeInterval?: string | null;
  deliveryCost?: number | string | null;
  comment?: string | null;
  items?: OrderItem[];
  totalItems: number;
  totalWeight: number | string;
  totalPrice: number | string;
  amountLeftForFreeDelivery: number | string;
  submittedAt: string;
};

type RawOrderEntry = Omit<OrderEntry, "orderStatus"> & {
  orderStatus?: string | null;
};

type OrdersResponse = {
  results?: RawOrderEntry[];
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Новый",
  delivering: "Отгружается",
  done: "Завершен",
  cancelled: "Отменён",
};

const STATUS_OPTIONS: OrderStatus[] = ["new", "delivering", "done", "cancelled"];

const LEGACY_ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  confirmed: "delivering",
  packed: "delivering",
};

const STATUS_ROW_BACKGROUNDS: Record<OrderStatus, string> = {
  new: "warning100",
  delivering: "alternative100",
  done: "success100",
  cancelled: "danger100",
};

const ORDERS_ENDPOINT =
  "/content-manager/collection-types/api::order.order?page=1&pageSize=100&sort=submittedAt:desc";
const ORDER_EDIT_PATH = "/content-manager/collection-types/api::order.order";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const priceFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const weightFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 3,
});

const toNumericValue = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().replace(",", ".");

    if (!normalizedValue) {
      return null;
    }

    const numericValue = Number(normalizedValue);

    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return null;
};

const roundDecimal = (value: number, fractionDigits = 2) =>
  Number(value.toFixed(fractionDigits));

const formatPrice = (value: number | string | null | undefined) => {
  const numericValue = toNumericValue(value);

  if (numericValue === null) {
    return String(value);
  }

  return priceFormatter.format(numericValue);
};

const formatWeight = (value: number | string | null | undefined) => {
  const numericValue = toNumericValue(value);

  if (numericValue === null) {
    return "0";
  }

  return weightFormatter.format(numericValue);
};

const formatInputValue = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  return typeof value === "number" ? String(value) : value;
};

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
};

const formatComment = (value: string | null | undefined) => {
  if (!value || !value.trim()) {
    return "—";
  }

  return value.trim();
};

const normalizeFilterValue = (value: string | null | undefined) =>
  value?.trim() ?? "";

const getUniqueFilterOptions = (
  orders: OrderEntry[],
  getValue: (order: OrderEntry) => string | null | undefined,
) =>
  Array.from(
    new Set(
      orders
        .map((order) => normalizeFilterValue(getValue(order)))
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, "ru"));

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const isWeightUnitName = (unitName: string | null | undefined) => {
  const trimmedUnitName = unitName?.trim();
  const normalizedUnitName = trimmedUnitName?.toLowerCase();

  return normalizedUnitName === "кг" || normalizedUnitName === "kg";
};

const isWeightItem = (item: OrderItem) => isWeightUnitName(item.unitName);

const getPrintableItemMeasure = (item: OrderItem) =>
  isWeightItem(item)
    ? toNumericValue(item.actualWeight ?? item.itemWeight) ??
      getOrderedWeight(item)
    : getOrderedWeight(item);

const getItemMeasureLabel = (item: OrderItem) =>
  isWeightItem(item) ? "Факт. вес" : "Факт. кол-во";

const buildInvoiceHtml = (order: OrderEntry) => {
  const items = order.items ?? [];
  const totalPrice = toNumericValue(order.totalPrice) ?? 0;
  const deliveryCost = toNumericValue(order.deliveryCost) ?? 0;
  const totalWithDelivery = roundDecimal(totalPrice + deliveryCost);
  const rows = items
    .map((item, index) => {
      const quantity = toNumericValue(item.quantity) ?? 0;
      const actualMeasure = getPrintableItemMeasure(item);
      const unitPrice = getItemUnitPrice(item);

      return `
        <tr>
          <td class="cell muted">${index + 1}</td>
          <td class="cell name">${escapeHtml(item.productName || `Позиция ${index + 1}`)}</td>
          <td class="cell numeric">${escapeHtml(quantity)}</td>
          <td class="cell numeric">${escapeHtml(getItemMeasureLabel(item))}: ${escapeHtml(formatWeight(actualMeasure))} ${escapeHtml(item.unitName ?? "")}</td>
          <td class="cell numeric">${escapeHtml(unitPrice === null ? "—" : formatPrice(unitPrice))}</td>
          <td class="cell numeric total">${escapeHtml(formatPrice(item.itemTotal ?? 0))}</td>
        </tr>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <title>Накладная ${escapeHtml(order.orderNumber)}</title>
    <style>
      @page {
        size: A4;
        margin: 14mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: #1f2933;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.35;
      }

      .page {
        width: 100%;
      }

      .header {
        align-items: flex-start;
        border-bottom: 2px solid #1f2933;
        display: flex;
        justify-content: space-between;
        gap: 24px;
        padding-bottom: 16px;
      }

      h1 {
        font-size: 26px;
        line-height: 1.1;
        margin: 0 0 8px;
      }

      .meta {
        color: #5c6670;
        font-size: 12px;
      }

      .order-number {
        font-size: 18px;
        font-weight: 700;
        text-align: right;
      }

      .section {
        margin-top: 18px;
      }

      .grid {
        display: grid;
        gap: 8px 24px;
        grid-template-columns: 1fr 1fr;
      }

      .label {
        color: #6b7280;
        font-size: 10px;
        letter-spacing: .04em;
        text-transform: uppercase;
      }

      .value {
        font-size: 13px;
        font-weight: 600;
        margin-top: 2px;
      }

      table {
        border-collapse: collapse;
        margin-top: 10px;
        width: 100%;
      }

      th {
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        color: #374151;
        font-size: 10px;
        padding: 8px 6px;
        text-align: left;
        text-transform: uppercase;
      }

      .cell {
        border: 1px solid #d1d5db;
        padding: 8px 6px;
        vertical-align: top;
      }

      .name {
        font-weight: 600;
        width: 30%;
      }

      .numeric {
        text-align: right;
        white-space: nowrap;
      }

      .muted {
        color: #6b7280;
      }

      .total {
        font-weight: 700;
      }

      .summary {
        display: flex;
        justify-content: flex-end;
        margin-top: 12px;
      }

      .summary-table {
        margin: 0;
        width: 280px;
      }

      .summary-table td {
        border: 1px solid #d1d5db;
        padding: 8px;
      }

      .summary-table td:last-child {
        font-weight: 700;
        text-align: right;
      }

      .comment {
        border: 1px solid #d1d5db;
        margin-top: 10px;
        min-height: 44px;
        padding: 10px;
        white-space: pre-wrap;
      }

      @media print {
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="header">
        <div>
          <h1>Накладная</h1>
          <div class="meta">Для комплектации и вложения в заказ</div>
        </div>
        <div>
          <div class="order-number">${escapeHtml(order.orderNumber)}</div>
          <div class="meta">${escapeHtml(formatDate(order.submittedAt))}</div>
        </div>
      </header>

      <section class="section grid">
        <div>
          <div class="label">Получатель</div>
          <div class="value">${escapeHtml(order.customerName)}</div>
        </div>
        <div>
          <div class="label">Телефон</div>
          <div class="value">${escapeHtml(order.customerPhone)}</div>
        </div>
        <div>
          <div class="label">Email</div>
          <div class="value">${escapeHtml(formatComment(order.customerEmail))}</div>
        </div>
        <div>
          <div class="label">Адрес доставки</div>
          <div class="value">${escapeHtml(formatComment(order.deliveryAddress))}</div>
        </div>
        <div>
          <div class="label">Регион доставки</div>
          <div class="value">${escapeHtml(formatComment(order.deliveryRegion))} (${escapeHtml(formatComment(order.deliveryRegionCode))})</div>
        </div>
        <div>
          <div class="label">Дата доставки</div>
          <div class="value">${escapeHtml(formatComment(order.deliveryDate))}</div>
        </div>
        <div>
          <div class="label">Интервал доставки</div>
          <div class="value">${escapeHtml(formatComment(order.deliveryTimeInterval))}</div>
        </div>
      </section>

      <section class="section">
        <div class="label">Состав заказа</div>
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Товар</th>
              <th>Кол-во</th>
              <th>Факт.</th>
              <th>Цена за 1 кг/шт</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody>
            ${
              rows ||
              `<tr><td class="cell" colspan="6">Позиции заказа не найдены.</td></tr>`
            }
          </tbody>
        </table>
      </section>

      <div class="summary">
        <table class="summary-table">
          <tbody>
            <tr>
              <td>Позиций</td>
              <td>${escapeHtml(order.totalItems)}</td>
            </tr>
            <tr>
              <td>Вес весовых позиций</td>
              <td>${escapeHtml(formatWeight(order.totalWeight))} кг</td>
            </tr>
            <tr>
              <td>Итого</td>
              <td>${escapeHtml(formatPrice(order.totalPrice))}</td>
            </tr>
            <tr>
              <td>Стоимость доставки</td>
              <td>${escapeHtml(formatPrice(order.deliveryCost ?? 0))}</td>
            </tr>
            <tr>
              <td>Итого с учетом доставки</td>
              <td>${escapeHtml(formatPrice(totalWithDelivery))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <section class="section">
        <div class="label">Комментарий</div>
        <div class="comment">${escapeHtml(formatComment(order.comment))}</div>
      </section>

    </main>
  </body>
</html>`;
};

const normalizeOrderStatus = (value: unknown): OrderStatus => {
  if (typeof value !== "string") {
    return "new";
  }

  if (value in LEGACY_ORDER_STATUS_MAP) {
    return LEGACY_ORDER_STATUS_MAP[value];
  }

  if (STATUS_OPTIONS.includes(value as OrderStatus)) {
    return value as OrderStatus;
  }

  return "new";
};

const normalizeOrder = (order: RawOrderEntry): OrderEntry => ({
  ...order,
  orderStatus: normalizeOrderStatus(order.orderStatus),
  items: order.items ?? [],
});

const getOrderedWeight = (item: OrderItem) => {
  const packageWeight = toNumericValue(item.packageWeight) ?? 0;
  const quantity = toNumericValue(item.quantity) ?? 0;

  return roundDecimal(packageWeight * quantity, 3);
};

const getPricedItemMeasure = (item: OrderItem) => {
  if (isWeightItem(item)) {
    return getPrintableItemMeasure(item);
  }

  return Math.max(Math.trunc(toNumericValue(item.quantity) ?? 0), 0);
};

const getItemUnitPrice = (item: OrderItem) => {
  const unitPrice = toNumericValue(item.unitPrice);

  if (unitPrice !== null && unitPrice > 0) {
    return unitPrice;
  }

  const itemTotal = toNumericValue(item.itemTotal);
  const pricedMeasure = getPricedItemMeasure(item);

  if (itemTotal !== null && pricedMeasure > 0) {
    return itemTotal / pricedMeasure;
  }

  return null;
};

const getActualWeightInputValue = (item: OrderItem) =>
  formatInputValue(
    item.actualWeight ?? item.itemWeight ?? getOrderedWeight(item),
  );

const getDeliveryCostInputValue = (order: OrderEntry) =>
  formatInputValue(order.deliveryCost ?? 0);

const recalculateOrder = (
  order: OrderEntry,
  items: OrderItem[],
): OrderEntry => {
  const totalItems = items.reduce(
    (sum, item) =>
      sum + Math.max(Math.trunc(toNumericValue(item.quantity) ?? 0), 0),
    0,
  );
  const totalWeight = roundDecimal(
    items.reduce(
      (sum, item) =>
        isWeightItem(item)
          ? sum + (toNumericValue(item.itemWeight) ?? getOrderedWeight(item))
          : sum,
      0,
    ),
    3,
  );
  const totalPrice = roundDecimal(
    items.reduce((sum, item) => sum + (toNumericValue(item.itemTotal) ?? 0), 0),
  );
  const currentAmountLeft =
    toNumericValue(order.amountLeftForFreeDelivery) ?? 0;
  const currentTotalPrice = toNumericValue(order.totalPrice) ?? 0;
  const inferredFreeDeliveryThreshold =
    currentAmountLeft > 0 ? currentTotalPrice + currentAmountLeft : 0;

  return {
    ...order,
    items,
    totalItems,
    totalWeight,
    totalPrice,
    amountLeftForFreeDelivery:
      inferredFreeDeliveryThreshold > 0
        ? roundDecimal(Math.max(inferredFreeDeliveryThreshold - totalPrice, 0))
        : currentAmountLeft,
  };
};

const buildOrderItemsPayload = (items: OrderItem[]) =>
  items.map((item) => {
    const payload: Record<string, unknown> = {};
    const numericFields = [
      "unitPrice",
      "packageWeight",
      "quantity",
      "itemWeight",
      "actualWeight",
      "itemTotal",
    ] as const;
    const stringFields = [
      "productName",
      "productSlug",
      "unitName",
      "freezeLabel",
    ] as const;

    if (item.id !== undefined) {
      payload.id = item.id;
    }

    stringFields.forEach((fieldName) => {
      if (item[fieldName] !== undefined) {
        payload[fieldName] = item[fieldName] ?? null;
      }
    });

    numericFields.forEach((fieldName) => {
      if (item[fieldName] !== undefined) {
        const numericValue = toNumericValue(item[fieldName]);
        payload[fieldName] = numericValue === null ? null : numericValue;
      }
    });

    if (item.productSnapshot !== undefined) {
      payload.productSnapshot = item.productSnapshot;
    }

    return payload;
  });

const OrdersPage = () => {
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [orders, setOrders] = React.useState<OrderEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | OrderStatus>(
    "all",
  );
  const [deliveryRegionFilter, setDeliveryRegionFilter] =
    React.useState("all");
  const [deliveryDateFilter, setDeliveryDateFilter] = React.useState("all");
  const [deliveryTimeIntervalFilter, setDeliveryTimeIntervalFilter] =
    React.useState("all");
  const [savingDocumentId, setSavingDocumentId] = React.useState<string | null>(
    null,
  );
  const [savingWeightKey, setSavingWeightKey] = React.useState<string | null>(
    null,
  );
  const [savingDeliveryCostDocumentId, setSavingDeliveryCostDocumentId] =
    React.useState<string | null>(null);
  const [expandedDocumentIds, setExpandedDocumentIds] = React.useState<
    string[]
  >([]);

  const loadOrders = React.useCallback(async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      const response = await get<OrdersResponse>(ORDERS_ENDPOINT);
      const nextOrders = Array.isArray(response.data?.results)
        ? response.data.results.map(normalizeOrder)
        : [];

      setOrders(nextOrders);
    } catch {
      setHasError(true);
      toggleNotification({
        type: "danger",
        message: "Не удалось загрузить список заказов.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [get, toggleNotification]);

  React.useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleStatusChange = React.useCallback(
    async (documentId: string, nextStatusValue: string | number) => {
      const nextStatus = normalizeOrderStatus(nextStatusValue);
      const currentOrder = orders.find(
        (order) => order.documentId === documentId,
      );

      if (!currentOrder || currentOrder.orderStatus === nextStatus) {
        return;
      }

      const previousStatus = currentOrder.orderStatus;

      setSavingDocumentId(documentId);
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.documentId === documentId
            ? { ...order, orderStatus: nextStatus }
            : order,
        ),
      );

      try {
        await put(
          `/content-manager/collection-types/api::order.order/${documentId}`,
          {
            orderStatus: nextStatus,
          },
        );

        toggleNotification({
          type: "success",
          message: `Статус заказа ${currentOrder.orderNumber} обновлен.`,
        });
      } catch {
        setOrders((currentOrders) =>
          currentOrders.map((order) =>
            order.documentId === documentId
              ? { ...order, orderStatus: previousStatus }
              : order,
          ),
        );

        toggleNotification({
          type: "danger",
          message: "Не удалось сохранить новый статус заказа.",
        });
      } finally {
        setSavingDocumentId((currentDocumentId) =>
          currentDocumentId === documentId ? null : currentDocumentId,
        );
      }
    },
    [orders, put, toggleNotification],
  );

  const handleActualWeightInputChange = React.useCallback(
    (documentId: string, itemIndex: number, value: string) => {
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.documentId === documentId
            ? {
                ...order,
                items: (order.items ?? []).map((item, index) =>
                  index === itemIndex ? { ...item, actualWeight: value } : item,
                ),
              }
            : order,
        ),
      );
    },
    [],
  );

  const handleActualWeightSave = React.useCallback(
    async (documentId: string, itemIndex: number) => {
      const currentOrder = orders.find(
        (order) => order.documentId === documentId,
      );
      const currentItem = currentOrder?.items?.[itemIndex];

      if (!currentOrder || !currentItem || !currentOrder.items) {
        return;
      }

      if (!isWeightItem(currentItem)) {
        return;
      }

      const weightKey = `${documentId}-${currentItem.id ?? itemIndex}`;

      if (savingWeightKey === weightKey) {
        return;
      }

      const actualWeight = toNumericValue(
        currentItem.actualWeight ?? currentItem.itemWeight,
      );

      if (actualWeight === null || actualWeight <= 0) {
        toggleNotification({
          type: "danger",
          message: "Введите фактический вес больше 0.",
        });
        return;
      }

      const unitPrice = getItemUnitPrice(currentItem);

      if (unitPrice === null || unitPrice <= 0) {
        toggleNotification({
          type: "danger",
          message: "Не удалось рассчитать цену позиции.",
        });
        return;
      }

      const nextItems = currentOrder.items.map((item, index) =>
        index === itemIndex
          ? {
              ...item,
              unitPrice: roundDecimal(unitPrice),
              actualWeight: roundDecimal(actualWeight, 3),
              itemWeight: roundDecimal(actualWeight, 3),
              itemTotal: roundDecimal(unitPrice * actualWeight),
            }
          : item,
      );
      const nextOrder = recalculateOrder(currentOrder, nextItems);

      setSavingWeightKey(weightKey);
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.documentId === documentId ? nextOrder : order,
        ),
      );

      try {
        await put(
          `/content-manager/collection-types/api::order.order/${documentId}`,
          {
            items: buildOrderItemsPayload(nextItems),
            totalItems: nextOrder.totalItems,
            totalWeight: nextOrder.totalWeight,
            totalPrice: nextOrder.totalPrice,
            amountLeftForFreeDelivery: nextOrder.amountLeftForFreeDelivery,
          },
        );

        toggleNotification({
          type: "success",
          message: `Вес и сумма заказа ${currentOrder.orderNumber} обновлены.`,
        });
      } catch {
        setOrders((currentOrders) =>
          currentOrders.map((order) =>
            order.documentId === documentId ? currentOrder : order,
          ),
        );

        toggleNotification({
          type: "danger",
          message: "Не удалось сохранить фактический вес.",
        });
      } finally {
        setSavingWeightKey((currentKey) =>
          currentKey === weightKey ? null : currentKey,
        );
      }
    },
    [orders, put, savingWeightKey, toggleNotification],
  );

  const handleDeliveryCostInputChange = React.useCallback(
    (documentId: string, value: string) => {
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.documentId === documentId
            ? { ...order, deliveryCost: value }
            : order,
        ),
      );
    },
    [],
  );

  const handleDeliveryCostSave = React.useCallback(
    async (documentId: string) => {
      const currentOrder = orders.find(
        (order) => order.documentId === documentId,
      );

      if (!currentOrder || savingDeliveryCostDocumentId === documentId) {
        return;
      }

      const deliveryCost = toNumericValue(currentOrder.deliveryCost ?? 0) ?? 0;

      if (deliveryCost < 0) {
        toggleNotification({
          type: "danger",
          message: "Стоимость доставки не может быть меньше 0.",
        });
        return;
      }

      const nextOrder = {
        ...currentOrder,
        deliveryCost: roundDecimal(deliveryCost),
      };

      setSavingDeliveryCostDocumentId(documentId);
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.documentId === documentId ? nextOrder : order,
        ),
      );

      try {
        await put(
          `/content-manager/collection-types/api::order.order/${documentId}`,
          {
            deliveryCost: nextOrder.deliveryCost,
          },
        );

        toggleNotification({
          type: "success",
          message: `Стоимость доставки заказа ${currentOrder.orderNumber} обновлена.`,
        });
      } catch {
        setOrders((currentOrders) =>
          currentOrders.map((order) =>
            order.documentId === documentId ? currentOrder : order,
          ),
        );

        toggleNotification({
          type: "danger",
          message: "Не удалось сохранить стоимость доставки.",
        });
      } finally {
        setSavingDeliveryCostDocumentId((currentDocumentId) =>
          currentDocumentId === documentId ? null : currentDocumentId,
        );
      }
    },
    [orders, put, savingDeliveryCostDocumentId, toggleNotification],
  );

  const toggleExpandedOrder = React.useCallback((documentId: string) => {
    setExpandedDocumentIds((currentIds) =>
      currentIds.includes(documentId)
        ? currentIds.filter((id) => id !== documentId)
        : [...currentIds, documentId],
    );
  }, []);

  const handlePrintInvoice = React.useCallback(
    (order: OrderEntry) => {
      const printWindow = window.open("", "_blank", "width=900,height=1200");

      if (!printWindow) {
        toggleNotification({
          type: "warning",
          message:
            "Браузер заблокировал окно печати. Разрешите всплывающие окна для админки.",
        });
        return;
      }

      printWindow.document.open();
      printWindow.document.write(buildInvoiceHtml(order));
      printWindow.document.close();
      printWindow.focus();

      window.setTimeout(() => {
        printWindow.print();
      }, 250);
    },
    [toggleNotification],
  );

  const deliveryRegionOptions = React.useMemo(
    () => getUniqueFilterOptions(orders, (order) => order.deliveryRegion),
    [orders],
  );
  const deliveryDateOptions = React.useMemo(
    () => getUniqueFilterOptions(orders, (order) => order.deliveryDate),
    [orders],
  );
  const deliveryTimeIntervalOptions = React.useMemo(
    () =>
      getUniqueFilterOptions(orders, (order) => order.deliveryTimeInterval),
    [orders],
  );

  const filteredOrders = React.useMemo(() => {
    const normalizedSearchValue = searchValue.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" ? true : order.orderStatus === statusFilter;
      const matchesDeliveryRegion =
        deliveryRegionFilter === "all"
          ? true
          : normalizeFilterValue(order.deliveryRegion) ===
            deliveryRegionFilter;
      const matchesDeliveryDate =
        deliveryDateFilter === "all"
          ? true
          : normalizeFilterValue(order.deliveryDate) === deliveryDateFilter;
      const matchesDeliveryTimeInterval =
        deliveryTimeIntervalFilter === "all"
          ? true
          : normalizeFilterValue(order.deliveryTimeInterval) ===
            deliveryTimeIntervalFilter;

      if (
        !matchesStatus ||
        !matchesDeliveryRegion ||
        !matchesDeliveryDate ||
        !matchesDeliveryTimeInterval
      ) {
        return false;
      }

      if (!normalizedSearchValue) {
        return true;
      }

      const searchableParts = [
        order.orderNumber,
        order.customerName,
        order.customerPhone,
        order.deliveryRegion ?? "",
        order.deliveryRegionCode ?? "",
        order.deliveryDate ?? "",
        order.deliveryTimeInterval ?? "",
        order.deliveryAddress ?? "",
        order.comment ?? "",
      ];

      return searchableParts.some((part) =>
        String(part).toLowerCase().includes(normalizedSearchValue),
      );
    });
  }, [
    deliveryDateFilter,
    deliveryRegionFilter,
    deliveryTimeIntervalFilter,
    orders,
    searchValue,
    statusFilter,
  ]);

  if (isLoading) {
    return (
      <>
        <Page.Title>Заказы</Page.Title>
        <Page.Main>
          <Flex justifyContent="center" paddingTop={10}>
            <Loader>Загружаю заказы...</Loader>
          </Flex>
        </Page.Main>
      </>
    );
  }

  if (hasError) {
    return (
      <>
        <Page.Title>Заказы</Page.Title>
        <Page.Error />
      </>
    );
  }

  return (
    <>
      <Page.Title>Заказы</Page.Title>
      <Page.Main>
        <Flex
          direction="column"
          alignItems="stretch"
          gap={6}
          paddingLeft={8}
          paddingRight={8}
          paddingTop={8}
          paddingBottom={8}
        >
          <Flex
            justifyContent="space-between"
            alignItems="flex-start"
            gap={4}
            wrap="wrap"
          >
            <Box>
              <Typography variant="alpha">Заказы</Typography>
              <Typography textColor="neutral600">
                Всего: {filteredOrders.length} из {orders.length}
              </Typography>
            </Box>

            <Flex gap={4} wrap="wrap" alignItems="flex-end">
              <Box minWidth="320px">
                <Typography variant="pi" textColor="neutral600">
                  Поиск
                </Typography>
                <TextInput
                  aria-label="Поиск по заказам"
                  name="search"
                  placeholder="Номер, имя, телефон, комментарий"
                  value={searchValue}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchValue(event.target.value)
                  }
                />
              </Box>

              <Box minWidth="220px">
                <Typography variant="pi" textColor="neutral600">
                  Статус
                </Typography>
                <SingleSelect
                  aria-label="Фильтр по статусу"
                  placeholder="Все статусы"
                  value={statusFilter}
                  onChange={(value) =>
                    setStatusFilter(String(value) as "all" | OrderStatus)
                  }
                >
                  <SingleSelectOption value="all">
                    Все статусы
                  </SingleSelectOption>
                  {STATUS_OPTIONS.map((status) => (
                    <SingleSelectOption key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              </Box>

              <Box minWidth="220px">
                <Typography variant="pi" textColor="neutral600">
                  Город
                </Typography>
                <SingleSelect
                  aria-label="Фильтр по городу доставки"
                  placeholder="Все города"
                  value={deliveryRegionFilter}
                  onChange={(value) => setDeliveryRegionFilter(String(value))}
                >
                  <SingleSelectOption value="all">
                    Все города
                  </SingleSelectOption>
                  {deliveryRegionOptions.map((deliveryRegion) => (
                    <SingleSelectOption
                      key={deliveryRegion}
                      value={deliveryRegion}
                    >
                      {deliveryRegion}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              </Box>

              <Box minWidth="220px">
                <Typography variant="pi" textColor="neutral600">
                  Дата доставки
                </Typography>
                <SingleSelect
                  aria-label="Фильтр по дате доставки"
                  placeholder="Все даты"
                  value={deliveryDateFilter}
                  onChange={(value) => setDeliveryDateFilter(String(value))}
                >
                  <SingleSelectOption value="all">Все даты</SingleSelectOption>
                  {deliveryDateOptions.map((deliveryDate) => (
                    <SingleSelectOption key={deliveryDate} value={deliveryDate}>
                      {deliveryDate}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              </Box>

              <Box minWidth="220px">
                <Typography variant="pi" textColor="neutral600">
                  Интервал
                </Typography>
                <SingleSelect
                  aria-label="Фильтр по интервалу доставки"
                  placeholder="Все интервалы"
                  value={deliveryTimeIntervalFilter}
                  onChange={(value) =>
                    setDeliveryTimeIntervalFilter(String(value))
                  }
                >
                  <SingleSelectOption value="all">
                    Все интервалы
                  </SingleSelectOption>
                  {deliveryTimeIntervalOptions.map((deliveryTimeInterval) => (
                    <SingleSelectOption
                      key={deliveryTimeInterval}
                      value={deliveryTimeInterval}
                    >
                      {deliveryTimeInterval}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              </Box>
            </Flex>
          </Flex>

          {filteredOrders.length === 0 ? (
            <Page.NoData />
          ) : (
            <Box background="neutral0" hasRadius shadow="tableShadow">
              <Table
                colCount={9}
                rowCount={
                  filteredOrders.length +
                  expandedDocumentIds.filter((id) =>
                    filteredOrders.some((order) => order.documentId === id),
                  ).length
                }
              >
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma" textColor="neutral600">
                        Номер
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma" textColor="neutral600">
                        Клиент
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma" textColor="neutral600">
                        Телефон
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma" textColor="neutral600">
                        Доставка
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma" textColor="neutral600">
                        Комментарий
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma" textColor="neutral600">
                        Статус
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma" textColor="neutral600">
                        Сумма
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma" textColor="neutral600">
                        Создан
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma" textColor="neutral600">
                        Печать
                      </Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredOrders.map((order) => {
                    const isSaving = savingDocumentId === order.documentId;
                    const rowBackground =
                      STATUS_ROW_BACKGROUNDS[order.orderStatus];
                    const isExpanded = expandedDocumentIds.includes(
                      order.documentId,
                    );
                    const isDeliveryCostSaving =
                      savingDeliveryCostDocumentId === order.documentId;

                    return (
                      <React.Fragment key={order.documentId ?? order.id}>
                        <Tr background={rowBackground}>
                          <Td>
                            <Flex
                              direction="column"
                              alignItems="flex-start"
                              gap={1}
                            >
                              <RouterLink
                                style={{
                                  color: "#4945ff",
                                  fontWeight: 600,
                                  textDecoration: "none",
                                }}
                                to={`${ORDER_EDIT_PATH}/${order.documentId}`}
                              >
                                {order.orderNumber}
                              </RouterLink>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleExpandedOrder(order.documentId)
                                }
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  padding: 0,
                                  cursor: "pointer",
                                  color: "#4945ff",
                                  fontSize: "12px",
                                }}
                              >
                                {isExpanded
                                  ? "Скрыть состав"
                                  : "Показать состав"}
                              </button>
                            </Flex>
                          </Td>
                          <Td>
                            <Flex
                              direction="column"
                              alignItems="flex-start"
                              gap={1}
                            >
                              <Typography textColor="neutral800">
                                {order.customerName}
                              </Typography>
                              <Typography variant="pi" textColor="neutral600">
                                {order.totalItems} поз.
                              </Typography>
                            </Flex>
                          </Td>
                          <Td>
                            <Typography textColor="neutral800">
                              {order.customerPhone}
                            </Typography>
                          </Td>
                          <Td>
                            <Flex
                              direction="column"
                              alignItems="flex-start"
                              gap={1}
                            >
                              <Typography textColor="neutral800">
                                {formatComment(order.deliveryRegion)}
                              </Typography>
                              <Typography variant="pi" textColor="neutral600">
                                {formatComment(order.deliveryDate)}
                              </Typography>
                              <Typography variant="pi" textColor="neutral600">
                                {formatComment(order.deliveryTimeInterval)}
                              </Typography>
                            </Flex>
                          </Td>
                          <Td>
                            <Typography textColor="neutral700">
                              {formatComment(order.comment)}
                            </Typography>
                          </Td>
                          <Td>
                            <SingleSelect
                              aria-label={`Изменить статус заказа ${order.orderNumber}`}
                              placeholder="Выберите статус"
                              value={order.orderStatus}
                              disabled={isSaving}
                              loading={isSaving}
                              size="S"
                              onChange={(value) =>
                                void handleStatusChange(order.documentId, value)
                              }
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <SingleSelectOption key={status} value={status}>
                                  {STATUS_LABELS[status]}
                                </SingleSelectOption>
                              ))}
                            </SingleSelect>
                          </Td>
                          <Td>
                            <Typography
                              fontWeight="bold"
                              textColor="neutral800"
                            >
                              {formatPrice(order.totalPrice)}
                            </Typography>
                          </Td>
                          <Td>
                            <Typography textColor="neutral600">
                              {formatDate(order.submittedAt)}
                            </Typography>
                          </Td>
                          <Td>
                            <Button
                              type="button"
                              size="S"
                              variant="secondary"
                              startIcon={<FileIcon />}
                              onClick={() => handlePrintInvoice(order)}
                            >
                              Накладная
                            </Button>
                          </Td>
                        </Tr>
                        {isExpanded ? (
                          <Tr background="neutral0">
                            <Td colSpan={9}>
                              <Box paddingTop={3} paddingBottom={3}>
                                <Typography
                                  variant="omega"
                                  fontWeight="bold"
                                  textColor="neutral800"
                                >
                                  Состав заказа
                                </Typography>
                                <Flex
                                  justifyContent="flex-end"
                                  alignItems="flex-start"
                                  paddingTop={3}
                                >
                                  <Box width="220px">
                                    <Typography
                                      variant="pi"
                                      textColor="neutral600"
                                    >
                                      Стоимость доставки, ₽
                                    </Typography>
                                    <TextInput
                                      aria-label={`Стоимость доставки заказа ${order.orderNumber}`}
                                      name={`deliveryCost-${order.documentId}`}
                                      inputMode="decimal"
                                      value={getDeliveryCostInputValue(order)}
                                      disabled={isDeliveryCostSaving}
                                      onChange={(
                                        event: React.ChangeEvent<HTMLInputElement>,
                                      ) =>
                                        handleDeliveryCostInputChange(
                                          order.documentId,
                                          event.target.value,
                                        )
                                      }
                                      onBlur={() =>
                                        void handleDeliveryCostSave(
                                          order.documentId,
                                        )
                                      }
                                      onKeyDown={(
                                        event: React.KeyboardEvent<HTMLInputElement>,
                                      ) => {
                                        if (event.key === "Enter") {
                                          event.currentTarget.blur();
                                        }
                                      }}
                                    />
                                  </Box>
                                </Flex>
                                <Flex
                                  direction="column"
                                  alignItems="stretch"
                                  gap={2}
                                  paddingTop={3}
                                >
                                  {order.items && order.items.length > 0 ? (
                                    order.items.map((item, index) => {
                                      const orderedWeight =
                                        getOrderedWeight(item);
                                      const unitPrice = getItemUnitPrice(item);
                                      const weightKey = `${order.documentId}-${
                                        item.id ?? index
                                      }`;
                                      const isWeightSaving =
                                        savingWeightKey === weightKey;
                                      const isCurrentWeightItem =
                                        isWeightItem(item);
                                      const printableMeasure =
                                        getPrintableItemMeasure(item);

                                      return (
                                        <Box
                                          key={
                                            item.id ??
                                            `${order.documentId}-${index}`
                                          }
                                          background="neutral100"
                                          hasRadius
                                          padding={3}
                                        >
                                          <Flex
                                            justifyContent="space-between"
                                            alignItems="flex-start"
                                            gap={4}
                                            wrap="wrap"
                                          >
                                            <Box minWidth="280px">
                                              <Flex
                                                direction="column"
                                                alignItems="flex-start"
                                                gap={1}
                                              >
                                                <Typography
                                                  fontWeight="bold"
                                                  textColor="neutral800"
                                                >
                                                  {item.productName ||
                                                    `Позиция ${index + 1}`}
                                                </Typography>
                                                <Typography
                                                  variant="pi"
                                                  textColor="neutral600"
                                                >
                                                  {item.quantity ?? 0} шт. •{" "}
                                                  {formatWeight(
                                                    item.packageWeight,
                                                  )}{" "}
                                                  {item.unitName ?? ""} • всего{" "}
                                                  {formatWeight(orderedWeight)}{" "}
                                                  {item.unitName ?? ""}
                                                </Typography>
                                                <Typography
                                                  variant="pi"
                                                  textColor="neutral600"
                                                >
                                                  {formatPrice(unitPrice ?? 0)}{" "}
                                                  {isCurrentWeightItem
                                                    ? "за 1 кг"
                                                    : "за единицу"}
                                                </Typography>
                                              </Flex>
                                            </Box>

                                            <Flex
                                              gap={3}
                                              alignItems="flex-start"
                                              wrap="wrap"
                                            >
                                              {isCurrentWeightItem ? (
                                                <Box width="160px">
                                                  <Typography
                                                    variant="pi"
                                                    textColor="neutral600"
                                                  >
                                                    Фактический вес, кг
                                                  </Typography>
                                                  <TextInput
                                                    aria-label={`Фактический вес позиции ${item.productName || index + 1}`}
                                                    name={`actualWeight-${weightKey}`}
                                                    inputMode="decimal"
                                                    value={getActualWeightInputValue(
                                                      item,
                                                    )}
                                                    disabled={isWeightSaving}
                                                    onChange={(
                                                      event: React.ChangeEvent<HTMLInputElement>,
                                                    ) =>
                                                      handleActualWeightInputChange(
                                                        order.documentId,
                                                        index,
                                                        event.target.value,
                                                      )
                                                    }
                                                    onBlur={() =>
                                                      void handleActualWeightSave(
                                                        order.documentId,
                                                        index,
                                                      )
                                                    }
                                                    onKeyDown={(
                                                      event: React.KeyboardEvent<HTMLInputElement>,
                                                    ) => {
                                                      if (event.key === "Enter") {
                                                        event.currentTarget.blur();
                                                      }
                                                    }}
                                                  />
                                                </Box>
                                              ) : (
                                                <Box minWidth="160px">
                                                  <Typography
                                                    variant="pi"
                                                    textColor="neutral600"
                                                  >
                                                    Факт. кол-во
                                                  </Typography>
                                                  <Typography
                                                    fontWeight="bold"
                                                    textColor="neutral800"
                                                  >
                                                    {formatWeight(
                                                      printableMeasure,
                                                    )}{" "}
                                                    {item.unitName ?? ""}
                                                  </Typography>
                                                </Box>
                                              )}

                                              <Box
                                                minWidth="120px"
                                                paddingTop={6}
                                              >
                                                <Typography
                                                  fontWeight="bold"
                                                  textColor="neutral800"
                                                >
                                                  {formatPrice(
                                                    item.itemTotal ?? 0,
                                                  )}
                                                </Typography>
                                              </Box>
                                            </Flex>
                                          </Flex>
                                        </Box>
                                      );
                                    })
                                  ) : (
                                    <Typography textColor="neutral600">
                                      Позиции заказа не найдены.
                                    </Typography>
                                  )}
                                </Flex>
                              </Box>
                            </Td>
                          </Tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
          )}
        </Flex>
      </Page.Main>
    </>
  );
};

export default OrdersPage;
