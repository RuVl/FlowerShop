import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
    index("./routes/home.tsx"),                     // главная
    route("payment-success", "./routes/payment-success.tsx"),  // обычный маршрут
] satisfies RouteConfig;
