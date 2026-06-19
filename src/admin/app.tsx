import type { StrapiApp } from "@strapi/strapi/admin";
import { ListPlus, PresentationChart } from "@strapi/icons";

export default {
  config: {
    locales: ["ru"],
  },
  bootstrap(app: StrapiApp) {
    app.addMenuLink({
      to: "/orders-board",
      icon: ListPlus,
      intlLabel: {
        id: "orders-board.label",
        defaultMessage: "Заказы",
      },
      permissions: [],
      Component: async () => import("./pages/OrdersPage"),
    });

    app.addMenuLink({
      to: "/orders-report",
      icon: PresentationChart,
      intlLabel: {
        id: "orders-report.label",
        defaultMessage: "Отчёт по заказам",
      },
      permissions: [],
      Component: async () => import("./pages/OrdersReportPage"),
    });
  },
};
