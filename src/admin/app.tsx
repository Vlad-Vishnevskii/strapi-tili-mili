import type { StrapiApp } from "@strapi/strapi/admin";
import { ListPlus } from "@strapi/icons";

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
  },
};
