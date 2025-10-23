import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Modal,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import { api } from "./api";

const statusOptions = [
    { value: "created", label: "Оформляем", color: "#5485E4" },
    { value: "assembling", label: "Собираем", color: "#FFA500" },
    { value: "delivered", label: "Доставлено", color: "#35bf4f" },
];

const deliveryStatusOptions = [
    { value: "scheduled", label: "Запланирована", color: "#5485E4" },
    { value: "delivered", label: "Доставлено", color: "#35bf4f" },
    { value: "canceled", label: "Отменена", color: "#D03A3A" },
];

function formatDate(iso?: string) {
    if (!iso) return "-";
    const date = new Date(iso);
    return date.toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateInput(iso?: string) {
    if (!iso) return "";
    const date = new Date(iso);
    return date.toISOString().substring(0, 10);
}

interface Delivery {
    id: number;
    delivery_date: string;
    status: string;
}

interface DeliveriesModalProps {
    order: any; // Adjust type if possible
    open: boolean;
    onClose: () => void;
}

function DeliveriesModal({ order, open, onClose }: DeliveriesModalProps) {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && order) {
            setLoading(true);
            api.get(`/orders/${order.id}/deliveries`)
                .then(res => setDeliveries(res.data))
                .catch(() => setError("Ошибка загрузки доставок"))
                .finally(() => setLoading(false));
        }
    }, [open, order]);

    const handleStatusChange = (deliveryId: number, status: string) => {
        api.patch(`/deliveries/${deliveryId}/status`, { status })
            .then(res => {
                setDeliveries(prev =>
                    prev.map(d => d.id === deliveryId ? { ...d, status: res.data.status } : d)
                );
            });
    };
    const handleDateChange = (deliveryId: number, date: string) => {
        api.patch(`/deliveries/${deliveryId}/date`, { delivery_date: date })
            .then(res => {
                setDeliveries(prev =>
                    prev.map(d => d.id === deliveryId ? { ...d, delivery_date: res.data.delivery_date } : d)
                );
            });
    };

    const sortedDeliveries = useMemo(() => {
        return [...deliveries].sort((a, b) => a.id - b.id);
    }, [deliveries]);

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={{
                bgcolor: "background.paper",
                p: 3,
                borderRadius: 4,
                maxWidth: 600,
                mx: "auto",
                my: "10vh",
                outline: "none",
                boxShadow: "0 8px 32px 0 #5485E450"
            }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    Доставки по подписке заказа #{order?.id}
                </Typography>
                {loading ? (
                    <Box sx={{ textAlign: "center", my: 5 }}><CircularProgress/></Box>
                ) : (
                    sortedDeliveries.length > 0 ? (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>№</TableCell>
                                    <TableCell>Дата</TableCell>
                                    <TableCell>Статус</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedDeliveries.map((d, idx) => (
                                    <TableRow key={d.id}>
                                        <TableCell>{idx + 1}</TableCell>
                                        <TableCell>
                                            <TextField
                                                type="date"
                                                value={formatDateInput(d.delivery_date)}
                                                onChange={e => handleDateChange(d.id, e.target.value)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={d.status}
                                                onChange={e => handleStatusChange(d.id, e.target.value as string)}
                                                size="small"
                                                sx={{
                                                    minWidth: 120,
                                                    bgcolor: "#F5F6FB",
                                                    color: deliveryStatusOptions.find(opt => opt.value === d.status)?.color || "#5485E4",
                                                    fontWeight: 600,
                                                    fontSize: 15,
                                                    borderRadius: 2,
                                                    boxShadow: "0 2px 8px -4px #5485E420",
                                                    "& .MuiOutlinedInput-notchedOutline": { border: 0 },
                                                    "&:hover": { bgcolor: "#E8F0FB" },
                                                }}
                                            >
                                                {deliveryStatusOptions.map(opt => (
                                                    <MenuItem key={opt.value} value={opt.value}
                                                              sx={{ color: opt.color }}>
                                                        {opt.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Typography color="text.secondary" sx={{ mt: 3 }}>
                            Нет доставок для данного заказа.
                        </Typography>
                    )
                )}
                {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
                <Button onClick={onClose} sx={{ mt: 3, fontWeight: 700 }}>Закрыть</Button>
            </Box>
        </Modal>
    );
}

export default function AdminOrders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string>("");
    const [filterStart, setFilterStart] = useState<string>("");
    const [filterEnd, setFilterEnd] = useState<string>("");

    const [openDeliveriesOrder, setOpenDeliveriesOrder] = useState<any | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await api.get("/orders");
            setOrders(Array.isArray(res.data) ? res.data : []);
            setError(null);
        } catch {
            setError("Ошибка загрузки заказов");
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (orderId: number, newStatus: string) => {
        try {
            const res = await api.patch(`/orders/${orderId}/status`, { status: newStatus });
            setOrders(prev =>
                prev.map(order =>
                    order.id === orderId ? { ...order, status: res.data.status } : order
                )
            );
        } catch {
            setError("Ошибка смены статуса");
        }
    };

    const filteredOrders = useMemo(() => {
        return orders
            .filter(order => {
                if (filterType && order.order_type !== filterType) return false;
                const created = new Date(order.created_at);
                if (filterStart && created < new Date(filterStart)) return false;
                return !(filterEnd && created > new Date(filterEnd));
            })
            .sort((a, b) => b.id - a.id);
    }, [orders, filterType, filterStart, filterEnd]);

    const dateTimeFormat = new Intl.DateTimeFormat('ru', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <Box sx={{ width: "100%", px: { xs: 1, sm: 2, md: 0 }, pb: 4 }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 3,
                    mt: 1,
                    flexWrap: "wrap",
                    gap: 2,
                }}
            >
                <Typography
                    variant="h4"
                    sx={{
                        color: "#5485E4",
                        fontFamily: "Nunito",
                        fontWeight: 700,
                        fontSize: { xs: 26, md: 32 },
                    }}
                >
                    Заказы
                </Typography>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel id="filter-type-label">
                            <FilterAltIcon fontSize="small" sx={{ mr: 1, color: "#5485E4" }}/>
                            Тип заказа
                        </InputLabel>
                        <Select
                            labelId="filter-type-label"
                            value={filterType}
                            label="Тип заказа"
                            onChange={e => setFilterType(e.target.value)}
                            sx={{ bgcolor: "#F5F6FB", borderRadius: 2, fontWeight: 600 }}
                        >
                            <MenuItem value="">Все</MenuItem>
                            <MenuItem value="subscription" sx={{ color: "#148400ff" }}>
                                Подписка
                            </MenuItem>
                            <MenuItem value="one-time" sx={{ color: "#d46300ff" }}>
                                Разовый
                            </MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        type="date"
                        label="С даты"
                        size="small"
                        value={filterStart}
                        onChange={e => setFilterStart(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 140, bgcolor: "#F5F6FB", borderRadius: 2 }}
                    />
                    <TextField
                        type="date"
                        label="По дату"
                        size="small"
                        value={filterEnd}
                        onChange={e => setFilterEnd(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 140, bgcolor: "#F5F6FB", borderRadius: 2 }}
                    />
                    <Tooltip title="Сбросить фильтры">
                        <IconButton
                            onClick={() => {
                                setFilterType("");
                                setFilterStart("");
                                setFilterEnd("");
                            }}
                            sx={{
                                background: "#F5F6FB",
                                color: "#5485E4",
                                borderRadius: "50%",
                                boxShadow: "0 2px 8px -4px #5485E440",
                                ":hover": { background: "#5485E4", color: "#fff" },
                                fontSize: 22,
                            }}
                        >
                            <FilterAltIcon/>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Обновить список заказов">
                        <IconButton
                            onClick={fetchOrders}
                            sx={{
                                background: "#E8F0FB",
                                color: "#5485E4",
                                width: 46,
                                height: 46,
                                borderRadius: "50%",
                                boxShadow: "0 4px 16px -6px #5485E440",
                                ":hover": {
                                    background: "#5485E4",
                                    color: "#fff",
                                },
                                fontSize: 28,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <RefreshIcon sx={{ fontSize: 28 }}/>
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", my: 8 }}>
                    <CircularProgress/>
                </Box>
            ) : filteredOrders.length === 0 ? (
                <Box sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "60vh",
                }}>
                    <Typography sx={{
                        color: "#848391",
                        fontFamily: "Nunito",
                        fontSize: 20,
                        mb: 2,
                        textAlign: "center",
                    }}>
                        Нет заказов
                    </Typography>
                </Box>
            ) : (
                <TableContainer component={Paper} sx={{
                    mt: 3,
                    boxShadow: "0 4px 24px -12px #5485E440",
                    borderRadius: 6,
                    maxWidth: "100%",
                    width: "100%",
                    overflowX: "auto",
                }}>
                    <Table sx={{ minWidth: 1250, fontFamily: "Nunito", fontSize: 15 }}>
                        <TableHead>
                            <TableRow sx={{ background: "#E8F0FB" }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 17 }}>ID</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 17 }}>Телефон</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 17 }}>Состав заказа</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 17 }}>Сумма</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 17 }}>Тип</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 17 }}>Дата создания</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 17 }}>Данные получателя</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 17 }}>Действие</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredOrders.map(order => {
                                const isSubscription = order.order_type === "subscription";
                                const statusObj = statusOptions.find(opt => opt.value === order.status);
                                return (
                                    <TableRow
                                        key={order.id}
                                        sx={{
                                            background:
                                                order.status === "delivered"
                                                    ? "#eafaf0"
                                                    : (statusObj ? statusObj.color + "12" : "#fff"),
                                            fontSize: 16,
                                        }}
                                    >
                                        <TableCell sx={{ fontWeight: 700, fontSize: 16 }}>{order.id}</TableCell>
                                        <TableCell sx={{ fontSize: 16 }}>{order.phone_number || "-"}</TableCell>
                                        <TableCell sx={{ fontSize: 15 }}>
                                            {Array.isArray(order.items) ? (
                                                <ul style={{ margin: 0, paddingLeft: 14 }}>
                                                    {order.items.map((item: any, idx: number) => (
                                                        <li key={idx}>
                                                            <span style={{ fontWeight: 600 }}>{item.title}</span>
                                                            {item.product_id !== 0 ? (
                                                                <span>
                                                                { isSubscription
                                                                    ? ` — ${item.deliveries_per_month ?? item.deliveriesPerMonth ?? "-"}×${item.subscription_months ?? item.subscriptionMonths ?? "-"}, `
                                                                    : ` — ${item.deliveryDate ? dateTimeFormat.format(new Date(item.deliveryDate)) : 'нет даты'}, `
                                                                }
                                                                </span>
                                                            ) : ' '}
                                                            <span style={{
                                                                color: "#159C5B",
                                                                fontWeight: 500
                                                            }}>{item.price} руб.</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : "—"}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: 20 }}>
                                            <span style={{ color: "#159C5B" }}>{order.total_amount} руб.</span>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 16 }}>
                                            {isSubscription ? (
                                                <span style={{
                                                    display: "inline-block",
                                                    marginLeft: 0,
                                                    padding: "2px 8px",
                                                    borderRadius: 8,
                                                    background: "#148400ff",
                                                    color: "#ffffffff",
                                                    fontWeight: 600,
                                                    fontSize: 18,
                                                }}>
                          Подписка
                        </span>
                                            ) : (
                                                <span style={{
                                                    display: "inline-block",
                                                    marginLeft: 0,
                                                    padding: "2px 8px",
                                                    borderRadius: 8,
                                                    background: "#d46300ff",
                                                    color: "#ffffffff",
                                                    fontWeight: 600,
                                                    fontSize: 18,
                                                }}>
                          Разовый
                        </span>
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 15 }}>{formatDate(order.created_at)}</TableCell>
                                        <TableCell sx={{ fontSize: 15 }}>
                                            <div><b>ФИО:</b> {order.fio || "-"}</div>
                                            <div><b>Телефон:</b> {order.phone || "-"}</div>
                                            {order.email && <div><b>Email:</b> {order.email}</div>}
                                            {order.comment && <div><b>Комментарий:</b> {order.comment}</div>}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 15 }}>
                                            {isSubscription ? (
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={() => setOpenDeliveriesOrder(order)}
                                                    sx={{
                                                        borderRadius: 2,
                                                        borderColor: "#5485E4",
                                                        color: "#5485E4",
                                                        fontWeight: 700,
                                                        px: 2,
                                                        py: 0.5,
                                                        "&:hover": { background: "#e4eaff", borderColor: "#5485E4" },
                                                    }}
                                                >
                                                    Доставки
                                                </Button>
                                            ) : (
                                                <>
                                                    <div>{order.deliveryDate}</div>
                                                    <Select
                                                        value={order.status}
                                                        onChange={e => handleStatusChange(order.id, e.target.value)}
                                                        size="small"
                                                        sx={{
                                                            minWidth: 120,
                                                            bgcolor: "#F5F6FB",
                                                            color: statusObj ? statusObj.color : "#5485E4",
                                                            fontWeight: 600,
                                                            fontSize: 15,
                                                            borderRadius: 2,
                                                            boxShadow: "0 2px 8px -4px #5485E420",
                                                            "& .MuiOutlinedInput-notchedOutline": { border: 0 },
                                                            "&:hover": { bgcolor: "#E8F0FB" },
                                                        }}
                                                    >
                                                        {statusOptions.map(opt => (
                                                            <MenuItem key={opt.value} value={opt.value}
                                                                      sx={{ color: opt.color }}>
                                                                {opt.label}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            {error && (
                <Typography sx={{ color: "#D03A3A", mt: 2, textAlign: "center" }}>
                    {error}
                </Typography>
            )}
            {openDeliveriesOrder && (
                <DeliveriesModal
                    order={openDeliveriesOrder}
                    open={!!openDeliveriesOrder}
                    onClose={() => setOpenDeliveriesOrder(null)}
                />
            )}
        </Box>
    );
}