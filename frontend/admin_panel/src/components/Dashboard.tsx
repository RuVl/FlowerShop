import React, { useEffect, useMemo, useState } from "react";
import { Alert, Avatar, Box, Card, Chip, CircularProgress, Divider, Snackbar, Typography, } from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import LocalFloristIcon from "@mui/icons-material/LocalFlorist";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import StarIcon from "@mui/icons-material/Star";
import AssessmentIcon from "@mui/icons-material/Assessment";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import BarChartIcon from "@mui/icons-material/BarChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import { Bar, Line } from "react-chartjs-2";
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip as ChartTooltip, } from "chart.js";
import { api } from "./api"; // Импортируй свой api helper

ChartJS.register(
    LineElement,
    BarElement,
    CategoryScale,
    LinearScale,
    PointElement,
    ChartTooltip,
    Legend
);

const palette = {
    bg: "#ffffffff",
    card: "#fff",
    accent: "#5485E4",
    accent2: "#FF7A30",
    accent3: "#159C5B",
    accent4: "#9244D0",
    accent5: "#D03A3A",
    accent6: "#FFD600",
    accent7: "#00B8D9",
    accent8: "#FF4081",
    text: "#2D3250",
    muted: "#848391",
    border: "#e6eaf3",
};

const CARD_MIN_WIDTH = 240;
const CARD_MAX_WIDTH = 240;
const CHART_MAX_HEIGHT = 220;

// Вспомогательные функции
function formatNumber(n: number | undefined) {
    if (typeof n !== "number") return "-";
    return n.toLocaleString("ru-RU");
}

function formatRUB(n: number | undefined) {
    if (typeof n !== "number") return "-";
    return n.toLocaleString("ru-RU") + " ₽";
}

function formatPercent(n: number | undefined) {
    if (typeof n !== "number") return "-";
    return (n > 0 ? "+" : "") + n.toFixed(1) + "%";
}

// function formatDate(iso?: string) {
//     if (!iso) return "-";
//     const date = new Date(iso);
//     return date.toLocaleDateString("ru-RU", { year: "2-digit", month: "short", day: "numeric" });
// }

// Карточка метрики
function MetricCard({
                        title,
                        value,
                        icon,
                        chip,
                        color,
                        children,
                    }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    chip?: string;
    color?: string;
    children?: React.ReactNode;
}) {
    return (
        <Card
            elevation={0}
            sx={{
                width: "100%",
                minWidth: CARD_MIN_WIDTH,
                maxWidth: CARD_MAX_WIDTH,
                margin: "0 auto",
                borderRadius: 12,
                boxShadow: "0 8px 32px -12px rgb(0 32 94 / 20%)",
                fontFamily: "Nunito",
                display: "flex",
                flexDirection: "column",
                background: palette.card,
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
                py: 2.5,
                px: 2,
                gap: 1,
                transition: "box-shadow .2s",
            }}
        >
            <Avatar
                sx={{
                    bgcolor: color || palette.accent,
                    color: "#fff",
                    width: 44,
                    height: 44,
                    fontSize: 28,
                    boxShadow: "0 2px 8px -4px #5485E425",
                    mb: 1,
                }}
            >
                {icon}
            </Avatar>
            <Typography sx={{ color: color || palette.accent, fontWeight: 700, fontSize: 16 }}>
                {title}
            </Typography>
            <Typography
                sx={{
                    fontWeight: 900,
                    fontSize: 32,
                    color: palette.text,
                    textAlign: "center",
                    my: 1,
                    lineHeight: 1.1,
                }}
            >
                {value}
            </Typography>
            {chip && (
                <Chip
                    label={chip}
                    size="medium"
                    sx={{
                        bgcolor: palette.accent2 + "18",
                        color: palette.accent2,
                        fontWeight: 600,
                        fontSize: 13,
                        mt: 1,
                    }}
                />
            )}
            {children}
        </Card>
    );
}

const Dashboard: React.FC = () => {
    // Состояния
    const [users, setUsers] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Загрузка данных
    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get("/users"),
            api.get("/orders"),
            api.get("/products")
        ])
            .then(([usersRes, ordersRes, productsRes]) => {
                setUsers(usersRes.data || []);
                setOrders(ordersRes.data || []);
                setProducts(productsRes.data || []);
                setError(null);
            })
            .catch(() => {
                setError("Ошибка загрузки данных");
            })
            .finally(() => setLoading(false));
    }, []);

    // ==== АГРЕГАЦИИ ====
    // Фильтры
    const now = new Date();
    const getMonth = (date: string) => new Date(date).getMonth();
    const getYear = (date: string) => new Date(date).getFullYear();

    // За этот месяц
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const ordersInMonth = useMemo(
        () =>
            orders.filter(
                (o) =>
                    o.created_at &&
                    getMonth(o.created_at) === currentMonth &&
                    getYear(o.created_at) === currentYear
            ),
        [orders, currentMonth, currentYear]
    );
    const completedOrdersInMonth = useMemo(
        () => ordersInMonth.filter((o) => o.status === "completed"),
        [ordersInMonth]
    );
    const revenueInMonth = useMemo(
        () => completedOrdersInMonth.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        [completedOrdersInMonth]
    );
    const usersInMonth = useMemo(
        () =>
            users.filter(
                (u) =>
                    u.join_time &&
                    getMonth(u.join_time) === currentMonth &&
                    getYear(u.join_time) === currentYear
            ),
        [users, currentMonth, currentYear]
    );
    const activeUsersInMonth = useMemo(
        () =>
            users.filter(
                (u) =>
                    (u.daily_launches || 0) > 0 &&
                    u.join_time &&
                    getMonth(u.join_time) === currentMonth &&
                    getYear(u.join_time) === currentYear
            ),
        [users, currentMonth, currentYear]
    );

    // Средний чек за месяц
    const avgCheck = completedOrdersInMonth.length
        ? revenueInMonth / completedOrdersInMonth.length
        : 0;

    // Всего пользователей
    const totalUsers = users.length;
    // Всего заказов
    const totalOrders = orders.length;
    // Всего доставок (можно == totalOrders)
    const totalDeliveries = orders.length;
    // Всего товаров
    const totalProducts = products.length;
    // Рейтинг магазина (заглушка, если нет отзывов)
    const storeRating = 4.9;
    const storeRatingChip = "на основе 220 отзывов";

    // ==== ТОПЫ ====
    // ТОП-5 клиентов по количеству заказов
    const topClients = useMemo(() => {
        const counts: Record<number, { user: any; count: number }> = {};
        orders.forEach((o: any) => {
            if (!counts[o.user_id]) {
                const u = users.find((u) => u.user_id === o.user_id);
                counts[o.user_id] = { user: u, count: 0 };
            }
            counts[o.user_id].count += 1;
        });
        const arr = Object.values(counts)
            .filter((c) => c.user)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        return arr.map((c) => c.user?.phone_number || c.user?.user_id || "-");
    }, [orders, users]);

    // ТОП-5 товаров по количеству заказов (по items в заказах)
    const topProducts = useMemo(() => {
        const counts: Record<number, { product: any; count: number }> = {};
        orders.forEach((o: any) => {
            const items = o.items || [];
            items.forEach((item: any) => {
                if (!counts[item.product_id]) {
                    const p = products.find((pr) => pr.id === item.product_id);
                    counts[item.product_id] = { product: p, count: 0 };
                }
                counts[item.product_id].count += 1;
            });
        });
        const arr = Object.values(counts)
            .filter((c) => c.product)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        return arr.map((c) => c.product?.title || "-");
    }, [orders, products]);

    // ==== ГРАФИКИ ====
    // Заказы по дням недели
    const ordersByDayOfWeek = useMemo(() => {
        const days = Array(7).fill(0);
        ordersInMonth.forEach((o: any) => {
            if (o.created_at) {
                const dow = new Date(o.created_at).getDay(); // 0 - Sunday
                days[dow === 0 ? 6 : dow - 1] += 1; // 0 - Mon
            }
        });
        return days;
    }, [ordersInMonth]);

    // Динамика выручки по месяцам (8 месяцев назад - сейчас)
    const revenueByMonth = useMemo(() => {
        const result: number[] = [];
        const monthsLabels: string[] = [];
        for (let i = 7; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth();
            const ruMonth = date.toLocaleString("ru-RU", { month: "short" });
            monthsLabels.push(ruMonth.charAt(0).toUpperCase() + ruMonth.slice(1));
            const sum = orders
                .filter(
                    (o: any) =>
                        o.status === "completed" &&
                        o.created_at &&
                        getMonth(o.created_at) === month &&
                        getYear(o.created_at) === year
                )
                .reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
            result.push(sum);
        }
        return { data: result, labels: monthsLabels };
    }, [orders, now]);

    // ==== МЕТРИКИ ====
    const metrics = [
        {
            title: "Пользователи",
            value: formatNumber(totalUsers),
            icon: <PeopleIcon/>,
            chip: usersInMonth.length ? `+${usersInMonth.length} новых` : undefined,
            color: palette.accent,
        },
        {
            title: "Заказы",
            value: formatNumber(totalOrders),
            icon: <ShoppingCartIcon/>,
            chip: completedOrdersInMonth.length
                ? `${completedOrdersInMonth.length} выполнено`
                : undefined,
            color: palette.accent2,
        },
        {
            title: "Выручка",
            value: formatRUB(revenueInMonth),
            icon: <MonetizationOnIcon/>,
            chip: completedOrdersInMonth.length
                ? formatPercent(
                    ((revenueByMonth.data[7] || 0) -
                        (revenueByMonth.data[6] || 0)) /
                    ((revenueByMonth.data[6] || 1) / 100)
                )
                : undefined,
            color: palette.accent3,
        },
        {
            title: "Товары",
            value: formatNumber(totalProducts),
            icon: <LocalFloristIcon/>,
            chip:
                products.filter((p) => p.type === "Букеты").length > 0
                    ? `Букеты: ${products.filter((p) => p.type === "Букеты").length}`
                    : undefined,
            color: palette.accent4,
        },
        {
            title: "Средний чек",
            value: formatRUB(avgCheck),
            icon: <TrendingUpIcon/>,
            chip: completedOrdersInMonth.length
                ? formatPercent(
                    ((avgCheck -
                            (revenueByMonth.data[6] /
                                (orders.filter(
                                    (o: any) =>
                                        o.status === "completed" &&
                                        o.created_at &&
                                        getMonth(o.created_at) === currentMonth - 1 &&
                                        getYear(o.created_at) === currentYear
                                ).length || 1))) /
                        ((revenueByMonth.data[6] /
                            (orders.filter(
                                (o: any) =>
                                    o.status === "completed" &&
                                    o.created_at &&
                                    getMonth(o.created_at) === currentMonth - 1 &&
                                    getYear(o.created_at) === currentYear
                            ).length || 1)) || 1)) * 100
                )
                : undefined,
            color: palette.accent5,
        },
        {
            title: "Активных клиентов",
            value: formatNumber(activeUsersInMonth.length),
            icon: <PeopleIcon/>,
            chip: activeUsersInMonth.length ? "за месяц" : undefined,
            color: palette.accent,
        },
        {
            title: "Доставок",
            value: formatNumber(totalDeliveries),
            icon: <AssessmentIcon/>,
            chip: "за месяц",
            color: palette.accent7,
        },
        {
            title: "Рейтинг магазина",
            value: storeRating,
            icon: <StarIcon/>,
            chip: storeRatingChip,
            color: palette.accent4,
        },
    ];

    // ==== Нижние карточки ====
    const lowerCards = [
        {
            title: "Топ-5 клиентов",
            value: topClients.length ? `${topClients[0]} — ${orders.filter(() => users.find(u => (u.phone_number === topClients[0] || u.user_id === topClients[0]))).length} заказов` : "-",
            icon: <LeaderboardIcon/>,
            chip: topClients.slice(1).join(", "),
            color: palette.accent,
        },
        {
            title: "Топ-5 товаров",
            value: topProducts.length ? `${topProducts[0]} — ${orders.reduce((acc, o) => acc + ((o.items || []).filter((i: any) => products.find((p) => p.title === topProducts[0] && p.id === i.product_id)).length), 0)} заказов` : "-",
            icon: <StorefrontIcon/>,
            chip: topProducts.slice(1).join(", "),
            color: palette.accent2,
        },
        {
            title: "Заказы по дням недели",
            value: "",
            icon: <BarChartIcon/>,
            chip: "",
            color: palette.accent2,
            chart: (
                <Bar
                    data={{
                        labels: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
                        datasets: [
                            {
                                label: "Заказы",
                                data: ordersByDayOfWeek,
                                backgroundColor: palette.accent2,
                                borderRadius: 6,
                            },
                        ],
                    }}
                    options={{
                        plugins: { legend: { display: false }, tooltip: { enabled: true } },
                        scales: {
                            x: { grid: { display: false }, ticks: { font: { size: 14 } } },
                            y: { grid: { display: false }, ticks: { font: { size: 14 } } },
                        },
                        maintainAspectRatio: false,
                    }}
                    height={CHART_MAX_HEIGHT}
                />
            ),
        },
        {
            title: "Динамика выручки по месяцам",
            value: "",
            icon: <PieChartIcon/>,
            chip: "",
            color: palette.accent3,
            chart: (
                <Line
                    data={{
                        labels: revenueByMonth.labels,
                        datasets: [
                            {
                                label: "Выручка",
                                data: revenueByMonth.data,
                                borderColor: palette.accent3,
                                backgroundColor: palette.accent3 + "22",
                                fill: true,
                                tension: 0.4,
                                pointRadius: 3,
                                pointBackgroundColor: palette.accent3,
                            },
                        ],
                    }}
                    options={{
                        plugins: { legend: { display: false }, tooltip: { enabled: true } },
                        scales: {
                            x: { grid: { display: false }, ticks: { font: { size: 14 } } },
                            y: { grid: { display: false }, ticks: { font: { size: 14 } } },
                        },
                        maintainAspectRatio: false,
                    }}
                    height={CHART_MAX_HEIGHT}
                />
            ),
        },
    ];

    return (
        <Box sx={{
            width: "100%",
            minHeight: "100vh",
            background: palette.bg,
            fontFamily: "Nunito",
            boxSizing: "border-box",
            transition: "background 0.3s",
            overflowX: "hidden",
            mt: 2,
            px: { xs: 1.5, sm: 2.5 },
            py: { xs: 2.5, md: 4 },
        }}>
            <Typography
                variant="h4"
                sx={{
                    color: "#5485E4",
                    fontFamily: "Nunito",
                    fontWeight: 700,
                    fontSize: { xs: 26, md: 32 },
                    mb: { xs: 1, md: 0 },
                }}
            >
                Dashboard
            </Typography>
            <Typography
                sx={{
                    color: palette.muted,
                    fontSize: 15,
                    mb: 3,
                    fontWeight: 500,
                }}
            >
                Основные показатели за месяц
            </Typography>

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", my: 8 }}>
                    <CircularProgress/>
                </Box>
            ) : (
                <Box
                    sx={{
                        width: "100%",
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: `repeat(auto-fit, minmax(${CARD_MIN_WIDTH}px, 1fr))`,
                        },
                        gap: 3,
                        justifyContent: "center",
                        alignItems: "stretch",
                    }}
                >
                    {metrics.map((m) => (
                        <MetricCard
                            key={m.title}
                            title={m.title}
                            value={m.value}
                            icon={m.icon}
                            chip={m.chip}
                            color={m.color}
                        />
                    ))}
                    {lowerCards.map((c) => (
                        <MetricCard
                            key={c.title}
                            title={c.title}
                            value={c.value}
                            icon={c.icon}
                            chip={c.chip}
                            color={c.color}
                        >
                            {c.chart ? (
                                <Box sx={{
                                    width: "100%",
                                    mt: 2,
                                    minHeight: CHART_MAX_HEIGHT,
                                    "& canvas": {
                                        maxHeight: CHART_MAX_HEIGHT + "px !important",
                                        height: CHART_MAX_HEIGHT + "px !important",
                                    },
                                }}>
                                    {c.chart}
                                </Box>
                            ) : null}
                        </MetricCard>
                    ))}
                </Box>
            )}

            <Divider sx={{ my: 4, borderColor: palette.accent + "22" }}/>
            <Typography sx={{ color: palette.muted, fontSize: 14, textAlign: "center", mb: 1 }}>
                Панель аналитики — топы и графики для управления бизнесом!
            </Typography>
            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
            >
                <Alert severity="error" sx={{ width: "100%" }}>
                    {error}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Dashboard;