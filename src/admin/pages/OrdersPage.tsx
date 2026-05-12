import * as React from "react";
import { Page, useFetchClient, useNotification } from "@strapi/strapi/admin";
import {
  Box,
  Flex,
  Link,
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
import { Link as RouterLink } from "react-router-dom";

type OrderStatus = "new" | "delivering" | "done";

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
};

const STATUS_OPTIONS: OrderStatus[] = ["new", "delivering", "done"];

const LEGACY_ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  confirmed: "delivering",
  packed: "delivering",
  cancelled: "done",
};

const STATUS_SELECT_STYLES: Record<
  OrderStatus,
  { background: string; borderColor: string }
> = {
  new: {
    background: "warning100",
    borderColor: "warning300",
  },
  delivering: {
    background: "alternative100",
    borderColor: "alternative200",
  },
  done: {
    background: "success100",
    borderColor: "success200",
  },
};

const STATUS_ROW_BACKGROUNDS: Record<OrderStatus, string> = {
  new: "warning100",
  delivering: "alternative100",
  done: "success100",
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

const getItemUnitPrice = (item: OrderItem) => {
  const unitPrice = toNumericValue(item.unitPrice);

  if (unitPrice !== null && unitPrice > 0) {
    return unitPrice;
  }

  const itemTotal = toNumericValue(item.itemTotal);
  const orderedWeight = getOrderedWeight(item);

  if (itemTotal !== null && orderedWeight > 0) {
    return itemTotal / orderedWeight;
  }

  return null;
};

const getActualWeightInputValue = (item: OrderItem) =>
  formatInputValue(
    item.actualWeight ?? item.itemWeight ?? getOrderedWeight(item),
  );

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
        sum + (toNumericValue(item.itemWeight) ?? getOrderedWeight(item)),
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
  const [savingDocumentId, setSavingDocumentId] = React.useState<string | null>(
    null,
  );
  const [savingWeightKey, setSavingWeightKey] = React.useState<string | null>(
    null,
  );
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

  const toggleExpandedOrder = React.useCallback((documentId: string) => {
    setExpandedDocumentIds((currentIds) =>
      currentIds.includes(documentId)
        ? currentIds.filter((id) => id !== documentId)
        : [...currentIds, documentId],
    );
  }, []);

  const filteredOrders = React.useMemo(() => {
    const normalizedSearchValue = searchValue.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" ? true : order.orderStatus === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearchValue) {
        return true;
      }

      const searchableParts = [
        order.orderNumber,
        order.customerName,
        order.customerPhone,
        order.comment ?? "",
      ];

      return searchableParts.some((part) =>
        String(part).toLowerCase().includes(normalizedSearchValue),
      );
    });
  }, [orders, searchValue, statusFilter]);

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
                <TextInput
                  aria-label="Поиск по заказам"
                  label="Поиск"
                  name="search"
                  placeholder="Номер, имя, телефон, комментарий"
                  value={searchValue}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchValue(event.target.value)
                  }
                />
              </Box>

              <Box minWidth="220px">
                <SingleSelect
                  aria-label="Фильтр по статусу"
                  label="Статус"
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
            </Flex>
          </Flex>

          {filteredOrders.length === 0 ? (
            <Page.NoData />
          ) : (
            <Box background="neutral0" hasRadius shadow="tableShadow">
              <Table
                colCount={7}
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
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredOrders.map((order) => {
                    const isSaving = savingDocumentId === order.documentId;
                    const selectStyles =
                      STATUS_SELECT_STYLES[order.orderStatus];
                    const rowBackground =
                      STATUS_ROW_BACKGROUNDS[order.orderStatus];
                    const isExpanded = expandedDocumentIds.includes(
                      order.documentId,
                    );

                    return (
                      <React.Fragment key={order.documentId ?? order.id}>
                        <Tr background={rowBackground}>
                          <Td>
                            <Flex
                              direction="column"
                              alignItems="flex-start"
                              gap={1}
                            >
                              <Link
                                as={RouterLink}
                                to={`${ORDER_EDIT_PATH}/${order.documentId}`}
                              >
                                {order.orderNumber}
                              </Link>
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
                              minWidth="220px"
                              background={selectStyles.background}
                              borderColor={selectStyles.borderColor}
                              borderStyle="solid"
                              borderWidth="1px"
                              hasRadius
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
                        </Tr>
                        {isExpanded ? (
                          <Tr background="neutral0">
                            <Td colSpan={7}>
                              <Box paddingTop={3} paddingBottom={3}>
                                <Typography
                                  variant="omega"
                                  fontWeight="bold"
                                  textColor="neutral800"
                                >
                                  Состав заказа
                                </Typography>
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
                                            <Box>
                                              <Typography textColor="neutral800">
                                                {item.productName ||
                                                  `Позиция ${index + 1}`}
                                              </Typography>
                                              <Typography
                                                variant="pi"
                                                textColor="neutral600"
                                              >
                                                • {item.quantity ?? 0} шт. •{" "}
                                                {item.packageWeight ?? 0}{" "}
                                                {item.unitName ?? ""} • всего{" "}
                                                {formatWeight(orderedWeight)}{" "}
                                                {item.unitName ?? ""}
                                              </Typography>
                                              <Typography
                                                variant="pi"
                                                textColor="neutral600"
                                              >
                                                {formatPrice(unitPrice ?? 0)} за{" "}
                                                1 {item.unitName ?? "ед."}
                                              </Typography>
                                            </Box>

                                            <Flex
                                              gap={3}
                                              alignItems="flex-start"
                                              wrap="wrap"
                                            >
                                              <Box width="160px">
                                                <TextInput
                                                  aria-label={`Фактический вес позиции ${item.productName || index + 1}`}
                                                  label="Факт. вес"
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
