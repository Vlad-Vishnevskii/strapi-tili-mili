export default {
  routes: [
    {
      method: 'POST',
      path: '/order-requests',
      handler: 'order-request.create',
      config: {
        auth: false,
      },
    },
  ],
};
